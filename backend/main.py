from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

from backend.stream import eeg_pipeline

app = FastAPI()


def event_stream():
    for data in eeg_pipeline():
        yield f"data: {json.dumps(data)}\n\n"


@app.get("/stream")
def stream():
    return StreamingResponse(event_stream(), media_type="text/event-stream")