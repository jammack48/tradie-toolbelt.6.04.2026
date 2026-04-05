import os
from typing import Any

import requests
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


def _check_supabase_customers() -> dict[str, Any]:
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not service_key:
        return {
            "ok": False,
            "reason": "missing_env",
            "message": "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).",
        }

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/customers_prod?select=id&limit=1"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }

    try:
        res = requests.get(endpoint, headers=headers, timeout=8)
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "reason": "request_error", "message": str(exc)}

    if not res.ok:
        return {
            "ok": False,
            "reason": "supabase_error",
            "status": res.status_code,
            "message": res.text[:300],
        }

    return {"ok": True}


@app.get("/")
async def root():
    return {"api": "online"}


@app.get("/health")
async def health_check():
    db_check = _check_supabase_customers()
    if db_check["ok"]:
        return {"status": "ok", "database": "supabase_customers"}

    return {
        "status": "degraded",
        "database": "supabase_customers",
        "db_check": db_check,
    }
