import { inverseMoves } from '../cube/moves';
import { CubeState } from '../cube/CubeState';
import { Solver, SolverContext, SolverResult, timedResult } from './Solver';

export class InverseScrambleSolver implements Solver {
  id = 'inverse';
  name = 'Inverse Scramble';
  description = 'Cheat/baseline solver that uses scramble history and returns the exact inverse.';

  solve(state: CubeState, context: SolverContext): SolverResult {
    return timedResult(this, state, 'Uses known scramble history. Great for debugging, not a fair solver.', 'baseline-cheat', () =>
      inverseMoves(context.scramble)
    );
  }
}
