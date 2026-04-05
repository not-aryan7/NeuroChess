from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
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


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(data: dict):
    """Demo mode: return mock prediction."""
    classes = ["left", "right", "feet", "rest"]
    predicted = random.choice(classes)
    confidence = round(random.uniform(0.55, 0.95), 2)
    return {"class": predicted, "confidence": confidence}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)

            # Demo mode: return mock prediction
            classes = ["left", "right", "feet", "rest"]
            predicted = random.choice(classes)
            confidence = round(random.uniform(0.55, 0.95), 2)

            await websocket.send_text(json.dumps({
                "class": predicted,
                "confidence": confidence,
            }))
    except WebSocketDisconnect:
        pass
