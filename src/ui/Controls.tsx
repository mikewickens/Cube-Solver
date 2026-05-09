import { Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward } from 'lucide-react';

type Props = {
  customScramble: string;
  setCustomScramble: (value: string) => void;
  randomMoveCount: number;
  setRandomMoveCount: (value: number) => void;
  speed: number;
  setSpeed: (value: number) => void;
  isPlaying: boolean;
  onReset: () => void;
  onRandom: () => void;
  onApply: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onPlayPause: () => void;
};

export function Controls(props: Props) {
  return (
    <section className="panel controls">
      <div className="field">
        <label>Scramble</label>
        <textarea value={props.customScramble} onChange={(e) => props.setCustomScramble(e.target.value)} spellCheck={false} />
      </div>
      <label className="number-row">
        <span>Random moves</span>
        <input
          type="number"
          min="1"
          max="100"
          value={props.randomMoveCount}
          onChange={(e) => props.setRandomMoveCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
        />
      </label>
      <div className="button-grid">
        <button onClick={props.onRandom}><Shuffle size={16} /> Random</button>
        <button onClick={props.onApply}>Load</button>
        <button onClick={props.onReset}><RotateCcw size={16} /> Reset</button>
      </div>
      <div className="transport">
        <button className="icon" title="Step back" onClick={props.onStepBack}><SkipBack size={18} /></button>
        <button className="icon primary" title="Play or pause" onClick={props.onPlayPause}>{props.isPlaying ? <Pause size={18} /> : <Play size={18} />}</button>
        <button className="icon" title="Step forward" onClick={props.onStepForward}><SkipForward size={18} /></button>
      </div>
      <label className="slider">
        <span>Move speed</span>
        <input type="range" min="0.25" max="4" step="0.25" value={props.speed} onChange={(e) => props.setSpeed(Number(e.target.value))} />
        <b>{props.speed.toFixed(1)}x</b>
      </label>
    </section>
  );
}
