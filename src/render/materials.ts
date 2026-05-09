import * as THREE from 'three';
import { FACE_COLORS, Face } from '../cube/moves';

export const bodyMaterial = new THREE.MeshStandardMaterial({
  color: '#0a0a0a',
  roughness: 0.7,
  metalness: 0.05
});

export function stickerMaterial(face: Face) {
  return new THREE.MeshStandardMaterial({
    color: FACE_COLORS[face],
    roughness: 0.38,
    metalness: 0.0,
    emissive: FACE_COLORS[face],
    emissiveIntensity: 0.04
  });
}
