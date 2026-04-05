import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import type { Square, Move } from "chess.js";

export type GameStatus =
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw";

export interface ChessGameState {
  fen: string;
  turn: "w" | "b";
  status: GameStatus;
  moveHistory: Move[];
  selectedSquare: Square | null;
  legalMoves: Square[];
  isGameOver: boolean;
}

export function useChessGame() {
  const [game] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  const getStatus = useCallback((): GameStatus => {
    if (game.isCheckmate()) return "checkmate";
    if (game.isStalemate()) return "stalemate";
    if (game.isDraw()) return "draw";
    if (game.inCheck()) return "check";
    return "playing";
  }, [game]);

  const selectSquare = useCallback(
    (square: Square) => {
      if (game.isGameOver()) return;

      // If a piece is already selected, try to move
      if (selectedSquare) {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: "q", // auto-promote to queen
        });

        if (move) {
          setFen(game.fen());
          setMoveHistory([...game.history({ verbose: true })]);
          setSelectedSquare(null);
          setLegalMoves([]);
          return move;
        }

        // If clicking another own piece, select it instead
        const piece = game.get(square);
        if (piece && piece.color === game.turn()) {
          const moves = game.moves({ square, verbose: true });
          setSelectedSquare(square);
          setLegalMoves(moves.map((m) => m.to));
          return null;
        }

        // Invalid move — deselect
        setSelectedSquare(null);
        setLegalMoves([]);
        return null;
      }

      // No piece selected — select if it's the current player's piece
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        const moves = game.moves({ square, verbose: true });
        setSelectedSquare(square);
        setLegalMoves(moves.map((m) => m.to));
      }
      return null;
    },
    [game, selectedSquare]
  );

  const makeMove = useCallback(
    (from: Square, to: Square): Move | null => {
      try {
        const move = game.move({ from, to, promotion: "q" });
        if (move) {
          setFen(game.fen());
          setMoveHistory([...game.history({ verbose: true })]);
          setSelectedSquare(null);
          setLegalMoves([]);
        }
        return move;
      } catch {
        return null;
      }
    },
    [game]
  );

  const makeMoveFromSan = useCallback(
    (san: string): Move | null => {
      try {
        const move = game.move(san);
        if (move) {
          setFen(game.fen());
          setMoveHistory([...game.history({ verbose: true })]);
          setSelectedSquare(null);
          setLegalMoves([]);
        }
        return move;
      } catch {
        return null;
      }
    },
    [game]
  );

  const deselect = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  const reset = useCallback(() => {
    game.reset();
    setFen(game.fen());
    setMoveHistory([]);
    setSelectedSquare(null);
    setLegalMoves([]);
  }, [game]);

  return {
    fen,
    turn: game.turn() as "w" | "b",
    status: getStatus(),
    moveHistory,
    selectedSquare,
    legalMoves,
    isGameOver: game.isGameOver(),
    selectSquare,
    makeMove,
    makeMoveFromSan,
    deselect,
    reset,
    game,
  };
}
