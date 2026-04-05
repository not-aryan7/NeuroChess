# MindQuest: EEG-Controlled Chess Game — Implementation Plan

## Context

Aryan is building **MindQuest** — a browser-based chess game controlled by EEG brain signals. He owns an **Emotiv Insight 5-channel wireless EEG headset** but wants to build the **demo mode first** (keyboard-simulated EEG) to show friends. Real EEG integration will come later.

The game is a **full chess game vs an AI opponent**, where the player navigates and selects pieces using brain signals (or keyboard in demo mode). The project directory currently only contains the design doc — everything is built from scratch.

---

## Step-by-Step Build Plan

### Step 1: Project Scaffolding ✅

- Initialize monorepo with `frontend/` and `backend/` directories
- **Frontend:** React + TypeScript via Vite
- **Backend:** FastAPI (Python)
- Install all dependencies, set up `.gitignore`, git init

**Directory structure:**
```
mindquest/
├── frontend/                # React app
│   ├── src/
│   │   ├── components/      # ChessBoard, EEGVisualizer, ConfidenceDisplay
│   │   ├── hooks/           # useWebSocket, useGameState
│   │   ├── services/        # WebSocket client, demo signal generator
│   │   └── App.tsx
│   └── package.json
├── backend/                 # FastAPI + ML
│   ├── app/
│   │   ├── main.py          # FastAPI app, WebSocket endpoint
│   │   ├── model/           # Transformer model + inference
│   │   └── preprocessing/   # EEG signal processing
│   ├── train/               # Training scripts
│   └── requirements.txt
├── README.md
└── MindQuest_Project_Docs.docx
```

---

### Step 2: Chess Game UI (Demo-First) ✅

Build the chess game that works with keyboard first, EEG later.

- **`ChessBoard.tsx`** — Use `react-chessboard` for board rendering + `chess.js` for game logic
- **Navigation system:**
  - Arrow keys (demo) or EEG signals (later) to move a cursor across the board
  - Visual highlight on the currently selected square
  - Press Enter/Space (demo) or "feet" signal to select a piece
  - Navigate to destination square, confirm to move
  - Escape (demo) or "rest" signal to cancel selection
- **Game state:** Check, checkmate, stalemate detection via `chess.js`
- **Move history panel** on the side
- **AI opponent:** Minimax engine running in a Web Worker
  - Adjustable difficulty (depth 1–4)

**EEG-to-Chess control mapping:**
| Signal (Demo Key) | Chess Action |
|---|---|
| Left imagery (← arrow) | Move cursor left |
| Right imagery (→ arrow) | Move cursor right |
| Feet imagery (Enter) | Select piece / confirm move |
| Rest/tongue (Escape) | Cancel selection |
| ↑/↓ arrows | Move cursor up/down |

---

### Step 3: Demo EEG Signal Simulator

Build a fake EEG signal generator so the app looks like a real BCI system.

- **`DemoSignalGenerator.ts`** — Generates synthetic EEG waveforms (5 channels to match Emotiv Insight)
- When user presses arrow keys, generate corresponding motor imagery patterns
- Feed fake signals to the EEG visualizer in real-time
- Fake confidence scores (randomized 60–95%) displayed alongside predictions

---

### Step 4: EEG Signal Visualizer

- **`EEGVisualizer.tsx`** — Real-time scrolling line chart (5 channels)
- Use `recharts` or lightweight canvas-based rendering
- Show channel labels: AF3, AF4, T7, T8, Pz (Emotiv Insight channels)
- Display current prediction + confidence bar
- Show focus level indicator (simulated alpha power)

---

### Step 5: Backend — FastAPI + WebSocket

- **`main.py`** — FastAPI app with:
  - `WebSocket /ws` — receives EEG signal arrays, returns predictions
  - `GET /health` — health check
  - `POST /predict` — REST fallback for single predictions
- **Demo mode backend:** Return mock predictions based on signal patterns
- CORS configured for frontend origin

---

### Step 6: EEG Preprocessing Pipeline

- **`preprocessing/pipeline.py`** using MNE-Python
- Adapted for **5-channel Emotiv Insight** (not 22-channel BCI Competition)
- Bandpass filter: 8–30 Hz
- Epoch segmentation
- Per-channel normalization
- Also build pipeline for BCI Competition IV dataset (22-channel) for training

---

### Step 7: Transformer Model

- **`model/transformer.py`** — EEG Transformer in PyTorch
- Input: `[Batch, Channels=5, Time=128]` (Emotiv Insight: 5ch, 128 Hz)
- Architecture: Patch embedding → Positional encoding → 4-layer Transformer encoder (8 heads) → Classification head
- 4-class output: left, right, feet, rest + confidence score
- **Training:** Use BCI Competition IV Dataset 2a (subsample to 5 channels to simulate Emotiv)
- Target: >65% accuracy on 4-class task with 5 channels
- Export to ONNX for fast inference

---

### Step 8: Integration

- Connect frontend WebSocket to backend
- Signal flow: Demo keys → fake EEG signal → backend → model inference → prediction → chess action
- Confidence thresholding: only execute moves when confidence > 55%
- Tune latency for smooth gameplay (<200ms round trip)

---

### Step 9: Deployment

- **Backend → Render** (free tier)
  - Dockerfile with ONNX runtime
  - Environment variables for config
- **Frontend → Vercel** (free tier)
  - WebSocket URL via env var
  - Production build with Vite

---

### Step 10: Polish & Demo-Ready

- Clean UI with dark theme (looks impressive for demos)
- "Demo Mode" toggle clearly visible
- Animated EEG visualizer even in demo mode
- Confidence gauge animation
- Game over screen with stats
- README with screenshots, setup instructions, architecture diagram
- Record a demo video

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Chess Board | react-chessboard + chess.js |
| AI Opponent | Minimax engine (Web Worker) |
| Frontend | React + TypeScript (Vite) |
| EEG Visualization | recharts or canvas |
| Backend | FastAPI (Python) |
| ML Model | PyTorch → ONNX Runtime |
| EEG Preprocessing | MNE-Python |
| Real-time Comm | WebSocket |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

---

## Verification

1. **Chess game:** Play a full game using keyboard controls in demo mode
2. **EEG visualizer:** Verify 5-channel waveforms animate smoothly
3. **Confidence display:** Check predictions + confidence update in real-time
4. **AI opponent:** Verify AI responds with legal moves at different difficulties
5. **WebSocket:** Open browser devtools → verify messages flow both directions
6. **Backend:** `curl POST /predict` with sample signal array
7. **Deployment:** Visit Vercel URL, play a demo game end-to-end
