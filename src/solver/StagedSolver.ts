import { CubeState } from '../cube/CubeState';
import { Solver, SolverContext, SolverResult, timedResult } from './Solver';
import { idaStarSolve } from './search';

export class StagedSolver implements Solver {
  id = 'staged';
  name = 'Staged IDA*';
  description = 'Deterministic staged-style search with pruning and a conservative depth limit.';

  solve(state: CubeState, _context: SolverContext): SolverResult {
    return timedResult(this, state, 'Searches progressively deeper with pruning. More reliable on short scrambles.', 'best-found', () => {
      return state.misplacedStickerCount() <= 36 ? idaStarSolve(state, 4, 5000) ?? [] : [];
    });
  }
}
