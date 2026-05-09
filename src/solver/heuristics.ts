import { CubeState } from '../cube/CubeState';

export function stickerLowerBound(state: CubeState): number {
  return Math.ceil(state.misplacedStickerCount() / 12);
}

export function solvedScore(state: CubeState): number {
  return -state.misplacedStickerCount();
}
