"""
EEG streaming module for MindQuest.

Reads data from the Emotiv Cortex API (via CortexClient) and translates
mental commands / raw EEG into chess control commands.
"""

import asyncio
import json
import time
from typing import AsyncGenerator, Optional

from .cortex_client import CortexClient
from .config import COMMAND_MAP, CONFIDENCE_THRESHOLD, CHANNELS, SAMPLE_RATE


class EEGStream:
    """
    Streams EEG data from Emotiv Insight and yields chess commands.

    Operates in two modes:
      - "com" mode: Uses trained mental commands from Cortex API
      - "eeg" mode: Streams raw EEG for the transformer model pipeline
    """

    def __init__(self):
        self.client = CortexClient()
        self.is_running = False
        self.last_command: Optional[str] = None
        self.last_confidence: float = 0.0
        self.eeg_buffer: list[list[float]] = []
        self.contact_quality: dict[str, int] = {ch: 0 for ch in CHANNELS}
        self.focus_level: float = 0.0

    async def start(self):
        """Connect to headset and start streaming."""
        await self.client.setup()
        self.is_running = True

    async def stop(self):
        """Stop streaming and close the session."""
        self.is_running = False
        try:
            await self.client.close_session()
            await self.client.close()
        except Exception:
            pass

    async def stream_commands(self) -> AsyncGenerator[dict, None]:
        """
        Yield chess commands derived from mental command stream ("com").

        Each yielded dict has:
          {
            "command": "left" | "right" | "up" | "down" | "feet" | "rest",
            "confidence": 0.0–1.0,
            "raw_action": str,       # original Cortex action name
            "timestamp": float,
          }
        """
        while self.is_running:
            try:
                data = await self.client.recv_data()
            except Exception:
                if not self.is_running:
                    break
                await asyncio.sleep(0.1)
                continue

            # Mental command data
            if "com" in data:
                com = data["com"]
                action = com[0]       # e.g., "left", "right", "push", "neutral"
                power = com[1]        # confidence 0.0–1.0

                chess_cmd = COMMAND_MAP.get(action, None)
                self.last_command = chess_cmd
                self.last_confidence = power

                if chess_cmd and power >= CONFIDENCE_THRESHOLD:
                    yield {
                        "command": chess_cmd,
                        "confidence": round(power, 3),
                        "raw_action": action,
                        "timestamp": time.time(),
                    }

            # Performance metrics (focus, stress, etc.)
            if "met" in data:
                met = data["met"]
                # met indices: [engagement, excitement, stress, relaxation,
                #               interest, focus]
                if len(met) >= 6:
                    self.focus_level = met[5]

            # Raw EEG data — buffer for visualization or model inference
            if "eeg" in data:
                eeg = data["eeg"]
                # eeg contains: [timestamp, AF3, AF4, T7, T8, Pz, ...]
                if len(eeg) > len(CHANNELS):
                    sample = eeg[1:len(CHANNELS) + 1]
                    self.eeg_buffer.append(sample)
                    # Keep only last 2 seconds of data
                    max_samples = SAMPLE_RATE * 2
                    if len(self.eeg_buffer) > max_samples:
                        self.eeg_buffer = self.eeg_buffer[-max_samples:]

    async def stream_raw_eeg(self) -> AsyncGenerator[dict, None]:
        """
        Yield raw EEG samples for visualization and model inference.

        Each yielded dict has:
          {
            "channels": {"AF3": val, "AF4": val, "T7": val, "T8": val, "Pz": val},
            "timestamp": float,
            "focus": float,
          }
        """
        while self.is_running:
            try:
                data = await self.client.recv_data()
            except Exception:
                if not self.is_running:
                    break
                await asyncio.sleep(0.1)
                continue

            if "eeg" in data:
                eeg = data["eeg"]
                if len(eeg) > len(CHANNELS):
                    channel_data = {}
                    for i, ch in enumerate(CHANNELS):
                        channel_data[ch] = eeg[i + 1]

                    yield {
                        "channels": channel_data,
                        "timestamp": eeg[0] if eeg else time.time(),
                        "focus": self.focus_level,
                    }

            if "met" in data:
                met = data["met"]
                if len(met) >= 6:
                    self.focus_level = met[5]

    def get_status(self) -> dict:
        """Return current stream status for the frontend."""
        return {
            "connected": self.is_running,
            "last_command": self.last_command,
            "last_confidence": self.last_confidence,
            "focus_level": self.focus_level,
            "contact_quality": self.contact_quality,
            "buffer_size": len(self.eeg_buffer),
        }
