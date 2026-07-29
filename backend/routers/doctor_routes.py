import os
from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from dotenv import load_dotenv
from ..database import get_db, Doctor
from ..auth import hash_password, verify_password, create_token, decode_token

load_dotenv()
router = APIRouter(prefix="/api/doctor", tags=["doctor"])

SPECIALIZATIONS = [
    "General Practitioner", "Cardiologist", "Neurologist", "Pediatrician",
    "Dermatologist", "Orthopedic", "ENT Specialist", "Psychiatrist",
    "Gynecologist", "Emergency Medicine"
]


class DoctorRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    specialization: str
    license_number: str
    secret_code: str


class DoctorLoginRequest(BaseModel):
    email: str
    password: str


def get_current_doctor(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(authorization.split(" ")[1])
    if not payload or payload.get("role") != "doctor":
        raise HTTPException(status_code=401, detail="Invalid token")
    doctor = db.query(Doctor).filter(Doctor.id == int(payload["sub"])).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.post("/register")
def register(req: DoctorRegisterRequest, db: Session = Depends(get_db)):
    if req.secret_code != os.getenv("DOCTOR_SECRET_CODE", "CUREO-DOC-2024"):
        raise HTTPException(status_code=403, detail="Invalid secret code")
    if db.query(Doctor).filter(Doctor.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    doctor = Doctor(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        specialization=req.specialization,
        license_number=req.license_number,
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    token = create_token({"sub": str(doctor.id), "role": "doctor", "name": doctor.name})
    return {"token": token, "role": "doctor", "name": doctor.name, "specialization": doctor.specialization}


@router.post("/login")
def login(req: DoctorLoginRequest, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.email == req.email).first()
    if not doctor or not verify_password(req.password, doctor.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"sub": str(doctor.id), "role": "doctor", "name": doctor.name})
    return {"token": token, "role": "doctor", "name": doctor.name, "specialization": doctor.specialization}


@router.put("/status")
def toggle_status(db: Session = Depends(get_db), doctor: Doctor = Depends(get_current_doctor)):
    doctor.is_online = not doctor.is_online
    db.commit()
    return {"is_online": doctor.is_online}


@router.get("/available")
def check_available(db: Session = Depends(get_db)):
    count = db.query(Doctor).filter(Doctor.is_online == True).count()
    return {"available": count > 0, "count": count}


@router.get("/specializations")
def get_specializations():
    return {"specializations": SPECIALIZATIONS}
