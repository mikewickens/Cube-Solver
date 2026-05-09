import { SolverResult } from '../solver/Solver';
import { Move } from '../cube/moves';

export type BattleRun = {
  scramble: Move[];
  scrambleText: string;
  results: SolverResult[];
};

export type BattleSummary = {
  solverId: string;
  name: string;
  successRate: number;
  averageMoves: number;
  bestMoves: number;
  worstMoves: number;
  averageTime: number;
  fastestTime: number;
  slowestTime: number;
  verified: number;
  failed: number;
};
