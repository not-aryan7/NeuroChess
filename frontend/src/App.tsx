import { useEffect, useCallback, useState } from "react";
import type { Square } from "chess.js";
import { ChessBoard } from "./components/ChessBoard";
import { MoveHistory } from "./components/MoveHistory";
import { GameStatus } from "./components/GameStatus";
import { useChessGame } from "./hooks/useChessGame";
import { useCursorNavigation } from "./hooks/useCursorNavigation";
import { useStockfish } from "./hooks/useStockfish";
import { useEEGInput } from "./hooks/useEEGInput";
import "./App.css";

function App() {
  const {
    fen,
    turn,
    status,
    moveHistory,
    selectedSquare,
    legalMoves,
    isGameOver,
    selectSquare,
    makeMoveFromSan,
    deselect,
    reset,
    game,
  } = useChessGame();

  const { getBestMove, bestMove, isThinking } = useStockfish();
  const [aiDifficulty] = useState(3);

  const handleSelect = useCallback(
    (square: Square) => {
      if (turn !== "w" || isGameOver) return;
      selectSquare(square);
    },
    [turn, isGameOver, selectSquare]
  );

  const handleCancel = useCallback(() => {
    deselect();
  }, [deselect]);

  const { cursorSquare, handleEEGCommand } = useCursorNavigation(
    handleSelect,
    handleCancel,
    turn === "w" && !isGameOver
  );

  // EEG headset integration
  const {
    isConnected: eegConnected,
    isConnecting: eegConnecting,
    lastCommand: eegLastCommand,
    error: eegError,
    connect: eegConnect,
    disconnect: eegDisconnect,
  } = useEEGInput(handleEEGCommand);

  // Trigger AI move when it's black's turn
  useEffect(() => {
    if (turn === "b" && !isGameOver) {
      const timer = setTimeout(() => {
        getBestMove(fen, aiDifficulty);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [turn, isGameOver, fen, aiDifficulty, getBestMove]);

  // Apply AI's best move
  useEffect(() => {
    if (bestMove && turn === "b" && !isGameOver) {
      if (bestMove === "none") return;

      const from = bestMove.slice(0, 2) as Square;
      const to = bestMove.slice(2, 4) as Square;

      const moves = game.moves({ verbose: true });
      const match = moves.find((m) => m.from === from && m.to === to);
      if (match) {
        makeMoveFromSan(match.san);
      }
    }
  }, [bestMove, turn, isGameOver, game, makeMoveFromSan]);

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (turn !== "w" || isGameOver) return;
      selectSquare(square);
    },
    [turn, isGameOver, selectSquare]
  );

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span className="logo-mind">Mind</span>
          <span className="logo-quest">Quest</span>
        </h1>
        <span className="subtitle">EEG-Controlled Chess</span>

        {!eegConnected ? (
          <button
            className="eeg-btn eeg-connect-btn"
            onClick={eegConnect}
            disabled={eegConnecting}
          >
            {eegConnecting ? "Connecting..." : "Connect EEG"}
          </button>
        ) : (
          <button
            className="eeg-btn eeg-disconnect-btn"
            onClick={eegDisconnect}
          >
            Disconnect EEG
          </button>
        )}

        {eegConnected && eegLastCommand && (
          <span className="eeg-indicator">
            EEG: {eegLastCommand.command} ({Math.round(eegLastCommand.confidence * 100)}%)
          </span>
        )}

        {eegError && <span className="eeg-error">{eegError}</span>}

        {!eegConnected && <span className="demo-badge">DEMO MODE</span>}
        {eegConnected && <span className="eeg-badge">EEG LIVE</span>}
      </header>

      <main className="game-container">
        <div className="left-panel">
          <GameStatus
            status={status}
            turn={turn}
            isGameOver={isGameOver}
            isAIThinking={isThinking}
            onReset={reset}
          />
        </div>

        <div className="board-panel">
          <ChessBoard
            fen={fen}
            cursorSquare={cursorSquare}
            selectedSquare={selectedSquare}
            legalMoves={legalMoves}
            onSquareClick={handleSquareClick}
            boardWidth={520}
          />
        </div>

        <div className="right-panel">
          <MoveHistory moves={moveHistory} />
        </div>
      </main>
    </div>
  );
}

export default App;
