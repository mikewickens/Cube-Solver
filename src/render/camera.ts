import * as THREE from 'three';

export function createCamera(width: number, height: number) {
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(5.4, 4.6, 6.4);
  return camera;
}
