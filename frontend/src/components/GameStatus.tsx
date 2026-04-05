import type { GameStatus as GameStatusType } from "../hooks/useChessGame";

interface GameStatusProps {
  status: GameStatusType;
  turn: "w" | "b";
  isGameOver: boolean;
  isAIThinking: boolean;
  onReset: () => void;
}

export function GameStatus({
  status,
  turn,
  isGameOver,
  isAIThinking,
  onReset,
}: GameStatusProps) {
  const getStatusText = () => {
    switch (status) {
      case "checkmate":
        return turn === "w" ? "Checkmate — Black wins!" : "Checkmate — You win!";
      case "stalemate":
        return "Stalemate — Draw!";
      case "draw":
        return "Draw!";
      case "check":
        return turn === "w" ? "You are in check!" : "AI is in check!";
      default:
        return turn === "w" ? "Your turn" : "AI is thinking...";
    }
  };

  const getStatusClass = () => {
    if (status === "checkmate" && turn === "w") return "status-lose";
    if (status === "checkmate" && turn === "b") return "status-win";
    if (status === "check") return "status-check";
    if (isGameOver) return "status-draw";
    return "";
  };

  return (
    <div className="game-status">
      <div className={`status-text ${getStatusClass()}`}>
        {isAIThinking && !isGameOver ? (
          <span className="thinking">
            <span className="dot-animation">AI thinking</span>
          </span>
        ) : (
          getStatusText()
        )}
      </div>

      <div className="controls-hint">
        <p>
          <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> Navigate
        </p>
        <p>
          <kbd>Enter</kbd> Select / Confirm
        </p>
        <p>
          <kbd>Esc</kbd> Cancel
        </p>
      </div>

      {isGameOver && (
        <button className="reset-btn" onClick={onReset}>
          New Game
        </button>
      )}
    </div>
  );
}
