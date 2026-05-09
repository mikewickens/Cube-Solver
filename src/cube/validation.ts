import { CubeState } from './CubeState';
import { Move } from './moves';

export function verifySolution(scramble: Move[], solution: Move[]): boolean {
  return CubeState.solved().applyMoves(scramble).applyMoves(solution).isSolved();
}

export function verifyFromState(state: CubeState, solution: Move[]): boolean {
  return state.clone().applyMoves(solution).isSolved();
}
