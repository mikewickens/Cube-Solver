import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CubeState, Cubie } from '../cube/CubeState';
import { Axis, FACE_AXIS, FACE_LAYER, FACE_NORMALS, Face, Move } from '../cube/moves';
import { createCamera } from './camera';
import { bodyMaterial, stickerMaterial } from './materials';
import { easeInOutCubic, rotationForLayerTurn, rotationForMove, setAxisRotation } from './TurnAnimator';

type CubieView = {
  id: string;
  group: THREE.Group;
};

type ShowcaseItem = {
  group: THREE.Group;
  homePosition: THREE.Vector3;
  startPosition: THREE.Vector3;
  lanePosition: THREE.Vector3;
  homeRotation: THREE.Euler;
  startRotation: THREE.Euler;
  spin: THREE.Vector3;
  delay: number;
};

export type LayerTurn = {
  axis: Axis;
  layer: number;
  signedTurns: number;
  label: string;
};

const NORMAL_ROTATION: Record<Face, [number, number, number]> = {
  U: [-Math.PI / 2, 0, 0],
  D: [Math.PI / 2, 0, 0],
  F: [0, 0, 0],
  B: [0, Math.PI, 0],
  R: [0, Math.PI / 2, 0],
  L: [0, -Math.PI / 2, 0]
};

export class CubeRenderer {
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  root = new THREE.Group();
  pivot = new THREE.Group();
  cubies = new Map<string, CubieView>();
  highlight: THREE.Mesh;
  private n: number;
  private unit: number;
  private cubieSize: number;
  private stickerSize: number;
  private active?: { turn: LayerTurn; start: number; duration: number; cubies: THREE.Group[]; complete: () => void };
  private showcase?: {
    start: number;
    duration: number;
    items: ShowcaseItem[];
    particles: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
    ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
    complete: () => void;
  };
  private logical: CubeState;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private dragStart?: { x: number; y: number; face: Face; position: [number, number, number] };
  private interactive = true;
  onManualMove?: (turn: LayerTurn) => void;

  constructor(private host: HTMLElement, n = 3) {
    this.n = n;
    this.unit = 3.12 / n;
    // Tight gap between cubies (≈0.04 world units) so the body looks like one solid plastic cube,
    // matching a real Rubik's cube where the seams are thin.
    this.cubieSize = this.unit - 0.04;
    // Stickers fill ~85% of the cubie face, leaving a thin black border (the iconic look).
    this.stickerSize = this.cubieSize * 0.86;
    this.logical = CubeState.solved(n);
    const highlightSize = n * this.unit + 0.4;
    this.highlight = new THREE.Mesh(
      new THREE.BoxGeometry(highlightSize, highlightSize, highlightSize),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.08, depthWrite: false })
    );
    this.camera = createCamera(host.clientWidth || 900, host.clientHeight || 640);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(host.clientWidth || 900, host.clientHeight || 640);
    this.renderer.shadowMap.enabled = true;
    this.host.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.scene.add(this.root);
    this.scene.add(this.pivot);
    this.setupScene();
    this.buildCubies(this.logical);
    this.syncToState(this.logical);
    window.addEventListener('resize', this.resize);
    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.handlePointerCancel);
    this.animate();
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerCancel);
    this.renderer.dispose();
    this.host.replaceChildren();
  }

  setInteractive(enabled: boolean) {
    this.interactive = enabled;
    this.controls.enabled = enabled;
  }

  setState(state: CubeState) {
    this.logical = state.clone();
    this.syncToState(this.logical);
  }

  animateMove(stateBefore: CubeState, move: Move, durationMs: number): Promise<void> {
    const { axis, layer } = rotationForMove(move);
    return this.animateLayerTurn(stateBefore, { axis, layer, signedTurns: quarterTurnsForMove(move), label: move.face + (move.amount === 2 ? '2' : move.amount === 3 ? "'" : '') }, durationMs);
  }

  animateLayerTurn(stateBefore: CubeState, turn: LayerTurn, durationMs: number): Promise<void> {
    if (this.active || this.showcase) return Promise.resolve();
    this.setState(stateBefore);
    const { axis, layer } = turn;
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const selected = [...this.cubies.values()].filter(
      (view) => Math.abs(view.group.position.getComponent(axisIndex) / this.unit - layer) < 1e-6
    );
    selected.forEach((view) => this.pivot.attach(view.group));
    this.root.add(this.highlight);
    const sliceThickness = this.unit / (this.n * this.unit + 0.4);
    this.highlight.scale.set(
      axis === 'x' ? sliceThickness : 1,
      axis === 'y' ? sliceThickness : 1,
      axis === 'z' ? sliceThickness : 1
    );
    this.highlight.position.set(
      axis === 'x' ? layer * this.unit : 0,
      axis === 'y' ? layer * this.unit : 0,
      axis === 'z' ? layer * this.unit : 0
    );
    return new Promise((resolve) => {
      this.active = { turn, start: performance.now(), duration: durationMs, cubies: selected.map((s) => s.group), complete: resolve };
    });
  }

  playAssemblyShowcase(state = CubeState.solved(3), durationMs = 6400): Promise<void> {
    if (this.active || this.showcase || this.n !== 3) return Promise.resolve();
    this.setState(state);
    this.root.rotation.set(0, 0, 0);

    const orderedCubies = [...this.cubies.values()].sort((a, b) => a.id.localeCompare(b.id));
    const items = orderedCubies.map((view, index) => {
      const homePosition = view.group.position.clone();
      const homeRotation = view.group.rotation.clone();
      const direction = homePosition.lengthSq() > 0.001
        ? homePosition.clone().normalize()
        : new THREE.Vector3(0, 1, 0);
      const ring = index % 9;
      const band = Math.floor(index / 9);
      const angle = (ring / 9) * Math.PI * 2 + band * 0.36;
      const lanePosition = new THREE.Vector3(
        Math.cos(angle) * (4.15 + band * 0.52),
        (band - 1) * 1.65 + Math.sin(angle * 2) * 0.28,
        Math.sin(angle) * (4.15 + band * 0.52)
      );
      const startPosition = lanePosition.clone().add(direction.multiplyScalar(1.15));
      const startRotation = new THREE.Euler(
        homeRotation.x + (band + 1) * Math.PI * 0.46,
        homeRotation.y + (ring % 3 - 1) * Math.PI * 0.62,
        homeRotation.z + (index % 2 === 0 ? 1 : -1) * Math.PI * 0.42
      );
      const spin = new THREE.Vector3(
        (band - 1) * Math.PI * 0.45,
        (ring % 3 - 1) * Math.PI * 0.35,
        (index % 2 === 0 ? 1 : -1) * Math.PI * 0.3
      );
      return {
        group: view.group,
        homePosition,
        startPosition,
        lanePosition,
        homeRotation,
        startRotation,
        spin,
        delay: (ring / 9) * 0.16 + band * 0.035
      };
    });

    const particles = this.makeShowcaseParticles();
    const ring = this.makeShowcaseRing();
    this.scene.add(particles);
    this.scene.add(ring);

    return new Promise((resolve) => {
      this.showcase = {
        start: performance.now(),
        duration: durationMs,
        items,
        particles,
        ring,
        complete: resolve
      };
    });
  }

  finishMove(nextState: CubeState) {
    this.active?.cubies.forEach((group) => this.root.attach(group));
    this.pivot.rotation.set(0, 0, 0);
    this.root.remove(this.highlight);
    this.active = undefined;
    this.setState(nextState);
  }

  private setupScene() {
    this.scene.background = new THREE.Color('#080b12');
    this.scene.fog = new THREE.Fog('#080b12', 12, 24);
    const hemi = new THREE.HemisphereLight('#dbeafe', '#111827', 2.5);
    const key = new THREE.DirectionalLight('#ffffff', 3.2);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    const rim = new THREE.DirectionalLight('#38bdf8', 1.2);
    rim.position.set(-4, 2, -5);
    this.scene.add(hemi, key, rim);
  }

  private makeShowcaseParticles() {
    const count = 180;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1.6 + Math.random() * 4.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#67e8f9',
      size: 0.055,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return new THREE.Points(geometry, material);
  }

  private makeShowcaseRing() {
    const geometry = new THREE.TorusGeometry(2.45, 0.018, 8, 128);
    const material = new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    return ring;
  }

  private buildCubies(state: CubeState) {
    const cubeGeo = new THREE.BoxGeometry(this.cubieSize, this.cubieSize, this.cubieSize, 6, 6, 6);
    state.cubies.forEach((cubie) => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(cubeGeo, bodyMaterial);
      body.userData = { cubieId: cubie.id };
      body.castShadow = true;
      body.receiveShadow = true;
      group.add(body);
      for (const [normalFace, colorFace] of Object.entries(cubie.stickers) as [Face, Face][]) {
        group.add(this.makeSticker(normalFace, colorFace));
      }
      this.root.add(group);
      this.cubies.set(cubie.id, { id: cubie.id, group });
    });
  }

  private makeSticker(normal: Face, color: Face) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(this.stickerSize, this.stickerSize, 0.035), stickerMaterial(color));
    const [rx, ry, rz] = NORMAL_ROTATION[normal];
    mesh.rotation.set(rx, ry, rz);
    const [x, y, z] = FACE_NORMALS[normal];
    const offset = this.cubieSize / 2 + 0.005;
    mesh.position.set(x * offset, y * offset, z * offset);
    mesh.userData = { stickerFace: normal };
    return mesh;
  }

  private faceFromIntersection(intersection: THREE.Intersection): Face | undefined {
    if (intersection.object.userData.stickerFace) return intersection.object.userData.stickerFace as Face;
    if (!intersection.face) return undefined;
    const normal = intersection.face.normal.clone().transformDirection(intersection.object.matrixWorld);
    const entries = Object.entries(FACE_NORMALS) as [Face, readonly [number, number, number]][];
    return entries
      .map(([face, vec]) => ({ face, score: normal.dot(new THREE.Vector3(vec[0], vec[1], vec[2])) }))
      .sort((a, b) => b.score - a.score)[0]?.face;
  }

  private pickDragTarget(event: PointerEvent): { face: Face; position: [number, number, number] } | undefined {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.root.children, true);
    const hit = intersects.find((candidate) => candidate.object instanceof THREE.Mesh);
    if (!hit) return undefined;
    const face = this.faceFromIntersection(hit);
    const cubieGroup = this.findCubieGroup(hit.object);
    if (!face || !cubieGroup) return undefined;
    const edge = (this.n - 1) / 2;
    const snap = (v: number) => {
      // Convert from world to centred lattice coord and snap to the nearest valid layer.
      const raw = v / this.unit;
      const snapped = Math.round(raw - edge) + edge; // integer offsets from -edge
      return Math.min(edge, Math.max(-edge, snapped));
    };
    return {
      face,
      position: [snap(cubieGroup.position.x), snap(cubieGroup.position.y), snap(cubieGroup.position.z)]
    };
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (!this.interactive || this.active || event.button !== 0) return;
    const target = this.pickDragTarget(event);
    if (!target) {
      this.dragStart = undefined;
      return;
    }
    this.dragStart = { x: event.clientX, y: event.clientY, face: target.face, position: target.position };
    this.controls.enabled = false;
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (!this.dragStart) return;
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;
    const distance = Math.hypot(dx, dy);
    const start = this.dragStart;
    this.dragStart = undefined;
    this.controls.enabled = this.interactive;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
    if (distance < 18) return;
    this.onManualMove?.(this.dragToLayerTurn(start.face, start.position, dx, dy));
  };

  private handlePointerCancel = (event: PointerEvent) => {
    this.dragStart = undefined;
    this.controls.enabled = this.interactive;
    if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
  };

  private findCubieGroup(object: THREE.Object3D): THREE.Group | undefined {
    let current: THREE.Object3D | null = object;
    while (current && current.parent !== this.root) current = current.parent;
    return current instanceof THREE.Group ? current : undefined;
  }

  private dragToLayerTurn(face: Face, position: [number, number, number], dx: number, dy: number): LayerTurn {
    const faceNormal = new THREE.Vector3(...FACE_NORMALS[face]);
    const faceAxisStr = FACE_AXIS[face];

    // The two candidate rotation axes are the ones perpendicular to the face normal.
    const candidates = (['x', 'y', 'z'] as Axis[]).filter(a => a !== faceAxisStr);

    // Project the world origin into NDC so we can compute screen-space directions.
    const p0 = new THREE.Vector3(0, 0, 0).project(this.camera);

    let bestAxis = candidates[0];
    let bestLayer = 0;
    let bestSign: 1 | -1 = 1;
    let bestScore = -Infinity;

    for (const axis of candidates) {
      const axisVec = new THREE.Vector3(
        axis === 'x' ? 1 : 0,
        axis === 'y' ? 1 : 0,
        axis === 'z' ? 1 : 0
      );

      // For a positive rotation around axisVec, points on the face move in this world direction:
      //   tangent = axisVec × faceNormal
      const moveWorldDir = axisVec.clone().cross(faceNormal);

      // Project that world-space tip through the camera to get the screen-space direction.
      // NDC Y is up, screen Y is down, so flip Y.
      const p1 = moveWorldDir.clone().project(this.camera);
      const screenDx = p1.x - p0.x;
      const screenDy = -(p1.y - p0.y);

      // Dot with the actual drag delta to see how well this rotation matches the user's intent.
      const dot = screenDx * dx + screenDy * dy;
      const score = Math.abs(dot);

      if (score > bestScore) {
        bestScore = score;
        bestAxis = axis;
        const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
        const raw = position[axisIndex];
        const edge = (this.n - 1) / 2;
        if (this.n === 2) {
          // 2x2: only outer layers exist.
          bestLayer = raw > 0 ? edge : -edge;
        } else {
          // 3x3 and larger: any valid layer is allowed (including middle slices on 3x3).
          bestLayer = raw;
        }
        bestSign = dot > 0 ? 1 : -1;
      }
    }

    return { axis: bestAxis, layer: bestLayer, signedTurns: bestSign, label: this.layerTurnLabel(bestAxis, bestLayer, bestSign) };
  }

  private layerTurnLabel(axis: Axis, layer: number, sign: 1 | -1) {
    const edge = (this.n - 1) / 2;
    const isOuter = Math.abs(layer) === edge;
    let base: string;
    if (isOuter) {
      base =
        axis === 'x' ? (layer > 0 ? 'R' : 'L') :
        axis === 'y' ? (layer > 0 ? 'U' : 'D') :
        layer > 0 ? 'F' : 'B';
    } else if (this.n === 3 && layer === 0) {
      // Standard middle-slice notation for the 3x3.
      base = axis === 'x' ? 'M' : axis === 'y' ? 'E' : 'S';
    } else {
      // Inner-slice notation for 4x4+: lower-case faceish label.
      const side =
        axis === 'x' ? (layer >= 0 ? 'r' : 'l') :
        axis === 'y' ? (layer >= 0 ? 'u' : 'd') :
        layer >= 0 ? 'f' : 'b';
      base = side;
    }
    return `${base}${sign === -1 ? "'" : ''}`;
  }

  private rebuildStickers(view: CubieView, cubie: Cubie) {
    while (view.group.children.length > 1) view.group.remove(view.group.children[1]);
    for (const [normalFace, colorFace] of Object.entries(cubie.stickers) as [Face, Face][]) view.group.add(this.makeSticker(normalFace, colorFace));
  }

  private syncToState(state: CubeState) {
    for (const cubie of state.cubies) {
      const view = this.cubies.get(cubie.id);
      if (!view) continue;
      view.group.position.set(cubie.position[0] * this.unit, cubie.position[1] * this.unit, cubie.position[2] * this.unit);
      view.group.rotation.set(0, 0, 0);
      this.rebuildStickers(view, cubie);
    }
  }

  private resize = () => {
    const width = this.host.clientWidth || 900;
    const height = this.host.clientHeight || 640;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    requestAnimationFrame(this.animate);
    if (this.active) {
      const { axis, angle } = rotationForLayerTurn(this.active.turn.axis, this.active.turn.layer, this.active.turn.signedTurns);
      const t = Math.min(1, (performance.now() - this.active.start) / this.active.duration);
      setAxisRotation(this.pivot, axis, angle * easeInOutCubic(t));
      if (t >= 1) this.active.complete();
    }
    if (this.showcase) this.updateShowcase();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateShowcase() {
    if (!this.showcase) return;
    const elapsed = performance.now() - this.showcase.start;
    const t = Math.min(1, elapsed / this.showcase.duration);
    const scatterEnd = 0.28;
    const gatherStart = 0.36;
    const gatherLength = 0.58;
    const tumble = Math.sin(t * Math.PI);
    const micro = Math.sin(t * Math.PI * 4) * 0.08 * tumble;

    this.root.rotation.set(
      tumble * 0.72 + micro,
      tumble * Math.PI * 1.22,
      Math.sin(t * Math.PI * 1.4) * 0.42 * tumble
    );

    for (const item of this.showcase.items) {
      if (t < scatterEnd) {
        const explode = smootherStep(t / scatterEnd);
        item.group.position.lerpVectors(item.homePosition, item.startPosition, explode);
        item.group.rotation.set(
          item.homeRotation.x + (item.startRotation.x - item.homeRotation.x) * explode,
          item.homeRotation.y + (item.startRotation.y - item.homeRotation.y) * explode,
          item.homeRotation.z + (item.startRotation.z - item.homeRotation.z) * explode
        );
        continue;
      }

      if (t < gatherStart) {
        const orbit = (t - scatterEnd) / (gatherStart - scatterEnd);
        item.group.position.copy(item.startPosition).lerp(item.lanePosition, smootherStep(orbit));
        item.group.rotation.set(
          item.startRotation.x + item.spin.x * orbit * 0.25,
          item.startRotation.y + item.spin.y * orbit * 0.25,
          item.startRotation.z + item.spin.z * orbit * 0.25
        );
        continue;
      }

      const local = clamp01((t - gatherStart - item.delay) / (gatherLength - item.delay));
      const settle = smootherStep(local);
      const arc = Math.sin(local * Math.PI) * 0.28;
      const laneDrift = new THREE.Vector3(
        Math.sin((item.delay + t) * Math.PI * 2) * 0.08,
        arc,
        Math.cos((item.delay + t) * Math.PI * 2) * 0.08
      ).multiplyScalar(1 - settle);
      item.group.position.lerpVectors(item.lanePosition, item.homePosition, settle).add(laneDrift);
      item.group.rotation.set(
        item.startRotation.x * (1 - settle) + item.homeRotation.x * settle + item.spin.x * (1 - local) * 0.18,
        item.startRotation.y * (1 - settle) + item.homeRotation.y * settle + item.spin.y * (1 - local) * 0.18,
        item.startRotation.z * (1 - settle) + item.homeRotation.z * settle + item.spin.z * (1 - local) * 0.18
      );
    }

    const particleOpacity = t < 0.16 ? smootherStep(t / 0.16) : t > 0.82 ? smootherStep((1 - t) / 0.18) : 0.58;
    this.showcase.particles.material.opacity = Math.max(0, Math.min(0.72, particleOpacity));
    this.showcase.particles.rotation.y += 0.0045;
    this.showcase.particles.rotation.x += 0.0015;

    const pulse = Math.sin(t * Math.PI);
    this.showcase.ring.material.opacity = pulse * 0.34;
    this.showcase.ring.scale.setScalar(0.86 + pulse * 1.05);
    this.showcase.ring.rotation.z += 0.008;

    if (t >= 1) {
      const { particles, ring, complete } = this.showcase;
      this.showcase = undefined;
      for (const item of this.cubies.values()) {
        item.group.rotation.set(0, 0, 0);
      }
      this.scene.remove(particles);
      this.scene.remove(ring);
      particles.geometry.dispose();
      particles.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      this.root.rotation.set(0, 0, 0);
      this.setState(this.logical);
      complete();
    }
  }
}

function quarterTurnsForMove(move: Move) {
  return rotationForMove(move).angle / (Math.PI / 2);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutQuart(t: number) {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 4);
}

function smootherStep(t: number) {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}
