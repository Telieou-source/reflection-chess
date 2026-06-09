import type { Direction, GameCell, LaserSegment, Side } from '../types/game';

export function getEntrySide(dir: Direction): Side {
  switch (dir) {
    case 'right': return 'left';
    case 'left': return 'right';
    case 'down': return 'top';
    case 'up': return 'bottom';
  }
}

export function getExitSide(dir: Direction): Side {
  switch (dir) {
    case 'right': return 'right';
    case 'left': return 'left';
    case 'down': return 'bottom';
    case 'up': return 'top';
  }
}

export function reflectSlash(dir: Direction): Direction {
  switch (dir) {
    case 'right': return 'up';
    case 'left': return 'down';
    case 'up': return 'right';
    case 'down': return 'left';
  }
}

export function reflectBackslash(dir: Direction): Direction {
  switch (dir) {
    case 'right': return 'down';
    case 'left': return 'up';
    case 'up': return 'left';
    case 'down': return 'right';
  }
}

export function stepInDir(row: number, col: number, dir: Direction): [number, number] {
  switch (dir) {
    case 'right': return [row, col + 1];
    case 'left': return [row, col - 1];
    case 'down': return [row + 1, col];
    case 'up': return [row - 1, col];
  }
}

export interface LaserResult {
  segments: LaserSegment[];
  hitTargets: Set<string>;
}

export function traceLaser(grid: GameCell[][], gridSize: number): LaserResult {
  let sourceRow = -1;
  let sourceCol = -1;
  let sourceDir: Direction = 'right';

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (grid[r][c].kind === 'laser') {
        sourceRow = r;
        sourceCol = c;
        sourceDir = grid[r][c].direction ?? 'right';
      }
    }
  }

  if (sourceRow === -1) return { segments: [], hitTargets: new Set() };

  const segments: LaserSegment[] = [];
  const hitTargets = new Set<string>();
  const visited = new Set<string>();

  let [row, col] = stepInDir(sourceRow, sourceCol, sourceDir);
  let dir = sourceDir;
  let steps = 0;

  while (row >= 0 && row < gridSize && col >= 0 && col < gridSize && steps < 300) {
    const key = `${row},${col},${dir}`;
    if (visited.has(key)) break;
    visited.add(key);
    steps++;

    const cell = grid[row][col];
    const from = getEntrySide(dir);

    if (cell.kind === 'wall') {
      break;
    }

    if (cell.kind === 'target') {
      segments.push({ row, col, from, to: getExitSide(dir) });
      hitTargets.add(`${row},${col}`);
      break;
    }

    if (cell.kind === 'mirror-slash') {
      const newDir = reflectSlash(dir);
      segments.push({ row, col, from, to: getExitSide(newDir) });
      dir = newDir;
    } else if (cell.kind === 'mirror-backslash') {
      const newDir = reflectBackslash(dir);
      segments.push({ row, col, from, to: getExitSide(newDir) });
      dir = newDir;
    } else {
      segments.push({ row, col, from, to: getExitSide(dir) });
    }

    const [nr, nc] = stepInDir(row, col, dir);
    row = nr;
    col = nc;
  }

  return { segments, hitTargets };
}
