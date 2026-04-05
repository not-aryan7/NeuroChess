"""
Emotiv Cortex API configuration for MindQuest.

To get your credentials:
1. Go to https://www.emotiv.com/my-account/cortex-apps/
2. Create a new Cortex App
3. Copy the client_id and client_secret here (or set as env vars)
"""

import os

# Cortex API WebSocket endpoint (local Emotiv Launcher)
CORTEX_URL = "wss://localhost:6868"

# Your Emotiv Cortex App credentials
CLIENT_ID = os.getenv("EMOTIV_CLIENT_ID", "your_client_id_here")
CLIENT_SECRET = os.getenv("EMOTIV_CLIENT_SECRET", "your_client_secret_here")

# Emotiv Insight headset profile
HEADSET_ID = os.getenv("EMOTIV_HEADSET_ID", "")  # auto-detected if empty

# EEG channel config for Emotiv Insight
CHANNELS = ["AF3", "AF4", "T7", "T8", "Pz"]
SAMPLE_RATE = 128  # Hz

# Motor imagery command mapping to chess actions
COMMAND_MAP = {
    "left": "left",       # Left hand imagery → move cursor left
    "right": "right",     # Right hand imagery → move cursor right
    "push": "up",         # Mental push → move cursor up
    "pull": "down",       # Mental pull → move cursor down
    "lift": "feet",       # Feet imagery → select/confirm
    "drop": "rest",       # Rest/neutral → cancel/deselect
    "neutral": "rest",
}

# Confidence threshold — only send commands above this
CONFIDENCE_THRESHOLD = 0.55

# Mental command training profile name
PROFILE_NAME = os.getenv("EMOTIV_PROFILE", "MindQuest")
