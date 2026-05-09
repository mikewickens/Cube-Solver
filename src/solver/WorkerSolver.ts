import { CubeState } from '../cube/CubeState';
import { Move } from '../cube/moves';
import { parseMoves } from '../cube/notation';
import { verifyFromState } from '../cube/validation';
import { cubeStateToCubeJsString, lift2x2To3x3FaceletString } from './CubeJsSolver';

type WorkerReply =
  | { type: 'ready' }
  | { type: 'solution'; text: string }
  | { type: 'error'; message: string };

let worker: Worker | null = null;
let initResolve: (() => void) | null = null;
let pendingResolve: ((text: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (ev: MessageEvent<WorkerReply>) => {
    const msg = ev.data;
    if (msg.type === 'ready') {
      initResolve?.();
      initResolve = null;
    } else if (msg.type === 'solution') {
      pendingResolve?.(msg.text);
      pendingResolve = null;
      pendingReject = null;
    } else if (msg.type === 'error') {
      pendingReject?.(new Error(msg.message));
      pendingResolve = null;
      pendingReject = null;
    }
  };
  worker.onerror = (ev) => {
    pendingReject?.(new Error(ev.message));
    pendingResolve = null;
    pendingReject = null;
  };
  return worker;
}

export function initWorkerSolver(): Promise<void> {
  const w = getWorker();
  return new Promise((resolve) => {
    initResolve = resolve;
    w.postMessage({ type: 'init' });
  });
}

export function resetWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pendingResolve = null;
  pendingReject = null;
  initResolve = null;
}

export function solveWithWorker(state: CubeState, maxDepth = 22, timeoutMs?: number): Promise<Move[]> {
  if (state.isSolved()) return Promise.resolve([]);
  if (state.n !== 2 && state.n !== 3) {
    return Promise.reject(new Error(`No auto-solver available for ${state.n}x${state.n} cubes yet`));
  }
  const w = getWorker();
  // 2x2 lifts to a 3x3 facelet string with phantom solved edges/centres; the returned
  // outer-face moves apply identically to the 2x2.
  const facelets = state.n === 2 ? lift2x2To3x3FaceletString(state) : cubeStateToCubeJsString(state);
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = timeoutMs && timeoutMs > 0
      ? window.setTimeout(() => {
          if (settled) return;
          settled = true;
          // cube.solve() runs synchronously inside the worker; the only way to abort
          // is to terminate the worker. The next call will spin up a fresh one and
          // re-run initSolver (slow first time, but tables are gone so it's required).
          resetWorker();
          // Eagerly start re-init so the next attempt doesn't pay for it lazily.
          void initWorkerSolver();
          reject(new Error(`timed out after ${timeoutMs} ms`));
        }, timeoutMs)
      : 0;

    pendingResolve = (text: string) => {
      if (settled) return;
      settled = true;
      if (timer) window.clearTimeout(timer);
      const solution = parseMoves(text);
      if (!verifyFromState(state, solution)) {
        reject(new Error('Solver returned a sequence that did not verify against the current cube.'));
      } else {
        resolve(solution);
      }
    };
    pendingReject = (err: Error) => {
      if (settled) return;
      settled = true;
      if (timer) window.clearTimeout(timer);
      reject(err);
    };
    w.postMessage({ type: 'solve', facelets, maxDepth });
  });
}
