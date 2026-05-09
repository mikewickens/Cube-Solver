import Cube from 'cubejs';

type WorkerMsg =
  | { type: 'init' }
  | { type: 'solve'; facelets: string; maxDepth: number };

type WorkerReply =
  | { type: 'ready' }
  | { type: 'solution'; text: string }
  | { type: 'error'; message: string };

let initialized = false;

self.addEventListener('message', (ev: MessageEvent<WorkerMsg>) => {
  const msg = ev.data;
  if (msg.type === 'init') {
    if (!initialized) {
      Cube.initSolver();
      initialized = true;
    }
    self.postMessage({ type: 'ready' } satisfies WorkerReply);
  } else if (msg.type === 'solve') {
    try {
      const cube = Cube.fromString(msg.facelets);
      const text = cube.solve(msg.maxDepth);
      self.postMessage({ type: 'solution', text } satisfies WorkerReply);
    } catch (e) {
      self.postMessage({ type: 'error', message: e instanceof Error ? e.message : String(e) } satisfies WorkerReply);
    }
  }
});
