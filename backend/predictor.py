import random

ACTIONS = ["LEFT", "RIGHT", "SELECT", "REST"]

def predict(eeg_data):
    # simple fake logic
    return {
        "action": random.choice(ACTIONS),
        "confidence": round(random.uniform(0.7, 0.95), 2)
    }