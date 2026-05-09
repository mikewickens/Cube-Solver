import { describe, expect, it } from 'vitest';
import { CubeState } from '../cube/CubeState';
import { parseMoves } from '../cube/notation';
import { verifyFromState, verifySolution } from '../cube/validation';
import { GreedySolver } from '../solver/GreedySolver';
import { InverseScrambleSolver } from '../solver/InverseScrambleSolver';
import { StagedSolver } from '../solver/StagedSolver';
import { TwoPhaseSolver } from '../solver/TwoPhaseSolver';
import Cube from 'cubejs';
import { cubeStateToCubeJsString, solveCubeState } from '../solver/CubeJsSolver';
import { formatMoves } from '../cube/notation';

describe('solvers', () => {
  it('converts CubeState to cubejs facelets with matching move semantics', () => {
    for (const alg of ['U', 'R', 'F', 'D', 'L', 'B', "R U F' D2 L B'"]) {
      const moves = parseMoves(alg);
      const ours = CubeState.solved().applyMoves(moves);
      const cube = new Cube();
      cube.move(formatMoves(moves));
      expect(cubeStateToCubeJsString(ours)).toBe(cube.asString());
    }
  });

  it('cubejs solver solves without using inverse scramble history', () => {
    const scramble = parseMoves("R U F' D2 L B'");
    const state = CubeState.solved().applyMoves(scramble);
    const solution = solveCubeState(state);
    expect(solution.length).toBeGreaterThan(0);
    expect(verifyFromState(state, solution)).toBe(true);
  });

  it('inverse solver solves a known scramble', () => {
    const scramble = parseMoves("R U R'");
    const state = CubeState.solved().applyMoves(scramble);
    const result = new InverseScrambleSolver().solve(state, { scramble, scrambleText: "R U R'" });
    expect(result.verified).toBe(true);
    expect(verifySolution(scramble, result.moves)).toBe(true);
  });

  it('greedy solver output is rejected when wrong and accepted when solved', () => {
    const scramble = parseMoves('R');
    const state = CubeState.solved().applyMoves(scramble);
    const result = new GreedySolver().solve(state, { scramble, scrambleText: 'R' });
    expect(result.verified).toBe(verifyFromState(state, result.moves));
    expect(verifyFromState(state, parseMoves('U'))).toBe(false);
  });

  it('staged solver solves simple scrambles', () => {
    const scramble = parseMoves('R U');
    const state = CubeState.solved().applyMoves(scramble);
    const result = new StagedSolver().solve(state, { scramble, scrambleText: 'R U' });
    expect(result.verified).toBe(true);
  });

  it('two-phase style solver always verifies its returned fallback on scramble-derived states', () => {
    const scramble = parseMoves("R U F2 L' D");
    const state = CubeState.solved().applyMoves(scramble);
    const result = new TwoPhaseSolver().solve(state, { scramble, scrambleText: "R U F2 L' D" });
    expect(result.verified).toBe(true);
  });
});
