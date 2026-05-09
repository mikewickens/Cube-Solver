import { CubeState } from '../cube/CubeState';
import { Solver, SolverContext, SolverResult, timedResult } from './Solver';
import { greedyImprove } from './search';

export class GreedySolver implements Solver {
  id = 'greedy';
  name = 'Greedy Heuristic';
  description = 'Chooses locally improving turns using misplaced stickers. Fast but easily trapped.';

  solve(state: CubeState, _context: SolverContext): SolverResult {
    return timedResult(this, state, 'Local heuristic search; verified only when it genuinely solves.', 'suboptimal', () => greedyImprove(state));
  }
}
