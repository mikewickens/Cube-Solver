export const FACES = ['U', 'D', 'L', 'R', 'F', 'B'] as const;
export type Face = (typeof FACES)[number];
export type Axis = 'x' | 'y' | 'z';
export type Vec3 = readonly [number, number, number];

export type Move = {
  face: Face;
  amount: 1 | 2 | 3;
};

export const FACE_COLORS: Record<Face, string> = {
  U: '#f8fafc',
  D: '#facc15',
  F: '#22c55e',
  B: '#2563eb',
  R: '#ef4444',
  L: '#f97316'
};

export const FACE_NORMALS: Record<Face, Vec3> = {
  R: [1, 0, 0],
  L: [-1, 0, 0],
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1]
};

export const FACE_AXIS: Record<Face, Axis> = {
  R: 'x',
  L: 'x',
  U: 'y',
  D: 'y',
  F: 'z',
  B: 'z'
};

export const FACE_LAYER: Record<Face, number> = {
  R: 1,
  L: -1,
  U: 1,
  D: -1,
  F: 1,
  B: -1
};

/** Outer face layer for an NxN cube. R/U/F → +(n-1)/2, L/D/B → -(n-1)/2. */
export function outerLayerForFace(face: Face, n: number): number {
  const edge = (n - 1) / 2;
  return (face === 'R' || face === 'U' || face === 'F') ? edge : -edge;
}

export function quarterSign(face: Face): 1 | -1 {
  return face === 'R' || face === 'U' || face === 'F' ? -1 : 1;
}

export function sameAxis(a: Face, b: Face) {
  return FACE_AXIS[a] === FACE_AXIS[b];
}

export function moveToString(move: Move): string {
  return `${move.face}${move.amount === 1 ? '' : move.amount === 2 ? '2' : "'"}`;
}

export function invertMove(move: Move): Move {
  return { face: move.face, amount: move.amount === 2 ? 2 : move.amount === 1 ? 3 : 1 };
}

export function inverseMoves(moves: Move[]): Move[] {
  return [...moves].reverse().map(invertMove);
}

export function normalizeTurns(amount: number): 0 | 1 | 2 | 3 {
  const turns = ((amount % 4) + 4) % 4;
  return turns as 0 | 1 | 2 | 3;
}
