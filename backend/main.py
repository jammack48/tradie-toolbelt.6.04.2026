import asyncio
import html
import json
import os
from difflib import SequenceMatcher
import re
from typing import Annotated, Any

import httpx
import jwt
import resend
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(title="Tradie Toolbelt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client (lazy init)
_supabase = None
_init_error: str | None = None


class CandidateCustomer(BaseModel):
    id: int
    name: str
    address: str = ""
    phone: str | None = None
    email: str | None = None


class CandidateMaterial(BaseModel):
    id: str
    name: str
    unit: str = "ea"
    unit_price: float = 0


class QuickQuoteExtractRequest(BaseModel):
    transcript: str = Field(min_length=1)
    photo_data_urls: list[str] = Field(default_factory=list)
    candidate_customers: list[CandidateCustomer] = Field(default_factory=list)
    candidate_materials: list[CandidateMaterial] = Field(default_factory=list)


class QuickQuoteIdentityRequest(BaseModel):
    transcript: str = Field(min_length=1)


class QuickQuoteEnrichRequest(BaseModel):
    transcript: str = Field(min_length=1)
    scope_summary: str = ""
    photo_data_urls: list[str] = Field(default_factory=list)
    candidate_materials: list[CandidateMaterial] = Field(default_factory=list)


class ResolveCustomerRequest(BaseModel):
    customer_name: str = ""
    customer_phone: str = ""
    customer_email: str = ""
    site_address: str = ""
    candidate_customers: list[CandidateCustomer] = Field(default_factory=list)


class SendQuoteRequest(BaseModel):
    send_email: bool = False
    send_sms: bool = False
    to_email: str | None = None
    to_phone: str | None = None
    email_subject: str = ""
    email_text: str = ""
    sms_text: str = ""
    quote_reference: str | None = None


def _best_customer(name: str, candidates: list[CandidateCustomer]) -> tuple[int | None, float]:
    q = (name or "").strip().lower()
    if not q:
        return None, 0.0
    best_id: int | None = None
    best_score = 0.0
    for c in candidates:
        score = SequenceMatcher(None, q, c.name.lower()).ratio()
        if score > best_score:
            best_score = score
            best_id = c.id
    if best_score < 0.55:
        return None, best_score
    return best_id, best_score


def _best_material(name: str, candidates: list[CandidateMaterial]) -> tuple[CandidateMaterial | None, float]:
    q = (name or "").strip().lower()
    if not q:
        return None, 0.0
    best: CandidateMaterial | None = None
    best_score = 0.0
    for m in candidates:
        score = SequenceMatcher(None, q, m.name.lower()).ratio()
        if q in m.name.lower():
            score += 0.12
        if score > best_score:
            best_score = score
            best = m
    if best_score < 0.5:
        return None, best_score
    return best, min(best_score, 1.0)


def _normalize_phone(value: str) -> str:
    return re.sub(r"\D+", "", value or "")


def _international_sms_dest(raw: str) -> str | None:
    """MSISDN without + (e.g. 64211234567) for SMS Everyone Destinations."""
    d = _normalize_phone(raw)
    if len(d) < 8:
        return None
    if d.startswith("64"):
        return d
    if d.startswith("0"):
        return "64" + d[1:]
    if len(d) == 9 and d[0] == "2":
        return "64" + d
    if len(d) == 8 and d[0] == "2":
        return "64" + d
    return d


def _messaging_env_flags() -> dict[str, bool]:
    return {
        "jwt_secret_configured": bool(os.environ.get("SUPABASE_JWT_SECRET", "").strip()),
        "resend_configured": bool(
            os.environ.get("RESEND_API_KEY", "").strip() and os.environ.get("RESEND_FROM", "").strip()
        ),
        "sms_everyone_configured": bool(
            os.environ.get("SMS_EVERYONE_USERNAME", "").strip()
            and os.environ.get("SMS_EVERYONE_PASSWORD", "").strip()
            and os.environ.get("SMS_EVERYONE_ORIGINATOR", "").strip()
        ),
    }


def _decode_supabase_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    secret = os.environ.get("SUPABASE_JWT_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="SUPABASE_JWT_SECRET is not configured on the server.")
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            leeway=60,
        )
    except jwt.InvalidAudienceError:
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                leeway=60,
                options={"verify_aud": False},
            )
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token") from None
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired") from None
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token") from None
    sub = payload.get("sub")
    if not sub or not isinstance(sub, str):
        raise HTTPException(status_code=401, detail="Invalid token subject")
    return sub


def require_supabase_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> str:
    return _decode_supabase_user_id(authorization)


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _address_overlap_score(query: str, candidate: str) -> float:
    q_words = {w for w in re.split(r"\W+", _normalize_text(query)) if len(w) >= 3}
    c_words = {w for w in re.split(r"\W+", _normalize_text(candidate)) if len(w) >= 3}
    if not q_words or not c_words:
        return 0.0
    return len(q_words.intersection(c_words)) / len(q_words)


def _score_customer_candidate(
    *,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    site_address: str,
    candidate: CandidateCustomer,
) -> tuple[float, list[str]]:
    reasons: list[str] = []
    score = 0.0

    q_name = _normalize_text(customer_name)
    c_name = _normalize_text(candidate.name)
    if q_name and c_name:
        name_score = SequenceMatcher(None, q_name, c_name).ratio()
        score += name_score * 0.5
        if name_score >= 0.86:
            reasons.append("Strong name match")
        elif name_score >= 0.7:
            reasons.append("Possible name match")

    q_phone = _normalize_phone(customer_phone)
    c_phone = _normalize_phone(candidate.phone or "")
    if q_phone and c_phone:
        if q_phone == c_phone:
            score += 0.32
            reasons.append("Phone matches")
        elif len(q_phone) >= 8 and (q_phone in c_phone or c_phone in q_phone):
            score += 0.2
            reasons.append("Phone partially matches")

    q_email = _normalize_text(customer_email)
    c_email = _normalize_text(candidate.email or "")
    if q_email and c_email:
        if q_email == c_email:
            score += 0.32
            reasons.append("Email matches")
        else:
            q_local = q_email.split("@")[0] if "@" in q_email else ""
            c_local = c_email.split("@")[0] if "@" in c_email else ""
            if q_local and c_local and q_local == c_local:
                score += 0.18
                reasons.append("Email local-part matches")

    q_addr = _normalize_text(site_address)
    c_addr = _normalize_text(candidate.address or "")
    if q_addr and c_addr:
        overlap = _address_overlap_score(q_addr, c_addr)
        if overlap > 0:
            score += min(0.26, overlap * 0.26)
            if overlap >= 0.6:
                reasons.append("Address overlap is strong")
            elif overlap >= 0.3:
                reasons.append("Address overlap")

    return min(score, 1.0), reasons


def _rank_customer_candidates(
    *,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    site_address: str,
    candidates: list[CandidateCustomer],
) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for c in candidates:
        score, reasons = _score_customer_candidate(
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            site_address=site_address,
            candidate=c,
        )
        ranked.append(
            {
                "id": c.id,
                "name": c.name,
                "address": c.address or "",
                "phone": c.phone or "",
                "email": c.email or "",
                "score": round(score, 4),
                "reasons": reasons,
            }
        )
    ranked.sort(key=lambda item: item["score"], reverse=True)
    return ranked


def _load_json(content: str) -> dict[str, Any]:
    try:
        return json.loads(content)
    except Exception:
        start = content.find("{")
        end = content.rfind("}")
        if start >= 0 and end > start:
            return json.loads(content[start : end + 1])
        raise


def _detect_key_type(key: str) -> str:
    if key.startswith("eyJ"):
        return "legacy_jwt"
    if key.startswith("sb_secret_") or key.startswith("sbp_"):
        return "new_secret"
    return "unknown"


def _mask_key(key: str) -> str:
    if len(key) <= 10:
        return "***"
    return f"{key[:3]}...{key[-4:]}"


def _ai_health_status() -> tuple[str, str | None]:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        return "not_configured", None
    try:
        from openai import OpenAI

        # Client init validates local SDK wiring (quick and no API request).
        OpenAI(api_key=api_key)
        return "online", None
    except Exception as e:
        return "offline", f"{type(e).__name__}: {str(e)[:200]}"


def get_supabase():
    global _supabase, _init_error
    if _supabase is not None:
        return _supabase

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()

    if not url or not key:
        _init_error = "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"
        return None

    try:
        from supabase import create_client
        _supabase = create_client(url, key)
        _init_error = None
    except Exception as e:
        _init_error = f"{type(e).__name__}: {e}"
    return _supabase


@app.get("/")
async def root():
    return {"api": "online"}


@app.get("/health")
async def health_check():
    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    ai_status, ai_error = _ai_health_status()

    debug = {
        "url_set": bool(url),
        "key_set": bool(key),
        "key_type": _detect_key_type(key) if key else "missing",
        "key_preview": _mask_key(key) if key else "n/a",
        "ai_key_set": bool(os.environ.get("OPENAI_API_KEY", "").strip()),
        "ai_error": ai_error,
        "init_error": None,
        "query_error": None,
    }
    debug.update(_messaging_env_flags())

    if not url or not key:
        debug["init_error"] = "Missing env var(s)"
        return {"status": "ok", "db": "not_configured", "ai": ai_status, "debug": debug}

    sb = get_supabase()
    if sb is None:
        debug["init_error"] = _init_error
        return {"status": "ok", "db": "invalid_key", "ai": ai_status, "debug": debug}

    try:
        sb.table("prod_user_settings").select("user_id").limit(1).execute()
        return {"status": "ok", "db": "connected", "ai": ai_status, "debug": debug}
    except Exception as e:
        err = str(e)
        if "does not exist" in err or "42P01" in err:
            debug["query_error"] = "Table prod_user_settings not found (run migrations on this Supabase project)"
            return {"status": "ok", "db": "schema_mismatch", "ai": ai_status, "debug": debug}
        debug["query_error"] = f"{type(e).__name__}: {err[:200]}"
        return {"status": "ok", "db": "query_failed", "ai": ai_status, "debug": debug}


@app.post("/ai/quick-quote-extract")
async def quick_quote_extract(payload: QuickQuoteExtractRequest):
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured on backend.")

    try:
        from openai import OpenAI

        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)

        system = (
            "You extract tradie quote details into strict JSON. "
            "Do not invent customer names or addresses. "
            "Use best-effort estimates for labour/materials with confidence 0..1. "
            "Return ONLY JSON."
        )

        user_text = {
            "transcript": payload.transcript,
            "customer_candidates": [c.model_dump() for c in payload.candidate_customers][:200],
            "material_candidates": [m.model_dump() for m in payload.candidate_materials][:500],
            "output_schema": {
                "customer_name": "string",
                "customer_phone": "string",
                "customer_email": "string",
                "site_address": "string",
                "scope_summary": "string",
                "materials_suggested": [
                    {"name": "string", "qty": "number", "unit": "string", "unit_price": "number|null", "confidence": "0..1"}
                ],
                "labour_suggested": [
                    {"role": "string", "hours": "number", "rate": "number|null", "confidence": "0..1"}
                ],
                "assumptions": ["string"],
                "missing_fields": ["string"],
                "review_flags": ["string"],
            },
        }

        content: list[dict[str, Any]] = [{"type": "text", "text": json.dumps(user_text)}]
        for data_url in payload.photo_data_urls[:4]:
            if data_url.startswith("data:image/"):
                content.append({"type": "image_url", "image_url": {"url": data_url}})

        resp = client.chat.completions.create(
            model=model,
            temperature=0.15,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": content},
            ],
        )
        raw = resp.choices[0].message.content or "{}"
        parsed = _load_json(raw)

        customer_name = str(parsed.get("customer_name") or "").strip()
        customer_phone = str(parsed.get("customer_phone") or "").strip()
        customer_email = str(parsed.get("customer_email") or "").strip()
        customer_id, customer_conf = _best_customer(customer_name, payload.candidate_customers)

        materials_out: list[dict[str, Any]] = []
        for m in parsed.get("materials_suggested") or []:
            name = str((m or {}).get("name") or "").strip()
            qty = float((m or {}).get("qty") or 0) if str((m or {}).get("qty") or "").strip() else 0.0
            unit = str((m or {}).get("unit") or "ea").strip() or "ea"
            conf = float((m or {}).get("confidence") or 0.6)
            matched, _ms = _best_material(name, payload.candidate_materials)
            unit_price = (m or {}).get("unit_price")
            if matched and (unit_price is None or unit_price == ""):
                unit_price = matched.unit_price
            materials_out.append(
                {
                    "itemId": matched.id if matched else None,
                    "name": matched.name if matched else name,
                    "qty": max(1.0, qty if qty > 0 else 1.0),
                    "unit": matched.unit if matched else unit,
                    "unitPrice": float(unit_price) if unit_price is not None else None,
                    "confidence": min(max(conf, 0.0), 1.0),
                    "source": "ai+catalog" if matched else "ai",
                }
            )

        labour_out: list[dict[str, Any]] = []
        for l in parsed.get("labour_suggested") or []:
            role = str((l or {}).get("role") or "Labour").strip() or "Labour"
            hours = float((l or {}).get("hours") or 0.0)
            rate = (l or {}).get("rate")
            conf = float((l or {}).get("confidence") or 0.6)
            labour_out.append(
                {
                    "role": role,
                    "hours": max(0.5, hours if hours > 0 else 0.5),
                    "rate": float(rate) if rate is not None else None,
                    "confidence": min(max(conf, 0.0), 1.0),
                }
            )

        return {
            "customerId": customer_id,
            "customerName": customer_name or None,
            "customerPhone": customer_phone or None,
            "customerEmail": customer_email or None,
            "customerConfidence": customer_conf if customer_name else 0.0,
            "isNewCustomer": customer_id is None,
            "siteAddress": str(parsed.get("site_address") or "").strip(),
            "siteAddressConfidence": 0.75 if parsed.get("site_address") else 0.0,
            "scopeSummary": str(parsed.get("scope_summary") or "").strip() or payload.transcript[:500],
            "materialsSuggested": materials_out,
            "labourSuggested": labour_out,
            "assumptions": [str(x) for x in (parsed.get("assumptions") or []) if str(x).strip()],
            "missingFields": [str(x) for x in (parsed.get("missing_fields") or []) if str(x).strip()],
            "reviewFlags": [str(x) for x in (parsed.get("review_flags") or []) if str(x).strip()],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction error: {type(e).__name__}: {str(e)[:180]}")


@app.post("/ai/quick-quote-identity")
async def quick_quote_identity(payload: QuickQuoteIdentityRequest):
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured on backend.")

    try:
        from openai import OpenAI

        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)

        system = (
            "You extract only customer identity + job site details from a tradie transcript. "
            "Do not infer details that are not present. "
            "Return ONLY strict JSON."
        )

        user_text = {
            "transcript": payload.transcript,
            "output_schema": {
                "customer_name": "string",
                "customer_phone": "string",
                "customer_email": "string",
                "site_address": "string",
                "scope_summary": "string",
                "missing_fields": ["string"],
                "review_flags": ["string"],
            },
        }

        resp = client.chat.completions.create(
            model=model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": json.dumps(user_text)},
            ],
        )
        raw = resp.choices[0].message.content or "{}"
        parsed = _load_json(raw)

        return {
            "customerName": str(parsed.get("customer_name") or "").strip() or None,
            "customerPhone": str(parsed.get("customer_phone") or "").strip() or None,
            "customerEmail": str(parsed.get("customer_email") or "").strip() or None,
            "siteAddress": str(parsed.get("site_address") or "").strip(),
            "siteAddressConfidence": 0.75 if parsed.get("site_address") else 0.0,
            "scopeSummary": str(parsed.get("scope_summary") or "").strip() or payload.transcript[:500],
            "missingFields": [str(x) for x in (parsed.get("missing_fields") or []) if str(x).strip()],
            "reviewFlags": [str(x) for x in (parsed.get("review_flags") or []) if str(x).strip()],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI identity extraction error: {type(e).__name__}: {str(e)[:180]}")


@app.post("/ai/quick-quote-enrich")
async def quick_quote_enrich(payload: QuickQuoteEnrichRequest):
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured on backend.")

    try:
        from openai import OpenAI

        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        client = OpenAI(api_key=api_key)

        system = (
            "You enrich a tradie quote draft with labour and materials. "
            "Focus on practical, conservative defaults. "
            "Return ONLY strict JSON."
        )

        user_text = {
            "transcript": payload.transcript,
            "scope_summary": payload.scope_summary or "",
            "material_candidates": [m.model_dump() for m in payload.candidate_materials][:500],
            "output_schema": {
                "materials_suggested": [
                    {"name": "string", "qty": "number", "unit": "string", "unit_price": "number|null", "confidence": "0..1"}
                ],
                "labour_suggested": [
                    {"role": "string", "hours": "number", "rate": "number|null", "confidence": "0..1"}
                ],
                "assumptions": ["string"],
                "missing_fields": ["string"],
                "review_flags": ["string"],
            },
        }

        content: list[dict[str, Any]] = [{"type": "text", "text": json.dumps(user_text)}]
        for data_url in payload.photo_data_urls[:4]:
            if data_url.startswith("data:image/"):
                content.append({"type": "image_url", "image_url": {"url": data_url}})

        resp = client.chat.completions.create(
            model=model,
            temperature=0.15,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": content},
            ],
        )
        raw = resp.choices[0].message.content or "{}"
        parsed = _load_json(raw)

        materials_out: list[dict[str, Any]] = []
        for m in parsed.get("materials_suggested") or []:
            name = str((m or {}).get("name") or "").strip()
            qty = float((m or {}).get("qty") or 0) if str((m or {}).get("qty") or "").strip() else 0.0
            unit = str((m or {}).get("unit") or "ea").strip() or "ea"
            conf = float((m or {}).get("confidence") or 0.6)
            matched, _ms = _best_material(name, payload.candidate_materials)
            unit_price = (m or {}).get("unit_price")
            if matched and (unit_price is None or unit_price == ""):
                unit_price = matched.unit_price
            materials_out.append(
                {
                    "itemId": matched.id if matched else None,
                    "name": matched.name if matched else name,
                    "qty": max(1.0, qty if qty > 0 else 1.0),
                    "unit": matched.unit if matched else unit,
                    "unitPrice": float(unit_price) if unit_price is not None else None,
                    "confidence": min(max(conf, 0.0), 1.0),
                    "source": "ai+catalog" if matched else "ai",
                }
            )

        labour_out: list[dict[str, Any]] = []
        for l in parsed.get("labour_suggested") or []:
            role = str((l or {}).get("role") or "Labour").strip() or "Labour"
            hours = float((l or {}).get("hours") or 0.0)
            rate = (l or {}).get("rate")
            conf = float((l or {}).get("confidence") or 0.6)
            labour_out.append(
                {
                    "role": role,
                    "hours": max(0.5, hours if hours > 0 else 0.5),
                    "rate": float(rate) if rate is not None else None,
                    "confidence": min(max(conf, 0.0), 1.0),
                }
            )

        return {
            "materialsSuggested": materials_out,
            "labourSuggested": labour_out,
            "assumptions": [str(x) for x in (parsed.get("assumptions") or []) if str(x).strip()],
            "missingFields": [str(x) for x in (parsed.get("missing_fields") or []) if str(x).strip()],
            "reviewFlags": [str(x) for x in (parsed.get("review_flags") or []) if str(x).strip()],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI enrichment error: {type(e).__name__}: {str(e)[:180]}")


@app.post("/ai/resolve-customer")
async def resolve_customer(payload: ResolveCustomerRequest):
    ranked = _rank_customer_candidates(
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        customer_email=payload.customer_email,
        site_address=payload.site_address,
        candidates=payload.candidate_customers,
    )
    top = ranked[:3]
    best = top[0] if top else None
    best_score = float(best["score"]) if best else 0.0

    has_extracted_identity = any(
        [
            (payload.customer_name or "").strip(),
            (payload.customer_phone or "").strip(),
            (payload.customer_email or "").strip(),
        ]
    )
    should_create_new = bool(has_extracted_identity and best_score < 0.62)

    return {
        "extractedCustomer": {
            "name": (payload.customer_name or "").strip(),
            "phone": (payload.customer_phone or "").strip(),
            "email": (payload.customer_email or "").strip(),
            "address": (payload.site_address or "").strip(),
        },
        "topMatches": top,
        "bestMatchId": best["id"] if best else None,
        "bestMatchScore": best_score,
        "canAutoSelect": bool(best and best_score >= 0.86),
        "shouldCreateNew": should_create_new,
    }


def _run_resend_send(to: str, subject: str, text: str) -> None:
    key = os.environ.get("RESEND_API_KEY", "").strip()
    from_f = os.environ.get("RESEND_FROM", "").strip()
    resend.api_key = key
    esc = html.escape(text)
    html_body = f'<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap">{esc}</pre>'
    out = resend.Emails.send(
        {
            "from": from_f,
            "to": to,
            "subject": (subject or "Quote").strip() or "Quote",
            "text": text,
            "html": html_body,
        }
    )
    if isinstance(out, dict):
        err = out.get("error") or out.get("message")
        if err:
            raise RuntimeError(str(err))
        sc = out.get("statusCode")
        if isinstance(sc, int) and sc >= 400:
            raise RuntimeError(str(out))


async def _post_sms_everyone(dest: str, message: str, reference: str | None) -> None:
    user = os.environ.get("SMS_EVERYONE_USERNAME", "").strip()
    pwd = os.environ.get("SMS_EVERYONE_PASSWORD", "").strip()
    originator = os.environ.get("SMS_EVERYONE_ORIGINATOR", "").strip()
    url = os.environ.get("SMS_EVERYONE_SEND_URL", "https://smseveryone.com/api/campaign").strip()
    body: dict[str, Any] = {
        "Message": message,
        "Originator": originator,
        "Destinations": [dest],
        "Action": "create",
    }
    ref = (reference or "").strip()
    if ref:
        body["Reference"] = ref[:120]
    async with httpx.AsyncClient(timeout=45.0) as client:
        r = await client.post(url, json=body, auth=(user, pwd))
        if r.status_code >= 400:
            raise RuntimeError(r.text[:400] or r.reason_phrase)


@app.post("/messaging/send-quote")
async def messaging_send_quote(
    payload: SendQuoteRequest,
    _user_id: Annotated[str, Depends(require_supabase_user)],
):
    _ = _user_id
    if not payload.send_email and not payload.send_sms:
        raise HTTPException(status_code=400, detail="Select at least one of email or SMS.")

    flags = _messaging_env_flags()
    result: dict[str, Any] = {
        "email_ok": None,
        "sms_ok": None,
        "email_error": None,
        "sms_error": None,
    }
    failed = False

    if payload.send_email:
        if not flags["resend_configured"]:
            raise HTTPException(status_code=503, detail="Email delivery is not configured on the server (Resend).")
        em = (payload.to_email or "").strip()
        if not em or "@" not in em:
            raise HTTPException(status_code=400, detail="A valid recipient email is required to send email.")
        if not (payload.email_text or "").strip():
            raise HTTPException(status_code=400, detail="Email body is empty.")
        try:
            await asyncio.to_thread(_run_resend_send, em, payload.email_subject, payload.email_text)
            result["email_ok"] = True
        except Exception as e:
            result["email_ok"] = False
            result["email_error"] = f"{type(e).__name__}: {str(e)[:180]}"
            failed = True

    if payload.send_sms:
        if not flags["sms_everyone_configured"]:
            raise HTTPException(status_code=503, detail="SMS delivery is not configured on the server (SMS Everyone).")
        dest = _international_sms_dest(payload.to_phone or "")
        if not dest:
            raise HTTPException(status_code=400, detail="A valid recipient mobile number is required to send SMS.")
        msg = (payload.sms_text or "").strip()
        if not msg:
            raise HTTPException(status_code=400, detail="SMS message text is empty.")
        try:
            await _post_sms_everyone(dest, msg, payload.quote_reference)
            result["sms_ok"] = True
        except Exception as e:
            result["sms_ok"] = False
            result["sms_error"] = f"{type(e).__name__}: {str(e)[:180]}"
            failed = True

    if failed:
        return JSONResponse(status_code=502, content=result)
    return result
