import { Move, sameAxis } from '../cube/moves';

export function isPruned(previous: Move | undefined, candidate: Move): boolean {
  if (!previous) return false;
  if (previous.face === candidate.face) return true;
  return sameAxis(previous.face, candidate.face) && previous.face > candidate.face;
}
