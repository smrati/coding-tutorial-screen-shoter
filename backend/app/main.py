import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import recordings, screenshots, images


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Coding Tutorial Screenshot Tool", lifespan=lifespan)

frontend_port = os.environ.get("FRONTEND_PORT", "5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://localhost:{frontend_port}"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recordings.router)
app.include_router(screenshots.router)
app.include_router(images.router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
