import Cube from 'cubejs';
import { CubeState } from '../cube/CubeState';
import { Face, Move } from '../cube/moves';
import { parseMoves } from '../cube/notation';
import { verifyFromState } from '../cube/validation';

let initialized = false;

const facelets: Array<{ face: Face; position: [number, number, number] }> = [
  // U
  { face: 'U', position: [-1, 1, -1] },
  { face: 'U', position: [0, 1, -1] },
  { face: 'U', position: [1, 1, -1] },
  { face: 'U', position: [-1, 1, 0] },
  { face: 'U', position: [0, 1, 0] },
  { face: 'U', position: [1, 1, 0] },
  { face: 'U', position: [-1, 1, 1] },
  { face: 'U', position: [0, 1, 1] },
  { face: 'U', position: [1, 1, 1] },
  // R
  { face: 'R', position: [1, 1, 1] },
  { face: 'R', position: [1, 1, 0] },
  { face: 'R', position: [1, 1, -1] },
  { face: 'R', position: [1, 0, 1] },
  { face: 'R', position: [1, 0, 0] },
  { face: 'R', position: [1, 0, -1] },
  { face: 'R', position: [1, -1, 1] },
  { face: 'R', position: [1, -1, 0] },
  { face: 'R', position: [1, -1, -1] },
  // F
  { face: 'F', position: [-1, 1, 1] },
  { face: 'F', position: [0, 1, 1] },
  { face: 'F', position: [1, 1, 1] },
  { face: 'F', position: [-1, 0, 1] },
  { face: 'F', position: [0, 0, 1] },
  { face: 'F', position: [1, 0, 1] },
  { face: 'F', position: [-1, -1, 1] },
  { face: 'F', position: [0, -1, 1] },
  { face: 'F', position: [1, -1, 1] },
  // D
  { face: 'D', position: [-1, -1, 1] },
  { face: 'D', position: [0, -1, 1] },
  { face: 'D', position: [1, -1, 1] },
  { face: 'D', position: [-1, -1, 0] },
  { face: 'D', position: [0, -1, 0] },
  { face: 'D', position: [1, -1, 0] },
  { face: 'D', position: [-1, -1, -1] },
  { face: 'D', position: [0, -1, -1] },
  { face: 'D', position: [1, -1, -1] },
  // L
  { face: 'L', position: [-1, 1, -1] },
  { face: 'L', position: [-1, 1, 0] },
  { face: 'L', position: [-1, 1, 1] },
  { face: 'L', position: [-1, 0, -1] },
  { face: 'L', position: [-1, 0, 0] },
  { face: 'L', position: [-1, 0, 1] },
  { face: 'L', position: [-1, -1, -1] },
  { face: 'L', position: [-1, -1, 0] },
  { face: 'L', position: [-1, -1, 1] },
  // B
  { face: 'B', position: [1, 1, -1] },
  { face: 'B', position: [0, 1, -1] },
  { face: 'B', position: [-1, 1, -1] },
  { face: 'B', position: [1, 0, -1] },
  { face: 'B', position: [0, 0, -1] },
  { face: 'B', position: [-1, 0, -1] },
  { face: 'B', position: [1, -1, -1] },
  { face: 'B', position: [0, -1, -1] },
  { face: 'B', position: [-1, -1, -1] }
];

function stickerAt(state: CubeState, face: Face, position: [number, number, number]): Face {
  const cubie = state.cubies.find((candidate) => candidate.position.every((value, index) => value === position[index]));
  const sticker = cubie?.stickers[face];
  if (!sticker) throw new Error(`Missing ${face} sticker at ${position.join(',')}`);
  return sticker;
}

const CENTRE_POSITIONS: Record<Face, [number, number, number]> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  R: [1, 0, 0],
  L: [-1, 0, 0],
  F: [0, 0, 1],
  B: [0, 0, -1]
};

/**
 * Build a colour -> face-position label map from the current centre cubies. cubejs expects
 * the centre at each face position to label that face (centre at U-position is the U label,
 * etc.). When the user does middle-slice turns, centres rotate — so white might end up at
 * the F position. Reading the labels from the current centres makes the solver robust to
 * any centre orientation. The returned moves operate on POSITIONS, not colours, so they
 * apply directly to the cube without any translation.
 */
function buildCentreLabelMap(state: CubeState): Record<Face, Face> {
  const map = {} as Record<Face, Face>;
  for (const [face, pos] of Object.entries(CENTRE_POSITIONS) as [Face, [number, number, number]][]) {
    const cubie = state.cubies.find((c) => c.position[0] === pos[0] && c.position[1] === pos[1] && c.position[2] === pos[2]);
    const stickerColour = cubie?.stickers[face];
    if (!stickerColour) throw new Error(`Missing centre at ${face}`);
    map[stickerColour] = face;
  }
  return map;
}

export function cubeStateToCubeJsString(state: CubeState): string {
  const labelOf = buildCentreLabelMap(state);
  return facelets.map(({ face, position }) => labelOf[stickerAt(state, face, position)]).join('');
}

/**
 * Lift a 2x2 state to an equivalent 3x3 facelet string. Strategy:
 * - 2x2 has 8 corners at positions (±0.5, ±0.5, ±0.5) — multiply by 2 to map to (±1, ±1, ±1)
 *   which are exactly the 3x3 corner positions.
 * - Synthesize a 3x3 state where corners carry the 2x2 stickers, and edges/centres are solved.
 * - cubejs returns a face-turn algorithm; those moves apply directly to the 2x2 because outer
 *   face turns are identical mechanics on either size.
 */
export function lift2x2To3x3FaceletString(state2x2: CubeState): string {
  if (state2x2.n !== 2) throw new Error('lift2x2To3x3FaceletString expects n=2');
  const synth = CubeState.solved(3);
  for (const corner of state2x2.cubies) {
    const target3x3Pos: [number, number, number] = [corner.position[0] * 2, corner.position[1] * 2, corner.position[2] * 2];
    const cubie = synth.cubies.find((c) => c.position[0] === target3x3Pos[0] && c.position[1] === target3x3Pos[1] && c.position[2] === target3x3Pos[2]);
    if (!cubie) throw new Error(`No 3x3 corner at ${target3x3Pos.join(',')}`);
    cubie.stickers = { ...corner.stickers };
  }
  return cubeStateToCubeJsString(synth);
}

export function initFastSolver() {
  if (initialized) return;
  Cube.initSolver();
  initialized = true;
}

export function solveCubeState(state: CubeState): Move[] {
  if (state.isSolved()) return [];
  initFastSolver();
  const cube = Cube.fromString(cubeStateToCubeJsString(state));
  const solutionText = cube.solve(20);
  const solution = parseMoves(solutionText);
  if (!verifyFromState(state, solution)) {
    throw new Error('Solver returned a sequence that did not verify against the current cube.');
  }
  return solution;
}
