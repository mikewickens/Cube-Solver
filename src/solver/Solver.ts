import { CubeState } from '../cube/CubeState';
import { Move } from '../cube/moves';
import { verifyFromState } from '../cube/validation';

export type SolverStatus = 'verified' | 'failed';
export type ProofLabel = 'baseline-cheat' | 'suboptimal' | 'best-found' | 'optimal-proven' | 'failed';

export type SolverContext = {
  scramble: Move[];
  scrambleText: string;
};

export type SolverResult = {
  solverId: string;
  solverName: string;
  notes: string;
  moves: Move[];
  moveCount: number;
  durationMs: number;
  verified: boolean;
  status: SolverStatus;
  proof: ProofLabel;
};

export interface Solver {
  id: string;
  name: string;
  description: string;
  solve(state: CubeState, context: SolverContext): SolverResult;
}

export function timedResult(
  solver: Pick<Solver, 'id' | 'name'>,
  state: CubeState,
  notes: string,
  proof: ProofLabel,
  run: () => Move[]
): SolverResult {
  const start = performance.now();
  let moves: Move[] = [];
  try {
    moves = run();
  } catch {
    moves = [];
  }
  const durationMs = performance.now() - start;
  const verified = moves.length > 0 ? verifyFromState(state, moves) : state.isSolved();
  return {
    solverId: solver.id,
    solverName: solver.name,
    notes,
    moves,
    moveCount: moves.length,
    durationMs,
    verified,
    status: verified ? 'verified' : 'failed',
    proof: verified ? proof : 'failed'
  };
}
