from dataclasses import dataclass
import secrets
import httpx
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from .config import settings
from .db import get_db
from .models import Profile

@dataclass
class Principal:
    user_id: str
    role: str

async def principal(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> Principal:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Bearer token required")
    token = authorization[7:]
    if settings.dev_bearer_token and settings.dev_user_id and secrets.compare_digest(token, settings.dev_bearer_token):
        return Principal(settings.dev_user_id, settings.dev_user_role)
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(401, "Authentication provider not configured")
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(settings.supabase_url.rstrip("/") + "/auth/v1/user",headers={"apikey":settings.supabase_anon_key,"Authorization":f"Bearer {token}"})
        if response.status_code != 200:
            raise HTTPException(401, "Invalid or expired token")
        user_id = response.json().get("id")
        if not isinstance(user_id,str): raise HTTPException(401,"Invalid user")
    except httpx.RequestError:
        raise HTTPException(503,"Authentication service unavailable")
    profile = db.get(Profile,user_id)
    if profile is None:
        raise HTTPException(403,"Account not provisioned; contact owner")
    if profile.role not in ("owner","manager","staff"):
        raise HTTPException(403,"Invalid role")
    return Principal(user_id,profile.role)

def require(*roles: str):
    def check(p: Principal = Depends(principal)) -> Principal:
        if p.role not in roles: raise HTTPException(403,"Insufficient permissions")
        return p
    return check
