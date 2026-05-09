# Rubik's Cube Solver

A local browser-based Rubik's Cube playground built with TypeScript, React, Three.js, Vite, and `cubejs`. Supports the **2×2**, **3×3**, and **4×4** cubes with manual play, shuffle, and an automatic solver (2×2 and 3×3).

## Workflow

1. Pick a **Cube size** from the dropdown (2×2, 3×3, or 4×4).
2. Choose how many random shuffle moves to apply.
3. Click **Shuffle** to scramble.
4. Click **Solver** to solve the current cube state (2×2 and 3×3 only).
5. Click **Reset** to return to solved.
6. Drag any visible cube face to turn that side manually — including middle slices on the 3×3 and inner slices on the 4×4.

The solver does **not** solve by reversing the stored shuffle. The app converts the current cubie/sticker state into a facelet string, solves that state with `cubejs` in a Web Worker (off the main thread, so the UI never freezes), verifies the returned sequence against the app's own `CubeState`, then animates the verified solution.

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open the printed local Vite URL in a browser.

## Test

```bash
npm test
```

## Controls

- **Cube size**: 2×2, 3×3, or 4×4. Switching size rebuilds the cube and resets state.
- **Random shuffle length**: Sets how many random HTM moves the Shuffle button applies. This is not the number of moves the solver will need.
- **Solver attempts**: How many solver runs to try. The app explores several search depths (cubejs is deterministic per depth) and keeps the shortest verified solution. It stops early if it finds a solution of 20 moves or fewer.
- **Shuffle**: Resets to solved, generates a random move sequence, and animates it immediately.
- **Reset**: Resets the cube to solved.
- **Solver**: Runs the configured number of attempts in a worker thread (each capped by a per-attempt timeout to prevent hangs), then animates the best result.
- **Move speed**: Controls animation speed for both shuffle and solve moves.
- **Mouse drag on cube**: Turns the visible face you drag. Drag empty space to orbit the camera. Drag direction is camera-aware, so the rotation always matches the direction you swiped regardless of how the cube is oriented on screen.

The status strip shows the current move and the running **Moves** counter (every animated turn — shuffle, solve, and manual — is counted).

## Solver Attempts panel

Each solver run is logged with its move count, elapsed time, and search depth. The shortest result is highlighted as **best**. Failed/timed-out attempts are marked in red.

## Per-cube notes

| Cube | Manual play | Shuffle | Auto-solve |
|---|---|---|---|
| 2×2 | ✅ | ✅ | ✅ — the 2×2 state is lifted to an equivalent 3×3 facelet string (corners only, with phantom solved edges/centres). cubejs solves the lifted cube, and the returned outer-face moves apply identically to the 2×2. |
| 3×3 | ✅ — including M / E / S middle slices | ✅ | ✅ — cubejs Kociemba two-phase. The facelet builder reads centre colours from the actual current state, so the solver works correctly even after slice turns rotate the centres. |
| 4×4 | ✅ — outer turns and inner-slice turns by drag | ✅ | ❌ — disabled. A real 4×4 solver (reduction method + parity handling) is a larger project. |

## HTM Metric

HTM means half-turn metric. A quarter turn such as `R`, an inverse turn such as `R'`, and a half turn such as `R2` each count as one move.

## Solver Notes

The app uses `cubejs`, which implements Herbert Kociemba's two-phase algorithm. Solutions are fast and generally short, but the app does not label them optimal. A solution is only animated after it verifies against the app's independent cube model. Multiple attempts at different depths are used because cubejs is deterministic per depth — varying the depth gives different solutions, and the shortest one wins.

## Architecture

- `src/cube/CubeState.ts` — N×N logical cube model. Cubies live at centred-lattice positions; `applyMove` and `applyLayerTurn` work at any size.
- `src/render/CubeRenderer.ts` — Three.js renderer + drag-to-turn interaction. Sticker/cubie sizes scale with `n` so the cube fills the viewport at any size.
- `src/solver/CubeJsSolver.ts` — Facelet conversion, including the 2×2 → 3×3 lift.
- `src/solver/solver.worker.ts` + `src/solver/WorkerSolver.ts` — Web Worker wrapper. The worker is terminated and recreated when an attempt times out, keeping the UI responsive.
- `src/ui/App.tsx` — Top-level UI (cube-size picker, controls, attempts panel).

## Known Limitations

- Solver initialization (cubejs precompute tables) can take a moment the first time the app loads, or after a worker timeout/restart.
- The solver is practical/two-phase, not an optimal proof search.
- Shuffle is move-sequence based, not random-state based.
- 4×4 has no automatic solver yet.
