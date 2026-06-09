import type { Direction, GameCell, LaserResult, LaserSegment, Side } from '../types/game';

export function getEntrySide(dir: Direction): Side {
  switch (dir) {
    case 'right': return 'left';
    case 'left':  return 'right';
    case 'down':  return 'top';
    case 'up':    return 'bottom';
  }
}

export function getExitSide(dir: Direction): Side {
  switch (dir) {
    case 'right': return 'right';
    case 'left':  return 'left';
    case 'down':  return 'bottom';
    case 'up':    return 'top';
  }
}

export function reflectSlash(dir: Direction): Direction {
  switch (dir) {
    case 'right': return 'up';
    case 'left':  return 'down';
    case 'up':    return 'right';
    case 'down':  return 'left';
  }
}

export function reflectBackslash(dir: Direction): Direction {
  switch (dir) {
    case 'right': return 'down';
    case 'left':  return 'up';
    case 'up':    return 'left';
    case 'down':  return 'right';
  }
}

export function stepInDir(row: number, col: number, dir: Direction): [number, number] {
  switch (dir) {
    case 'right': return [row, col + 1];
    case 'left':  return [row, col - 1];
    case 'down':  return [row + 1, col];
    case 'up':    return [row - 1, col];
  }
}

interface Beam {
  row: number;
  col: number;
  dir: Direction;
}

export function traceLaser(grid: GameCell[][], gridSize: number): LaserResult {
  const segments: LaserSegment[] = [];
  const hitTargets = new Set<string>();
  const hitCheckpoints = new Set<string>();
  const visited = new Set<string>();

  const queue: Beam[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].kind === 'laser') {
        const dir = grid[r][c].direction ?? 'right';
        const [nr, nc] = stepInDir(r, c, dir);
        queue.push({ row: nr, col: nc, dir });
      }
    }
  }

  const MAX_STEPS = gridSize * gridSize * 8;
  let steps = 0;

  while (queue.length > 0 && steps < MAX_STEPS) {
    steps++;
    const beam = queue.shift()!;
    const { row, col, dir } = beam;

    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) continue;

    const key = `${row},${col},${dir}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const cell = grid[row][col];
    const from = getEntrySide(dir);

    switch (cell.kind) {
      case 'absorber':
      case 'wall':
        // Beam is absorbed/blocked — no segment
        break;

      case 'target': {
        segments.push({ row, col, from, to: getExitSide(dir) });
        hitTargets.add(`${row},${col}`);
        // Target absorbs beam — no continuation
        break;
      }

      case 'checkpoint': {
        // Beam passes through checkpoint
        segments.push({ row, col, from, to: getExitSide(dir) });
        hitCheckpoints.add(`${row},${col}`);
        const [nr, nc] = stepInDir(row, col, dir);
        queue.push({ row: nr, col: nc, dir });
        break;
      }

      case 'mirror-slash': {
        const newDir = reflectSlash(dir);
        segments.push({ row, col, from, to: getExitSide(newDir) });
        const [nr, nc] = stepInDir(row, col, newDir);
        queue.push({ row: nr, col: nc, dir: newDir });
        break;
      }

      case 'mirror-backslash': {
        const newDir = reflectBackslash(dir);
        segments.push({ row, col, from, to: getExitSide(newDir) });
        const [nr, nc] = stepInDir(row, col, newDir);
        queue.push({ row: nr, col: nc, dir: newDir });
        break;
      }

      case 'splitter': {
        // Beam continues straight
        segments.push({ row, col, from, to: getExitSide(dir) });
        const [nr1, nc1] = stepInDir(row, col, dir);
        queue.push({ row: nr1, col: nc1, dir });

        // AND also reflects as backslash
        const reflDir = reflectBackslash(dir);
        if (reflDir !== dir) {
          segments.push({ row, col, from, to: getExitSide(reflDir) });
          const [nr2, nc2] = stepInDir(row, col, reflDir);
          queue.push({ row: nr2, col: nc2, dir: reflDir });
        }
        break;
      }

      default: {
        // empty cell — beam passes through
        segments.push({ row, col, from, to: getExitSide(dir) });
        const [nr, nc] = stepInDir(row, col, dir);
        queue.push({ row: nr, col: nc, dir });
        break;
      }
    }
  }

  return { segments, hitTargets, hitCheckpoints };
}
