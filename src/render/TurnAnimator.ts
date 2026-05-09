import * as THREE from 'three';
import { Axis, Move, FACE_AXIS, FACE_LAYER, quarterSign } from '../cube/moves';

export type AnimationJob = {
  move: Move;
  durationMs: number;
  onComplete: () => void;
};

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function rotationForMove(move: Move) {
  const axis = FACE_AXIS[move.face];
  const layer = FACE_LAYER[move.face];
  const angle = quarterSign(move.face) * move.amount * (Math.PI / 2);
  return { axis, layer, angle };
}

export function rotationForLayerTurn(axis: Axis, layer: number, signedTurns: number) {
  return { axis, layer, angle: signedTurns * (Math.PI / 2) };
}

export function setAxisRotation(group: THREE.Group, axis: string, angle: number) {
  group.rotation.set(0, 0, 0);
  if (axis === 'x') group.rotation.x = angle;
  if (axis === 'y') group.rotation.y = angle;
  if (axis === 'z') group.rotation.z = angle;
}
