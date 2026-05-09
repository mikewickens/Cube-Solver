import { Play } from 'lucide-react';
import { SolverResult } from '../solver/Solver';
import { formatMoves } from '../cube/notation';
import { BattleRun, BattleSummary } from './types';
import { ResultsTable } from './ResultsTable';
import { Charts } from './Charts';

type Props = {
  runs: BattleRun[];
  summaries: BattleSummary[];
  isRunning: boolean;
  scrambleCount: number;
  setScrambleCount: (value: number) => void;
  onRun: () => void;
  onReplay: (result: SolverResult, run: BattleRun) => void;
};

function failureMessage(result: SolverResult) {
  if (result.verified) return result.notes;
  if (result.solverId === 'greedy') return 'Local search got stuck before reaching solved state.';
  if (result.solverId === 'staged') return 'Depth limit reached for this long scramble.';
  if (result.solverId === 'optimal') return 'No proof found inside the browser-safe depth budget.';
  return 'No verified solution returned.';
}

export function BattlePanel({ runs, summaries, isRunning, scrambleCount, setScrambleCount, onRun, onReplay }: Props) {
  const single = runs[0];
  const moveWinner = summaries.filter((s) => s.verified > 0).sort((a, b) => a.averageMoves - b.averageMoves)[0];
  const timeWinner = summaries.filter((s) => s.verified > 0).sort((a, b) => a.averageTime - b.averageTime)[0];
  return (
    <section className="panel battle">
      <div className="section-head">
        <div>
          <h2>Solver Battle</h2>
          <p>Same scrambles, verified results only. HTM counts U2/R2 as one move.</p>
        </div>
        <div className="battle-actions">
          <select value={scrambleCount} onChange={(e) => setScrambleCount(Number(e.target.value))}>
            {[1, 10, 50, 100].map((n) => <option key={n} value={n}>{n} scramble{n > 1 ? 's' : ''}</option>)}
          </select>
          <button className="primary-btn" onClick={onRun} disabled={isRunning}>{isRunning ? 'Running...' : 'Run battle'}</button>
        </div>
      </div>

      {summaries.length > 0 && (
        <>
          <div className="winner-strip">
            <span>Move winner: <b>{moveWinner?.name ?? 'n/a'}</b></span>
            <span>Speed winner: <b>{timeWinner?.name ?? 'n/a'}</b></span>
            <span>Combined: <b>{moveWinner && timeWinner ? moveWinner.name === timeWinner.name ? moveWinner.name : `${moveWinner.name} / ${timeWinner.name}` : 'n/a'}</b></span>
          </div>
          <p className="battle-note">
            Failed rows mean the solver did not prove a solution for this scramble. Long scrambles are expected to beat the greedy, staged, and optimal depth-limited solvers.
          </p>
          <ResultsTable summaries={summaries} />
          <Charts summaries={summaries} />
        </>
      )}

      {single && (
        <div className="single-results">
          <h3>Single Scramble Results</h3>
          <p className="mono">{single.scrambleText}</p>
          <div className="solver-grid">
            {single.results.map((result) => (
              <article className={`solver-card ${result.verified ? 'ok' : 'bad'}`} key={result.solverId}>
                <div className="card-top">
                  <h4>{result.solverName}</h4>
                  <span>{result.proof}</span>
                </div>
                <p className="sequence">{result.moves.length ? formatMoves(result.moves) : 'No verified solution returned.'}</p>
                <div className="metrics">
                  <span>{result.moveCount} HTM</span>
                  <span>{result.durationMs.toFixed(2)} ms</span>
                  <span>{result.verified ? 'verified' : 'failed'}</span>
                </div>
                <p className="solver-note">{failureMessage(result)}</p>
                <button disabled={!result.verified} onClick={() => onReplay(result, single)}><Play size={15} /> Replay</button>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
