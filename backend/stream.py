from hardware.fake_eeg_stream import generate_fake_eeg
from backend.predictor import predict
import time

def eeg_pipeline():
    t = 0
    dt = 1 / 128

    while True:
        eeg = generate_fake_eeg(t)
        result = predict(eeg)

        yield {
            "eeg": eeg,
            "prediction": result
        }

        t += dt
        time.sleep(dt)