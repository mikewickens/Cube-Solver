import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Shuffle, Sparkles, Wand2 } from 'lucide-react';
import { CubeState } from '../cube/CubeState';
import { Move } from '../cube/moves';
import { formatMoves, generateScramble } from '../cube/notation';
import { CubeRenderer } from '../render/CubeRenderer';
import { LayerTurn } from '../render/CubeRenderer';
import { initWorkerSolver, solveWithWorker } from '../solver/WorkerSolver';

export function App() {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CubeRenderer>();
  const [cubeSize, setCubeSize] = useState<2 | 3 | 4>(3);
  const stateRef = useRef(CubeState.solved(3));
  const busyRef = useRef(false);
  const [shuffleMoves, setShuffleMoves] = useState(25);
  const [attemptCount, setAttemptCount] = useState(5);
  const [speed, setSpeed] = useState(2);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [currentMove, setCurrentMove] = useState('None');
  const [step, setStep] = useState({ current: 0, total: 0 });
  const [lastShuffle, setLastShuffle] = useState<Move[]>([]);
  const [solution, setSolution] = useState<Move[]>([]);
  const [solverReady, setSolverReady] = useState(false);
  const [totalMoves, setTotalMoves] = useState(0);
  type Attempt = { index: number; moves: number; ms: number; depth: number; ok: boolean; note?: string };
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    if (!hostRef.current) return;
    const renderer = new CubeRenderer(hostRef.current, cubeSize);
    rendererRef.current = renderer;
    renderer.onManualMove = (move) => {
      void manualTurn(move);
    };
    stateRef.current = CubeState.solved(cubeSize);
    renderer.setState(stateRef.current);
    setLastShuffle([]);
    setSolution([]);
    setAttempts([]);
    setTotalMoves(0);
    setCurrentMove('None');
    setStep({ current: 0, total: 0 });
    setStatus('Ready');
    window.setTimeout(() => {
      void (async () => {
        try {
          if (cubeSize === 4) {
            // No auto-solver for 4x4 yet; skip the (slow) cubejs precalc.
            setSolverReady(false);
            return;
          }
          if (!busyRef.current) setStatus('Preparing solver...');
          await initWorkerSolver();
          setSolverReady(true);
          if (!busyRef.current) setStatus('Ready');
        } catch (error) {
          if (!busyRef.current) setStatus(error instanceof Error ? error.message : 'Solver initialization failed');
        }
      })();
    }, 250);
    return () => renderer.dispose();
  }, [cubeSize]);

  async function animateSequence(moves: Move[], label: string, startingState = stateRef.current, finishedLabel?: string) {
    if (!rendererRef.current || busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    rendererRef.current.setInteractive(false);
    setStatus(label);
    setStep({ current: 0, total: moves.length });
    let state = startingState.clone();
    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      setCurrentMove(formatMoves([move]));
      await rendererRef.current.animateMove(state.clone(), move, Math.max(70, 420 / speed));
      const next = state.clone().applyMove(move);
      rendererRef.current.finishMove(next);
      state = next;
      stateRef.current = state.clone();
      setStep({ current: i + 1, total: moves.length });
      setTotalMoves((prev) => prev + 1);
    }
    setStatus(finishedLabel ?? (state.isSolved() ? `Solved in ${moves.length} moves` : `Shuffled ${moves.length} random moves`));
    rendererRef.current.setInteractive(true);
    busyRef.current = false;
    setIsBusy(false);
  }

  async function manualTurn(turn: LayerTurn) {
    if (!rendererRef.current || busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    rendererRef.current.setInteractive(false);
    setSolution([]);
    setStatus('Manual turn');
    setCurrentMove(turn.label);
    setStep({ current: 0, total: 1 });
    const before = stateRef.current.clone();
    await rendererRef.current.animateLayerTurn(before, turn, Math.max(70, 420 / speed));
    const after = before.clone().applyLayerTurn(turn.axis, turn.layer, turn.signedTurns);
    rendererRef.current.finishMove(after);
    stateRef.current = after.clone();
    setStep({ current: 1, total: 1 });
    setTotalMoves((prev) => prev + 1);
    setStatus(after.isSolved() ? 'Solved by hand' : 'Your turn');
    rendererRef.current.setInteractive(true);
    busyRef.current = false;
    setIsBusy(false);
  }

  async function shuffle() {
    const moves = generateScramble(shuffleMoves);
    const solved = CubeState.solved(cubeSize);
    stateRef.current = solved;
    rendererRef.current?.setState(solved);
    setLastShuffle(moves);
    setSolution([]);
    setAttempts([]);
    setTotalMoves(0);
    await animateSequence(moves, `Shuffling ${moves.length} random moves`, solved, `Shuffled ${moves.length} random moves`);
  }

  async function showcase() {
    if (!rendererRef.current || busyRef.current) return;
    if (cubeSize !== 3) {
      setStatus('Showcase animation is designed for the 3x3 cube');
      return;
    }
    const solved = CubeState.solved(3);
    busyRef.current = true;
    setIsBusy(true);
    rendererRef.current.setInteractive(false);
    stateRef.current = solved;
    setLastShuffle([]);
    setSolution([]);
    setAttempts([]);
    setTotalMoves(0);
    setStep({ current: 0, total: 1 });
    setCurrentMove('Showcase');
    setStatus('Showcase: cubies in flight');
    await rendererRef.current.playAssemblyShowcase(solved);
    rendererRef.current.setInteractive(true);
    stateRef.current = solved.clone();
    setStep({ current: 1, total: 1 });
    setCurrentMove('Assembled');
    setStatus('Showcase complete: solved 3x3');
    busyRef.current = false;
    setIsBusy(false);
  }

  function reset() {
    if (busyRef.current) return;
    const solved = CubeState.solved(cubeSize);
    stateRef.current = solved;
    rendererRef.current?.setState(solved);
    setLastShuffle([]);
    setSolution([]);
    setAttempts([]);
    setCurrentMove('None');
    setStep({ current: 0, total: 0 });
    setTotalMoves(0);
    setStatus('Reset');
  }

  async function solve() {
    if (busyRef.current) return;
    if (cubeSize === 4) {
      setStatus('No auto-solver for 4x4 yet — manual play only');
      return;
    }
    try {
      setIsBusy(true);
      setStatus(solverReady ? 'Solving...' : 'Preparing solver...');
      setAttempts([]);
      setSolution([]);

      const startState = stateRef.current.clone();
      if (startState.isSolved()) {
        setStatus('Already solved');
        setIsBusy(false);
        return;
      }

      // Try several depths to get a variety of solutions; cubejs is deterministic per depth.
      // Higher depths return faster (more freedom for the search). Lower depths are slower
      // but can occasionally produce shorter sequences. We cap each attempt with a timeout
      // so a slow depth can't hang the run.
      const depths = [22, 21, 23, 24, 20, 25, 19];
      const perAttemptTimeoutMs = 8000;
      const results: Attempt[] = [];
      let bestMoves: Move[] | null = null;

      for (let i = 0; i < attemptCount; i++) {
        const depth = depths[i % depths.length];
        setStatus(`Attempt ${i + 1} of ${attemptCount} (depth ${depth})...`);
        const t0 = performance.now();
        try {
          const moves = await solveWithWorker(startState, depth, perAttemptTimeoutMs);
          const elapsed = performance.now() - t0;
          const attempt: Attempt = { index: i + 1, moves: moves.length, ms: elapsed, depth, ok: true };
          results.push(attempt);
          setAttempts([...results]);
          if (!bestMoves || moves.length < bestMoves.length) bestMoves = moves;
          if (bestMoves.length <= 20) break;
        } catch (err) {
          const elapsed = performance.now() - t0;
          const message = err instanceof Error ? err.message : 'failed';
          results.push({ index: i + 1, moves: 0, ms: elapsed, depth, ok: false, note: message });
          setAttempts([...results]);
        }
      }
      setSolverReady(true);

      if (!bestMoves) {
        setStatus('All attempts failed');
        setIsBusy(false);
        return;
      }

      setSolution(bestMoves);
      setStatus(`Best: ${bestMoves.length}-move solution from ${results.length} attempt${results.length === 1 ? '' : 's'}`);
      setIsBusy(false);
      await animateSequence(bestMoves, `Solving in ${bestMoves.length} moves`, startState, `Solved in ${bestMoves.length} moves`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not solve this cube');
      setIsBusy(false);
      busyRef.current = false;
      rendererRef.current?.setInteractive(true);
    }
  }

  return (
    <main className="simple-main">
      <section className="stage simple-stage">
        <div className="hero-copy">
          <span>Fast Cube Demo</span>
          <h1>Rubik&apos;s Cube Solver</h1>
          <p>Shuffle, drag any visible face to turn it by hand, then solve the current cube state when you are ready.</p>
        </div>
        <div className="viewport" ref={hostRef} />
        <div className="status-strip">
          <span>Status: <b>{status}</b></span>
          <span>Move: <b>{currentMove}</b></span>
          <span>Moves: <b>{totalMoves}</b></span>
        </div>
      </section>

      <aside className="side">
        <section className="panel controls">
          <label className="select-row">
            <span>Cube size</span>
            <select
              value={cubeSize}
              disabled={isBusy}
              onChange={(e) => setCubeSize(Number(e.target.value) as 2 | 3 | 4)}
            >
              <option value={2}>Rubik&apos;s 2×2</option>
              <option value={3}>Rubik&apos;s 3×3</option>
              <option value={4}>Rubik&apos;s 4×4 (manual only)</option>
            </select>
          </label>
          <label className="number-row">
            <span>Random shuffle length</span>
            <input
              type="number"
              min="1"
              max="200"
              value={shuffleMoves}
              disabled={isBusy}
              onChange={(event) => setShuffleMoves(Math.max(1, Math.min(200, Number(event.target.value) || 1)))}
            />
          </label>
          <label className="number-row">
            <span>Solver attempts</span>
            <input
              type="number"
              min="1"
              max="20"
              value={attemptCount}
              disabled={isBusy}
              onChange={(event) => setAttemptCount(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
            />
          </label>
          <div className="button-grid simple-buttons">
            <button onClick={shuffle} disabled={isBusy}><Shuffle size={16} /> Shuffle</button>
            <button onClick={reset} disabled={isBusy}><RotateCcw size={16} /> Reset</button>
            <button className="primary-btn" onClick={solve} disabled={isBusy || cubeSize === 4} title={cubeSize === 4 ? 'No auto-solver for 4x4 yet' : ''}><Wand2 size={16} /> Solver</button>
            <button className="showcase-btn" onClick={showcase} disabled={isBusy || cubeSize !== 3} title={cubeSize !== 3 ? 'Showcase is built for the 3x3 cube' : 'Explode and assemble the 3x3 cube'}><Sparkles size={16} /> Showcase</button>
          </div>
          <label className="slider">
            <span>Move speed</span>
            <input type="range" min="0.5" max="6" step="0.5" value={speed} disabled={isBusy} onChange={(event) => setSpeed(Number(event.target.value))} />
            <b>{speed.toFixed(1)}x</b>
          </label>
        </section>

        <section className="panel">
          <h2>Current Run</h2>
          <p className="label">Random shuffle sequence {lastShuffle.length ? `(${lastShuffle.length} moves)` : ''}</p>
          <p className="mono">{lastShuffle.length ? formatMoves(lastShuffle) : 'No shuffle yet.'}</p>
          <p className="label">Solver solution</p>
          <p className="mono">{solution.length ? formatMoves(solution) : 'No solution played yet.'}</p>
          <p className="label">Solved in</p>
          <strong>{solution.length ? `${solution.length} moves` : 'n/a'}</strong>
        </section>

        <section className="panel">
          <h2>Solver Attempts</h2>
          {attempts.length === 0 ? (
            <p className="label">No attempts yet.</p>
          ) : (
            <ul className="attempts-list">
              {attempts.map((a) => {
                const best = a.ok && a.moves === Math.min(...attempts.filter((x) => x.ok).map((x) => x.moves));
                return (
                  <li key={a.index} className={`attempt ${a.ok ? (a.moves <= 20 ? 'good' : 'ok') : 'bad'} ${best ? 'best' : ''}`}>
                    <span>Attempt {a.index}</span>
                    <span className="mono">
                      {a.ok ? `${a.moves} moves` : (a.note ?? 'failed')}
                      {' '}
                      <small>({a.ms.toFixed(0)} ms, depth {a.depth})</small>
                      {best ? ' ★' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </aside>
    </main>
  );
}
