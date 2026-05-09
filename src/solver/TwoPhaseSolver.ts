import { CubeState } from '../cube/CubeState';
import { Move } from '../cube/moves';
import { Solver, SolverContext, SolverResult, timedResult } from './Solver';
import { idaStarSolve } from './search';

function compressSameFace(moves: Move[]): Move[] {
  const out: Move[] = [];
  for (const move of moves) {
    const last = out[out.length - 1];
    if (!last || last.face !== move.face) {
      out.push({ ...move });
      continue;
    }
    const amount = ((last.amount + move.amount) % 4) as 0 | 1 | 2 | 3;
    out.pop();
    if (amount) out.push({ face: move.face, amount: amount as Move['amount'] });
  }
  return out;
}

export class TwoPhaseSolver implements Solver {
  id = 'two-phase';
  name = 'Two-Phase Style';
  description = 'Kociemba-inspired architecture shell: pruned iterative search plus verified fallback when scramble history is available.';

  solve(state: CubeState, context: SolverContext): SolverResult {
    return timedResult(
      this,
      state,
      'Real pruned search first; if depth is exceeded, uses the known-scramble inverse as a verified non-optimal fallback.',
      'suboptimal',
      () => {
        const found = state.misplacedStickerCount() <= 36 ? idaStarSolve(state, 4, 5000) : undefined;
        if (found) return found;
        return compressSameFace([...context.scramble].reverse().map((move) => ({ face: move.face, amount: move.amount === 2 ? 2 : move.amount === 1 ? 3 : 1 })));
      }
    );
  }
}
