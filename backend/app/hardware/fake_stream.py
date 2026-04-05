"""
Fake EEG stream for demo mode.

Uses synthetic waveforms to simulate EEG data and generate
random chess commands — no headset needed.
"""

import asyncio
import math
import random
import time
from typing import AsyncGenerator, Optional

CHANNELS = ["AF3", "AF4", "T7", "T8", "Pz"]
ACTIONS = ["left", "right", "up", "down", "feet", "rest"]
SAMPLE_RATE = 128


def _generate_wave(t: float, freq: float, amplitude: float = 50.0) -> float:
    return amplitude * math.sin(2 * math.pi * freq * t)


def _generate_fake_sample(t: float, action: str) -> dict:
    """Generate one fake EEG sample with simulated brain intent."""
    channels = {}
    for ch in CHANNELS:
        alpha = _generate_wave(t, 10)
        beta = _generate_wave(t, 20)
        noise = random.uniform(-10, 10)
        signal = alpha + beta + noise

        # Boost signal in relevant channel based on current action
        if action == "left" and ch == "T7":
            signal += 40
        elif action == "right" and ch == "T8":
            signal += 40
        elif action in ("up", "down") and ch == "Pz":
            signal += 35
        elif action == "feet" and ch == "AF3":
            signal += 40

        channels[ch] = round(signal, 2)

    return channels


class FakeEEGStream:
    """
    Drop-in replacement for EEGStream that generates fake data.
    Same interface so the backend doesn't need to care which mode it's in.
    """

    def __init__(self):
        self.is_running = False
        self.last_command: Optional[str] = None
        self.last_confidence: float = 0.0
        self.focus_level: float = 0.0
        self.contact_quality = {ch: 4 for ch in CHANNELS}  # all "green"
        self.eeg_buffer: list = []
        self._t = 0.0
        self._dt = 1.0 / SAMPLE_RATE

    async def start(self):
        self.is_running = True

    async def stop(self):
        self.is_running = False

    async def stream_commands(self) -> AsyncGenerator[dict, None]:
        """Yield a random chess command every 0.8–2 seconds."""
        while self.is_running:
            delay = random.uniform(0.8, 2.0)
            await asyncio.sleep(delay)

            if not self.is_running:
                break

            action = random.choice(ACTIONS)
            confidence = round(random.uniform(0.6, 0.95), 3)

            self.last_command = action
            self.last_confidence = confidence

            yield {
                "command": action,
                "confidence": confidence,
                "raw_action": action.upper(),
                "timestamp": time.time(),
            }

    async def stream_raw_eeg(self) -> AsyncGenerator[dict, None]:
        """Yield fake EEG samples at ~128Hz (batched to ~10 updates/sec for frontend)."""
        batch_size = SAMPLE_RATE // 10  # send every ~12 samples

        while self.is_running:
            # Generate a batch worth of time
            action = self.last_command or "rest"
            channels = _generate_fake_sample(self._t, action)
            self._t += self._dt * batch_size

            # Simulate fluctuating focus level
            self.focus_level = round(
                min(1.0, max(0.0, self.focus_level + random.uniform(-0.05, 0.05))),
                3,
            )
            if self.focus_level == 0.0:
                self.focus_level = 0.5

            yield {
                "channels": channels,
                "timestamp": time.time(),
                "focus": self.focus_level,
            }

            await asyncio.sleep(1.0 / 10)  # ~10 updates per second

    def get_status(self) -> dict:
        return {
            "connected": self.is_running,
            "last_command": self.last_command,
            "last_confidence": self.last_confidence,
            "focus_level": self.focus_level,
            "contact_quality": self.contact_quality,
            "buffer_size": len(self.eeg_buffer),
            "mode": "demo",
        }
