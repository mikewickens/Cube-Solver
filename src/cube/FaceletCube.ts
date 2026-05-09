import { CubeState } from './CubeState';
import { FACE_COLORS, Face } from './moves';

export function faceletSummary(state: CubeState): Record<Face, string[]> {
  const out = { U: [], D: [], F: [], B: [], R: [], L: [] } as Record<Face, string[]>;
  for (const cubie of state.cubies) {
    for (const [face, color] of Object.entries(cubie.stickers) as [Face, Face][]) out[face].push(FACE_COLORS[color]);
  }
  return out;
}
