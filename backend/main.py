from dotenv import load_dotenv
load_dotenv()

import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from backend.agent import process_complaint_text
from backend.notifier import send_high_risk_alert

# Database Setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pharma_complaints.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ComplaintModel(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, nullable=False)
    batch_number = Column(String, nullable=False)
    complaint_type = Column(String, nullable=False)
    severity_level = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    risk_classification = Column(String, nullable=False)
    suggested_capa = Column(Text, nullable=False)
    is_complete = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


Base.metadata.create_all(bind=engine)

# FastAPI App Setup
app = FastAPI(
    title="Aivoa Pharma Complaint System API",
    description="API for processing and storing pharmaceutical complaints",
    version="1.0.0",
)

# CORS Configuration - Flexible production & local deployment testing
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
if raw_origins == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic Schemas
class ExtractRequest(BaseModel):
    raw_text: str = Field(..., description="Raw text of the complaint")


class ComplaintCreate(BaseModel):
    product_name: str
    batch_number: str
    complaint_type: str
    severity_level: str
    description: str
    risk_classification: str
    suggested_capa: str
    is_complete: bool = True


class ComplaintResponse(BaseModel):
    id: int
    product_name: str
    batch_number: str
    complaint_type: str
    severity_level: str
    description: str
    risk_classification: str
    suggested_capa: str
    is_complete: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Endpoints
@app.post("/api/extract", response_model=dict, status_code=status.HTTP_200_OK)
def extract_complaint(request: ExtractRequest, background_tasks: BackgroundTasks):
    if not request.raw_text or not request.raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="raw_text field cannot be empty."
        )
    extracted_data = process_complaint_text(request.raw_text)

    # Check for High Risk / Critical complaint to queue asynchronous background email notification
    risk_level = str(extracted_data.get("risk_classification", "")).upper()
    severity = str(extracted_data.get("severity_level", "")).upper()

    if risk_level == "HIGH" or severity == "CRITICAL":
        background_tasks.add_task(send_high_risk_alert, extracted_data, request.raw_text)

    return extracted_data


@app.post("/api/complaints", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
def create_complaint(complaint: ComplaintCreate, db: Session = Depends(get_db)):
    db_complaint = ComplaintModel(
        product_name=complaint.product_name,
        batch_number=complaint.batch_number,
        complaint_type=complaint.complaint_type,
        severity_level=complaint.severity_level,
        description=complaint.description,
        risk_classification=complaint.risk_classification,
        suggested_capa=complaint.suggested_capa,
        is_complete=complaint.is_complete,
    )
    db.add(db_complaint)
    db.commit()
    db.refresh(db_complaint)
    return db_complaint


@app.get("/api/complaints", response_model=List[ComplaintResponse], status_code=status.HTTP_200_OK)
def get_complaints(db: Session = Depends(get_db)):
    complaints = db.query(ComplaintModel).order_by(ComplaintModel.created_at.desc()).all()
    return complaints
