from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import random

app = FastAPI(title="MindQuest API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global EEG stream instance (None until headset is connected)
eeg_stream = None


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/eeg/status")
async def eeg_status():
    """Check if the EEG headset is connected and streaming."""
    if eeg_stream and eeg_stream.is_running:
        return eeg_stream.get_status()
    return {"connected": False}


@app.post("/eeg/connect")
async def eeg_connect():
    """Connect to the Emotiv Insight headset via Cortex API."""
    global eeg_stream
    try:
        from .hardware import EEGStream
        eeg_stream = EEGStream()
        await eeg_stream.start()
        return {"status": "connected", "session": eeg_stream.client.session_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/eeg/disconnect")
async def eeg_disconnect():
    """Disconnect from the EEG headset."""
    global eeg_stream
    if eeg_stream:
        await eeg_stream.stop()
        eeg_stream = None
    return {"status": "disconnected"}


@app.post("/predict")
async def predict(data: dict):
    """Demo mode: return mock prediction."""
    classes = ["left", "right", "feet", "rest"]
    predicted = random.choice(classes)
    confidence = round(random.uniform(0.55, 0.95), 2)
    return {"class": predicted, "confidence": confidence}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Demo mode WebSocket — returns mock predictions."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            classes = ["left", "right", "feet", "rest"]
            predicted = random.choice(classes)
            confidence = round(random.uniform(0.55, 0.95), 2)

            await websocket.send_text(json.dumps({
                "class": predicted,
                "confidence": confidence,
            }))
    except WebSocketDisconnect:
        pass


@app.websocket("/ws/eeg")
async def eeg_websocket(websocket: WebSocket):
    """
    Live EEG WebSocket — streams chess commands from the Emotiv headset.

    Sends JSON messages:
      {"type": "command", "command": "left"|"right"|"up"|"down"|"feet"|"rest", "confidence": 0.0-1.0}
      {"type": "eeg", "channels": {"AF3": ..., "AF4": ..., ...}, "focus": 0.0-1.0}
      {"type": "status", ...}
    """
    await websocket.accept()

    if not eeg_stream or not eeg_stream.is_running:
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "EEG headset not connected. Call POST /eeg/connect first.",
        }))
        await websocket.close()
        return

    try:
        # Run two tasks: forward commands + forward raw EEG for visualization
        async def send_commands():
            async for cmd in eeg_stream.stream_commands():
                await websocket.send_text(json.dumps({
                    "type": "command",
                    **cmd,
                }))

        async def send_eeg_viz():
            async for sample in eeg_stream.stream_raw_eeg():
                await websocket.send_text(json.dumps({
                    "type": "eeg",
                    **sample,
                }))

        async def recv_messages():
            """Handle incoming messages from frontend (e.g., config changes)."""
            while True:
                msg = await websocket.receive_text()
                data = json.loads(msg)
                if data.get("action") == "status":
                    await websocket.send_text(json.dumps({
                        "type": "status",
                        **eeg_stream.get_status(),
                    }))

        await asyncio.gather(send_commands(), send_eeg_viz(), recv_messages())

    except WebSocketDisconnect:
        pass
