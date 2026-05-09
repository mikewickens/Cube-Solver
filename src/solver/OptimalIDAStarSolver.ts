import { CubeState } from '../cube/CubeState';
import { Solver, SolverContext, SolverResult, timedResult } from './Solver';
import { idaStarSolve } from './search';

export class OptimalIDAStarSolver implements Solver {
  id = 'optimal';
  name = 'Optimal Search';
  description = 'Optional IDA* proof search. It only claims optimality when it proves a solution within its depth budget.';

  solve(state: CubeState, _context: SolverContext): SolverResult {
    return timedResult(this, state, 'Attempts a proof up to depth 4; failure is reported honestly.', 'optimal-proven', () =>
      state.misplacedStickerCount() <= 30 ? idaStarSolve(state, 4, 5000) ?? [] : []
    );
  }
}
