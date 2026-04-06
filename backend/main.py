import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

    debug = {
        "url_set": bool(url),
        "key_set": bool(key),
        "key_type": _detect_key_type(key) if key else "missing",
        "key_preview": _mask_key(key) if key else "n/a",
        "init_error": None,
        "query_error": None,
    }

    if not url or not key:
        debug["init_error"] = "Missing env var(s)"
        return {"status": "ok", "db": "not_configured", "debug": debug}

    sb = get_supabase()
    if sb is None:
        debug["init_error"] = _init_error
        return {"status": "ok", "db": "invalid_key", "debug": debug}

    try:
        sb.table("_health_check_dummy").select("*").limit(1).execute()
        return {"status": "ok", "db": "connected", "debug": debug}
    except Exception as e:
        err = str(e)
        if "does not exist" in err or "42P01" in err:
            return {"status": "ok", "db": "connected", "debug": debug}
        debug["query_error"] = f"{type(e).__name__}: {err[:200]}"
        return {"status": "ok", "db": "query_failed", "debug": debug}
