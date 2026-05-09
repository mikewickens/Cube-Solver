import { CubeState } from '../cube/CubeState';
import { FACES, Move } from '../cube/moves';
import { stickerLowerBound } from './heuristics';
import { isPruned } from './pruning';

const CANDIDATES: Move[] = FACES.flatMap((face) => [
  { face, amount: 1 as const },
  { face, amount: 2 as const },
  { face, amount: 3 as const }
]);

export function idaStarSolve(start: CubeState, maxDepth: number, maxNodes = 120000): Move[] | undefined {
  let nodes = 0;
  const path: Move[] = [];
  const seen = new Set<string>();

  function dfs(state: CubeState, depthLeft: number, previous?: Move): boolean {
    nodes++;
    if (nodes > maxNodes) return false;
    const h = stickerLowerBound(state);
    if (h > depthLeft) return false;
    if (state.isSolved()) return true;
    if (depthLeft === 0) return false;
    seen.add(state.key());
    for (const move of CANDIDATES) {
      if (isPruned(previous, move)) continue;
      const next = state.clone().applyMove(move);
      const key = next.key();
      if (seen.has(key)) continue;
      path.push(move);
      if (dfs(next, depthLeft - 1, move)) return true;
      path.pop();
      seen.delete(key);
    }
    return false;
  }

  for (let depth = stickerLowerBound(start); depth <= maxDepth; depth++) {
    nodes = 0;
    path.length = 0;
    seen.clear();
    if (dfs(start.clone(), depth)) return [...path];
  }
  return undefined;
}

export function greedyImprove(start: CubeState, maxSteps = 80): Move[] {
  let state = start.clone();
  const moves: Move[] = [];
  let previous: Move | undefined;
  for (let i = 0; i < maxSteps && !state.isSolved(); i++) {
    let bestMove: Move | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const move of CANDIDATES) {
      if (isPruned(previous, move)) continue;
      const score = state.clone().applyMove(move).misplacedStickerCount();
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    if (!bestMove || bestScore >= state.misplacedStickerCount()) break;
    state = state.applyMove(bestMove);
    moves.push(bestMove);
    previous = bestMove;
  }
  return moves;
}
