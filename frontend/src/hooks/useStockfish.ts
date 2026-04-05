import { useState, useCallback, useRef, useEffect } from "react";

interface StockfishHook {
  getBestMove: (fen: string, depth?: number) => void;
  bestMove: string | null;
  isThinking: boolean;
}

export function useStockfish(): StockfishHook {
  const [bestMove, setBestMove] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Use a simple Stockfish worker via CDN fallback
    try {
      const worker = new Worker(
        new URL("../workers/stockfish-worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as string;
        if (msg.startsWith("bestmove")) {
          const move = msg.split(" ")[1];
          setBestMove(move);
          setIsThinking(false);
        }
      };

      workerRef.current = worker;
    } catch (err) {
      console.warn("Stockfish worker failed to load, using fallback:", err);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const getBestMove = useCallback((fen: string, depth: number = 10) => {
    if (!workerRef.current) {
      // Fallback: pick a random legal move after a delay
      setIsThinking(true);
      setTimeout(() => {
        setBestMove(null); // signal to use random move
        setIsThinking(false);
      }, 500);
      return;
    }

    setIsThinking(true);
    setBestMove(null);
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage(`go depth ${depth}`);
  }, []);

  return { getBestMove, bestMove, isThinking };
}
