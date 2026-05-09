import { FACES, Move, moveToString } from './moves';

const TOKEN = /^([UDLRFB])([2']?)$/;

export function parseMove(token: string): Move {
  const match = token.trim().match(TOKEN);
  if (!match) throw new Error(`Invalid move token: ${token}`);
  return {
    face: match[1] as Move['face'],
    amount: match[2] === '2' ? 2 : match[2] === "'" ? 3 : 1
  };
}

export function parseMoves(input: string): Move[] {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parseMove);
}

export function formatMoves(moves: Move[]): string {
  return moves.map(moveToString).join(' ');
}

export function generateScramble(length = 25): Move[] {
  const moves: Move[] = [];
  let previousFace: Move['face'] | undefined;
  let previousAxis: string | undefined;
  const axisOf = (face: Move['face']) => (face === 'U' || face === 'D' ? 'y' : face === 'L' || face === 'R' ? 'x' : 'z');
  while (moves.length < length) {
    const face = FACES[Math.floor(Math.random() * FACES.length)];
    const axis = axisOf(face);
    if (face === previousFace || (axis === previousAxis && Math.random() < 0.55)) continue;
    const amount = [1, 2, 3][Math.floor(Math.random() * 3)] as Move['amount'];
    moves.push({ face, amount });
    previousFace = face;
    previousAxis = axis;
  }
  return moves;
}
