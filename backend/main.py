import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import waitlist

# ALLOWED_ORIGINS: comma-separated list of frontend origins, or "*" for local dev.
# In production set this env var to your Vercel frontend URL, e.g.:
#   ALLOWED_ORIGINS=https://optima-frontend.vercel.app
_env = os.getenv("ENVIRONMENT", "development").lower()
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if _raw_origins.strip() == "*":
    if _env in ("production", "prod"):
        raise RuntimeError(
            "ALLOWED_ORIGINS must be set to an explicit origin list in production "
            "(wildcard '*' is not permitted)."
        )
    allow_origins = ["*"]
    allow_credentials = False
else:
    allow_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    allow_credentials = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Optima Waitlist API",
    description="Waitlist signup for Optima",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(waitlist.router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "service": "Optima Waitlist API"}


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
