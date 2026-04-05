import type { Move } from "chess.js";

interface MoveHistoryProps {
  moves: Move[];
}

export function MoveHistory({ moves }: MoveHistoryProps) {
  const movePairs: { number: number; white: string; black?: string }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moves[i].san,
      black: moves[i + 1]?.san,
    });
  }

  return (
    <div className="move-history">
      <h3>Moves</h3>
      <div className="move-list">
        {movePairs.length === 0 && (
          <p className="no-moves">No moves yet</p>
        )}
        {movePairs.map((pair) => (
          <div key={pair.number} className="move-pair">
            <span className="move-number">{pair.number}.</span>
            <span className="move-white">{pair.white}</span>
            {pair.black && <span className="move-black">{pair.black}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
