declare module 'cubejs' {
  export default class Cube {
    constructor(state?: unknown);
    static initSolver(): void;
    static fromString(state: string): Cube;
    move(algorithm: string): Cube;
    solve(maxDepth?: number): string;
    asString(): string;
    isSolved(): boolean;
  }
}
