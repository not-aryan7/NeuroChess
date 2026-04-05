import { Chessboard } from "react-chessboard";
import type { Square } from "chess.js";

interface ChessBoardProps {
  fen: string;
  cursorSquare: Square;
  selectedSquare: Square | null;
  legalMoves: Square[];
  onSquareClick: (square: Square) => void;
  boardWidth: number;
}

export function ChessBoard({
  fen,
  cursorSquare,
  selectedSquare,
  legalMoves,
  onSquareClick,
  boardWidth,
}: ChessBoardProps) {
  const squareStyles: Record<string, React.CSSProperties> = {};

  // Cursor highlight (blue border)
  squareStyles[cursorSquare] = {
    boxShadow: "inset 0 0 0 3px #00bfff",
  };

  // Selected piece highlight (yellow)
  if (selectedSquare) {
    squareStyles[selectedSquare] = {
      backgroundColor: "rgba(255, 255, 0, 0.4)",
      boxShadow: "inset 0 0 0 3px #ffd700",
    };
  }

  // Legal move indicators (green dots)
  for (const sq of legalMoves) {
    squareStyles[sq] = {
      ...squareStyles[sq],
      background:
        "radial-gradient(circle, rgba(0, 200, 0, 0.6) 25%, transparent 25%)",
    };
  }

  return (
    <div style={{ width: boardWidth, height: boardWidth }}>
      <Chessboard
        options={{
          position: fen,
          onSquareClick: ({ square }) => onSquareClick(square as Square),
          squareStyles,
          boardStyle: {
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
          },
          darkSquareStyle: { backgroundColor: "#779952" },
          lightSquareStyle: { backgroundColor: "#edeed1" },
          animationDurationInMs: 200,
        }}
      />
    </div>
  );
}
