import { describe, expect, it } from 'vitest';
import { CubeState } from '../cube/CubeState';
import { FACES, Move, invertMove, inverseMoves } from '../cube/moves';
import { formatMoves, generateScramble, parseMoves } from '../cube/notation';

describe('CubeState moves', () => {
  it('every move followed by its inverse returns to solved', () => {
    for (const face of FACES) {
      for (const amount of [1, 2, 3] as Move['amount'][]) {
        const move = { face, amount };
        expect(CubeState.solved().applyMove(move).applyMove(invertMove(move)).isSolved()).toBe(true);
      }
    }
  });

  it('four turns of any face returns to original', () => {
    for (const face of FACES) {
      expect(CubeState.solved().applyMoves([{ face, amount: 1 }, { face, amount: 1 }, { face, amount: 1 }, { face, amount: 1 }]).isSolved()).toBe(true);
    }
  });

  it('double moves work correctly', () => {
    for (const face of FACES) {
      expect(CubeState.solved().applyMove({ face, amount: 2 }).applyMove({ face, amount: 2 }).isSolved()).toBe(true);
    }
  });

  it('scramble plus inverse solves', () => {
    const scramble = parseMoves("R U R' U' F2 L D2");
    expect(CubeState.solved().applyMoves(scramble).applyMoves(inverseMoves(scramble)).isSolved()).toBe(true);
  });

  it('random scramble generation produces valid move strings', () => {
    const scramble = generateScramble(30);
    expect(parseMoves(formatMoves(scramble))).toHaveLength(30);
  });

  it('renderer layer membership can be derived from CubeState positions', () => {
    const state = CubeState.solved().applyMove({ face: 'R', amount: 1 });
    expect(state.cubies.filter((cubie) => cubie.position[0] === 1)).toHaveLength(9);
  });
});
