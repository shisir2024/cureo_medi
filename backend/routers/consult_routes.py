import uuid
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db, Consultation, Message, Doctor
from ..auth import decode_token
from ..ws_manager import manager

router = APIRouter(prefix="/api/consult", tags=["consultation"])


class ConsultRequest(BaseModel):
    patient_name: str
    symptoms: str
    severity: str


def get_patient_from_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(authorization.split(" ")[1])
    if not payload or payload.get("role") != "patient":
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


@router.post("/request")
def request_consultation(req: ConsultRequest, db: Session = Depends(get_db), patient=Depends(get_patient_from_token)):
    available = db.query(Doctor).filter(Doctor.is_online == True).first()
    if not available:
        raise HTTPException(status_code=503, detail="No doctors available right now")
    room_id = str(uuid.uuid4())
    consultation = Consultation(
        patient_id=int(patient["sub"]),
        patient_name=req.patient_name,
        symptoms=req.symptoms,
        severity=req.severity,
        status="pending",
        room_id=room_id,
    )
    db.add(consultation)
    db.commit()
    db.refresh(consultation)
    return {"room_id": room_id, "consultation_id": consultation.id, "status": "pending"}


@router.get("/status/{consultation_id}")
def get_status(consultation_id: int, db: Session = Depends(get_db)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Not found")
    return {"status": c.status, "room_id": c.room_id}


@router.get("/pending")
def get_pending(db: Session = Depends(get_db)):
    consultations = db.query(Consultation).filter(Consultation.status == "pending").all()
    return [
        {
            "id": c.id, "room_id": c.room_id, "patient_name": c.patient_name,
            "symptoms": c.symptoms, "severity": c.severity, "created_at": str(c.created_at)
        }
        for c in consultations
    ]


@router.put("/{consultation_id}/accept")
def accept_consultation(consultation_id: int, db: Session = Depends(get_db), authorization: str = Header(None)):
    payload = decode_token(authorization.split(" ")[1]) if authorization else None
    if not payload or payload.get("role") != "doctor":
        raise HTTPException(status_code=401, detail="Doctors only")
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c.status = "active"
    c.doctor_id = int(payload["sub"])
    db.commit()
    return {"room_id": c.room_id, "status": "active"}


@router.put("/{consultation_id}/decline")
def decline_consultation(consultation_id: int, db: Session = Depends(get_db), authorization: str = Header(None)):
    payload = decode_token(authorization.split(" ")[1]) if authorization else None
    if not payload or payload.get("role") != "doctor":
        raise HTTPException(status_code=401, detail="Doctors only")
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c.status = "declined"
    db.commit()
    return {"status": "declined"}


@router.put("/{consultation_id}/end")
def end_consultation(consultation_id: int, db: Session = Depends(get_db)):
    c = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Consultation not found")
    c.status = "completed"
    db.commit()
    return {"status": "completed"}


@router.get("/{consultation_id}/messages")
def get_messages(consultation_id: int, db: Session = Depends(get_db)):
    msgs = db.query(Message).filter(Message.consultation_id == consultation_id).all()
    return [{"sender_role": m.sender_role, "sender_name": m.sender_name, "content": m.content, "timestamp": str(m.timestamp)} for m in msgs]


@router.websocket("/ws/{room_id}")
async def websocket_consultation(room_id: str, websocket: WebSocket, db: Session = Depends(get_db)):
    await manager.connect_room(room_id, websocket)
    consultation = db.query(Consultation).filter(Consultation.room_id == room_id).first()
    try:
        while True:
            data = await websocket.receive_json()
            # Save message to DB
            if consultation:
                msg = Message(
                    consultation_id=consultation.id,
                    sender_role=data.get("role", "unknown"),
                    sender_name=data.get("name", ""),
                    content=data.get("content", ""),
                )
                db.add(msg)
                db.commit()
            # Broadcast to other person in room
            await manager.broadcast_room(room_id, data, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect_room(room_id, websocket)
        await manager.broadcast_room(room_id, {"type": "system", "content": "The other person has disconnected."})


@router.websocket("/ws/doctor/{doctor_id}")
async def websocket_doctor(doctor_id: str, websocket: WebSocket):
    await manager.connect_doctor(doctor_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_doctor(doctor_id)
