import time
import random
import math

CHANNELS = ["AF3", "AF4", "T7", "T8", "Pz"]

CURRENT_COMMAND = "REST"


def set_command(cmd):
    global CURRENT_COMMAND
    CURRENT_COMMAND = cmd


def generate_wave(t, freq, amplitude=50):
    return amplitude * math.sin(2 * math.pi * freq * t)


def generate_fake_eeg(t):
    eeg = {}

    for ch in CHANNELS:
        alpha = generate_wave(t, 10)
        beta = generate_wave(t, 20)
        noise = random.uniform(-10, 10)

        signal = alpha + beta + noise

        # simulate brain intent
        if CURRENT_COMMAND == "LEFT" and ch == "T7":
            signal += 40
        elif CURRENT_COMMAND == "RIGHT" and ch == "T8":
            signal += 40
        elif CURRENT_COMMAND == "SELECT" and ch == "AF3":
            signal += 40

        eeg[ch] = signal

    return {
        "timestamp": time.time(),
        "channels": eeg,
        "label": CURRENT_COMMAND
    }


def stream_fake_eeg():
    t = 0
    dt = 1 / 128  # 128 Hz

    print("🚀 Fake EEG stream started")

    while True:
        data = generate_fake_eeg(t)
        print(data)

        t += dt
        time.sleep(dt)


if __name__ == "__main__":
    stream_fake_eeg()