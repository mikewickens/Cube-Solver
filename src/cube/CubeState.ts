import { Axis, FACE_AXIS, FACE_NORMALS, Face, Move, Vec3, normalizeTurns, outerLayerForFace, quarterSign } from './moves';

export type StickerMap = Partial<Record<Face, Face>>;

export type Cubie = {
  id: string;
  position: [number, number, number];
  stickers: StickerMap;
};

const normalToFace = new Map<string, Face>(
  Object.entries(FACE_NORMALS).map(([face, normal]) => [normal.join(','), face as Face])
);

function rotateVec(vec: Vec3, axis: Axis, turns: number): [number, number, number] {
  let [x, y, z] = vec;
  for (let i = 0; i < normalizeTurns(turns); i++) {
    if (axis === 'x') [y, z] = [-z, y];
    if (axis === 'y') [x, z] = [z, -x];
    if (axis === 'z') [x, y] = [-y, x];
  }
  return [x, y, z];
}

function faceAfterRotation(face: Face, axis: Axis, turns: number): Face {
  const rotated = rotateVec(FACE_NORMALS[face], axis, turns).join(',');
  const next = normalToFace.get(rotated);
  if (!next) throw new Error(`No face for rotated normal ${rotated}`);
  return next;
}

function cubieAt(x: number, y: number, z: number, edge: number): Cubie {
  const stickers: StickerMap = {};
  if (y === edge) stickers.U = 'U';
  if (y === -edge) stickers.D = 'D';
  if (z === edge) stickers.F = 'F';
  if (z === -edge) stickers.B = 'B';
  if (x === edge) stickers.R = 'R';
  if (x === -edge) stickers.L = 'L';
  return { id: `${x},${y},${z}`, position: [x, y, z], stickers };
}

/**
 * Generic NxN cube state. Cubie positions use centred lattice coords:
 *   n=2 → {-0.5, 0.5}
 *   n=3 → {-1, 0, 1}
 *   n=4 → {-1.5, -0.5, 0.5, 1.5}
 * Outer layer for U/R/F is +(n-1)/2; D/L/B is -(n-1)/2.
 */
export class CubeState {
  readonly n: number;
  cubies: Cubie[];

  constructor(nOrCubies?: number | Cubie[], cubiesArg?: Cubie[]) {
    // Backward-compatible: `new CubeState()` and `new CubeState(cubies)` default to n=3.
    let n = 3;
    let cubies: Cubie[] | undefined;
    if (typeof nOrCubies === 'number') {
      n = nOrCubies;
      cubies = cubiesArg;
    } else if (Array.isArray(nOrCubies)) {
      cubies = nOrCubies;
    }
    this.n = n;
    this.cubies = cubies
      ? cubies.map((c) => ({ id: c.id, position: [...c.position], stickers: { ...c.stickers } }))
      : CubeState.solved(n).cubies;
  }

  static solved(n = 3): CubeState {
    const cubies: Cubie[] = [];
    const edge = (n - 1) / 2;
    const coords: number[] = [];
    for (let i = 0; i < n; i++) coords.push(i - edge);
    for (const x of coords) for (const y of coords) for (const z of coords) {
      // Skip fully-internal cubies (no visible stickers) — invisible and irrelevant to state.
      if (Math.abs(x) !== edge && Math.abs(y) !== edge && Math.abs(z) !== edge) continue;
      cubies.push(cubieAt(x, y, z, edge));
    }
    return new CubeState(n, cubies);
  }

  clone() {
    return new CubeState(this.n, this.cubies);
  }

  applyMove(move: Move): CubeState {
    return this.applyLayerTurn(FACE_AXIS[move.face], outerLayerForFace(move.face, this.n), quarterSign(move.face) * move.amount);
  }

  applyLayerTurn(axis: Axis, layer: number, signedTurns: number): CubeState {
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    for (const cubie of this.cubies) {
      if (cubie.position[axisIndex] !== layer) continue;
      cubie.position = rotateVec(cubie.position, axis, signedTurns);
      const next: StickerMap = {};
      for (const [normalFace, colorFace] of Object.entries(cubie.stickers) as [Face, Face][]) {
        next[faceAfterRotation(normalFace, axis, signedTurns)] = colorFace;
      }
      cubie.stickers = next;
    }
    return this;
  }

  applyMoves(moves: Move[]): CubeState {
    moves.forEach((move) => this.applyMove(move));
    return this;
  }

  equals(other: CubeState): boolean {
    return this.n === other.n && this.key() === other.key();
  }

  key(): string {
    return this.cubies
      .map((cubie) => `${cubie.position.join(',')}:${Object.entries(cubie.stickers).sort().map(([f, c]) => `${f}${c}`).join('')}`)
      .sort()
      .join('|');
  }

  isSolved(): boolean {
    return this.equals(CubeState.solved(this.n));
  }

  misplacedStickerCount(): number {
    let count = 0;
    for (const cubie of this.cubies) {
      for (const [face, color] of Object.entries(cubie.stickers) as [Face, Face][]) if (face !== color) count++;
    }
    return count;
  }

  getCubie(id: string): Cubie | undefined {
    return this.cubies.find((cubie) => cubie.id === id);
  }
}
