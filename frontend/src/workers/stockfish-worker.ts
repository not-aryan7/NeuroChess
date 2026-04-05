// Simple chess AI fallback when Stockfish WASM isn't available
// Uses a basic evaluation to pick reasonable moves

import { Chess } from "chess.js";

const pieceValues: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function evaluateBoard(game: Chess): number {
  let score = 0;
  const board = game.board();

  for (const row of board) {
    for (const cell of row) {
      if (cell) {
        const value = pieceValues[cell.type] || 0;
        score += cell.color === "w" ? value : -value;
      }
    }
  }

  return score;
}

function minimax(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || game.isGameOver()) {
    return evaluateBoard(game);
  }

  const moves = game.moves();

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      game.move(move);
      const eval_ = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      maxEval = Math.max(maxEval, eval_);
      alpha = Math.max(alpha, eval_);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      game.move(move);
      const eval_ = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      minEval = Math.min(minEval, eval_);
      beta = Math.min(beta, eval_);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function findBestMove(fen: string, depth: number): string {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });

  if (moves.length === 0) return "none";

  let bestMove = moves[0];
  let bestEval = Infinity; // AI plays black, minimizing

  for (const move of moves) {
    game.move(move.san);
    const eval_ = minimax(game, depth - 1, -Infinity, Infinity, true);
    game.undo();

    if (eval_ < bestEval) {
      bestEval = eval_;
      bestMove = move;
    }
  }

  return bestMove.from + bestMove.to;
}

let currentFen = "";

self.onmessage = (e: MessageEvent) => {
  const msg = e.data as string;

  if (msg.startsWith("position fen ")) {
    currentFen = msg.replace("position fen ", "");
  } else if (msg.startsWith("go depth ")) {
    const depth = Math.min(parseInt(msg.replace("go depth ", ""), 10), 4); // cap depth for performance
    const best = findBestMove(currentFen, depth);
    self.postMessage(`bestmove ${best}`);
  }
};
