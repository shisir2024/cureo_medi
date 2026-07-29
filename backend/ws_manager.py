from fastapi import WebSocket
from typing import Dict, List


class ConnectionManager:
    def __init__(self):
        # room_id → list of websockets
        self.rooms: Dict[str, List[WebSocket]] = {}
        # doctor_id → websocket (for incoming request notifications)
        self.doctors: Dict[str, WebSocket] = {}

    async def connect_room(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append(websocket)

    def disconnect_room(self, room_id: str, websocket: WebSocket):
        if room_id in self.rooms:
            self.rooms[room_id].remove(websocket)
            if not self.rooms[room_id]:
                del self.rooms[room_id]

    async def broadcast_room(self, room_id: str, message: dict, sender: WebSocket = None):
        if room_id in self.rooms:
            for ws in self.rooms[room_id]:
                if ws != sender:
                    await ws.send_json(message)

    async def connect_doctor(self, doctor_id: str, websocket: WebSocket):
        await websocket.accept()
        self.doctors[doctor_id] = websocket

    def disconnect_doctor(self, doctor_id: str):
        self.doctors.pop(doctor_id, None)

    async def notify_doctors(self, message: dict):
        for ws in self.doctors.values():
            try:
                await ws.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()
