import { useState, useCallback, useEffect } from "react";
import type { Square } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"] as const;

export function useCursorNavigation(
  onSelect: (square: Square) => void,
  onCancel: () => void,
  enabled: boolean = true
) {
  const [cursorFile, setCursorFile] = useState(4); // 'e'
  const [cursorRank, setCursorRank] = useState(1); // '2'

  const cursorSquare: Square = `${FILES[cursorFile]}${RANKS[cursorRank]}` as Square;

  const moveLeft = useCallback(() => {
    setCursorFile((f) => Math.max(0, f - 1));
  }, []);

  const moveRight = useCallback(() => {
    setCursorFile((f) => Math.min(7, f + 1));
  }, []);

  const moveUp = useCallback(() => {
    setCursorRank((r) => Math.min(7, r + 1));
  }, []);

  const moveDown = useCallback(() => {
    setCursorRank((r) => Math.max(0, r - 1));
  }, []);

  const select = useCallback(() => {
    onSelect(cursorSquare);
  }, [cursorSquare, onSelect]);

  const cancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  // EEG signal handler — can be called from WebSocket predictions
  const handleEEGCommand = useCallback(
    (command: string) => {
      switch (command) {
        case "left":
          moveLeft();
          break;
        case "right":
          moveRight();
          break;
        case "up":
          moveUp();
          break;
        case "down":
          moveDown();
          break;
        case "feet":
          select();
          break;
        case "rest":
          cancel();
          break;
      }
    },
    [moveLeft, moveRight, moveUp, moveDown, select, cancel]
  );

  // Keyboard controls (demo mode)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          moveLeft();
          break;
        case "ArrowRight":
          e.preventDefault();
          moveRight();
          break;
        case "ArrowUp":
          e.preventDefault();
          moveUp();
          break;
        case "ArrowDown":
          e.preventDefault();
          moveDown();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          select();
          break;
        case "Escape":
          e.preventDefault();
          cancel();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, moveLeft, moveRight, moveUp, moveDown, select, cancel]);

  return {
    cursorSquare,
    cursorFile,
    cursorRank,
    handleEEGCommand,
    moveLeft,
    moveRight,
    moveUp,
    moveDown,
  };
}
