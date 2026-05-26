from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'changeme')
JWT_ALGO = 'HS256'
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'bidyadhar')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Bidyadhar1!')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI(title="Job Tracker API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ---------- Models ----------
class LoginRequest(BaseModel):
    username: str
    password: str

class JobBase(BaseModel):
    job_name: str
    last_date: str  # ISO date string YYYY-MM-DD
    exam_date: Optional[str] = None  # ISO date string or None
    apply_link: str
    notes: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    job_name: Optional[str] = None
    last_date: Optional[str] = None
    exam_date: Optional[str] = None
    apply_link: Optional[str] = None
    notes: Optional[str] = None
    applied: Optional[bool] = None

class Job(JobBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    applied: bool = False
    applied_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SmartParseRequest(BaseModel):
    text: str

class SmartParseResponse(BaseModel):
    job_name: Optional[str] = None
    last_date: Optional[str] = None
    exam_date: Optional[str] = None
    apply_link: Optional[str] = None
    notes: Optional[str] = None
    raw_response: Optional[str] = None


# ---------- Auth helpers ----------
def create_token(username: str) -> str:
    payload = {
        'sub': username,
        'exp': datetime.now(timezone.utc) + timedelta(days=30),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def require_admin(creds: HTTPAuthorizationCredentials = Depends(security)):
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing auth token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        if payload.get('sub') != ADMIN_USERNAME:
            raise HTTPException(status_code=403, detail="Not authorized")
        return payload['sub']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def strip_id(doc: dict) -> dict:
    if doc and '_id' in doc:
        doc.pop('_id', None)
    return doc


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Job Tracker API", "status": "ok"}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    if req.username == ADMIN_USERNAME and req.password == ADMIN_PASSWORD:
        token = create_token(req.username)
        return {"token": token, "username": req.username}
    raise HTTPException(status_code=401, detail="Invalid credentials")


@api_router.get("/auth/me")
async def me(user: str = Depends(require_admin)):
    return {"username": user}


@api_router.get("/jobs", response_model=List[Job])
async def list_jobs():
    docs = await db.jobs.find({}, {"_id": 0}).to_list(1000)
    return docs


@api_router.post("/jobs", response_model=Job)
async def create_job(payload: JobCreate, user: str = Depends(require_admin)):
    job = Job(**payload.model_dump())
    await db.jobs.insert_one(job.model_dump())
    return job


@api_router.put("/jobs/{job_id}", response_model=Job)
async def update_job(job_id: str, payload: JobUpdate, user: str = Depends(require_admin)):
    existing = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}

    # Track applied transitions
    if 'applied' in update_data:
        if update_data['applied'] and not existing.get('applied'):
            update_data['applied_at'] = datetime.now(timezone.utc).isoformat()
        elif not update_data['applied']:
            update_data['applied_at'] = None

    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.jobs.update_one({"id": job_id}, {"$set": update_data})
    new_doc = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return new_doc


@api_router.patch("/jobs/{job_id}/toggle-applied", response_model=Job)
async def toggle_applied(job_id: str, user: str = Depends(require_admin)):
    existing = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Job not found")
    new_state = not bool(existing.get('applied', False))
    update_data = {
        'applied': new_state,
        'applied_at': datetime.now(timezone.utc).isoformat() if new_state else None,
        'updated_at': datetime.now(timezone.utc).isoformat(),
    }
    await db.jobs.update_one({"id": job_id}, {"$set": update_data})
    new_doc = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    return new_doc


@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user: str = Depends(require_admin)):
    res = await db.jobs.delete_one({"id": job_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"ok": True}


# ---------- Smart Parse ----------
SMART_PARSE_SYSTEM = """You are a meticulous information extractor for Indian government & private job notifications.
Given raw text (which may be a notification, paragraph, advertisement, or extracted webpage content), extract these fields:

- job_name: short title of the job/post (e.g. "SBI PO 2026", "RRB NTPC Recruitment").
- last_date: the LAST DATE TO APPLY in ISO format YYYY-MM-DD. If only a month/year is mentioned, pick the most plausible date or return null.
- exam_date: the EXAMINATION DATE in ISO format YYYY-MM-DD, or null if not present.
- apply_link: the OFFICIAL APPLY URL if present (full https URL). Else null.
- notes: a one-line short summary (max 120 chars).

Respond ONLY with a single JSON object with exactly these 5 keys. No prose, no markdown fences. Use null for missing values. If today's date is needed for context, assume year 2026."""


def _extract_json(text: str) -> Optional[dict]:
    # Try direct
    try:
        return json.loads(text)
    except Exception:
        pass
    # Try code-fenced
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return None
    return None


@api_router.post("/jobs/smart-parse", response_model=SmartParseResponse)
async def smart_parse(req: SmartParseRequest, user: str = Depends(require_admin)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    if not req.text or len(req.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Text too short")

    session_id = f"smart-parse-{uuid.uuid4()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=SMART_PARSE_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-6")

    msg = UserMessage(text=req.text.strip()[:8000])
    try:
        response = await chat.send_message(msg)
    except Exception as e:
        logger.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"LLM error: {str(e)}")

    data = _extract_json(response) or {}
    return SmartParseResponse(
        job_name=data.get('job_name'),
        last_date=data.get('last_date'),
        exam_date=data.get('exam_date'),
        apply_link=data.get('apply_link'),
        notes=data.get('notes'),
        raw_response=response if not data else None,
    )


# ---------- Stats ----------
@api_router.get("/stats")
async def stats():
    total = await db.jobs.count_documents({})
    applied = await db.jobs.count_documents({"applied": True})
    today = datetime.now(timezone.utc).date().isoformat()
    upcoming = await db.jobs.count_documents({
        "applied": False,
        "last_date": {"$gte": today},
    })
    overdue = await db.jobs.count_documents({
        "applied": False,
        "last_date": {"$lt": today},
    })
    return {
        "total": total,
        "applied": applied,
        "pending": total - applied,
        "upcoming": upcoming,
        "overdue": overdue,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.jobs.create_index("id", unique=True)
    await db.jobs.create_index("last_date")
    await db.jobs.create_index("applied")
    logger.info("Job Tracker API ready")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
