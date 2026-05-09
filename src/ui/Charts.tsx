import { BattleSummary } from './types';

export function Charts({ summaries }: { summaries: BattleSummary[] }) {
  const moveValues = summaries.map((s) => s.averageMoves).filter(Number.isFinite);
  const timeValues = summaries.map((s) => s.averageTime).filter(Number.isFinite);
  const maxMoves = Math.max(1, ...moveValues);
  const maxTime = Math.max(1, ...timeValues);
  return (
    <div className="charts">
      {summaries.map((summary) => {
        const hasMoves = Number.isFinite(summary.averageMoves);
        const hasTime = Number.isFinite(summary.averageTime);
        return (
          <div className="chart-row" key={summary.solverId}>
            <span>{summary.name}</span>
            <div
              className={`bar move ${hasMoves ? '' : 'failed-bar'}`}
              title={hasMoves ? `${summary.averageMoves.toFixed(1)} HTM average` : 'No verified solve'}
              style={{ width: hasMoves ? `${Math.max(4, (summary.averageMoves / maxMoves) * 100)}%` : '4%' }}
            />
            <div
              className={`bar time ${hasTime ? '' : 'failed-bar'}`}
              title={hasTime ? `${summary.averageTime.toFixed(2)} ms average` : 'No verified solve'}
              style={{ width: hasTime ? `${Math.max(4, (summary.averageTime / maxTime) * 100)}%` : '4%' }}
            />
          </div>
        );
      })}
    </div>
  );
}
