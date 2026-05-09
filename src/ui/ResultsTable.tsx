import { BattleSummary } from './types';

const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(n < 10 ? 2 : 1) : 'n/a');

export function ResultsTable({ summaries }: { summaries: BattleSummary[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Solver</th>
            <th>Success</th>
            <th>Avg HTM</th>
            <th>Best</th>
            <th>Worst</th>
            <th>Avg ms</th>
            <th>Fastest</th>
            <th>Slowest</th>
            <th>Verified</th>
            <th>Failed</th>
          </tr>
        </thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.solverId}>
              <td>{s.name}</td>
              <td>{fmt(s.successRate)}%</td>
              <td>{fmt(s.averageMoves)}</td>
              <td>{s.bestMoves || 'n/a'}</td>
              <td>{s.worstMoves || 'n/a'}</td>
              <td>{fmt(s.averageTime)}</td>
              <td>{fmt(s.fastestTime)}</td>
              <td>{fmt(s.slowestTime)}</td>
              <td>{s.verified}</td>
              <td>{s.failed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
