import type { CellKind, Direction, GameCell, LevelConfig } from '../types/game';
import { reflectBackslash, stepInDir, traceLaser } from './laser';

function makeRng(seed: number) {
  let s = Math.abs(seed * 9301 + 49297) % 233280 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function randInt(rng: () => number, min: number, max: number) {
  return min + Math.floor(rng() * (max - min + 1));
}

type MirrorKind = 'mirror-slash' | 'mirror-backslash';

interface MirrorSpec {
  row: number;
  col: number;
  kind: MirrorKind;
  arrivalDir: Direction;
}

function getMirrorForTurn(dir: Direction, turnRight: boolean): { kind: MirrorKind; newDir: Direction } {
  const cwMap: Record<Direction, { kind: MirrorKind; newDir: Direction }> = {
    right: { kind: 'mirror-backslash', newDir: 'down'  },
    down:  { kind: 'mirror-slash',     newDir: 'left'  },
    left:  { kind: 'mirror-backslash', newDir: 'up'    },
    up:    { kind: 'mirror-slash',     newDir: 'right' },
  };
  const ccwMap: Record<Direction, { kind: MirrorKind; newDir: Direction }> = {
    right: { kind: 'mirror-slash',     newDir: 'up'    },
    up:    { kind: 'mirror-backslash', newDir: 'left'  },
    left:  { kind: 'mirror-slash',     newDir: 'down'  },
    down:  { kind: 'mirror-backslash', newDir: 'right' },
  };
  return (turnRight ? cwMap : ccwMap)[dir];
}

function randomEdge(gridSize: number, rng: () => number): [number, number, Direction] {
  const side = Math.floor(rng() * 4);
  const pos  = Math.floor(rng() * gridSize);
  switch (side) {
    case 0: return [0,            pos,           'down'];
    case 1: return [gridSize - 1, pos,           'up'];
    case 2: return [pos,          0,             'right'];
    default: return [pos,         gridSize - 1,  'left'];
  }
}

function emptyGrid(gridSize: number): GameCell[][] {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({ kind: 'empty' as CellKind, fixed: false }))
  );
}

function cloneGrid(grid: GameCell[][]): GameCell[][] {
  return grid.map(row => row.map(cell => ({ ...cell })));
}

function freeCells(grid: GameCell[][]): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].kind === 'empty') cells.push([r, c]);
    }
  }
  return cells;
}

interface PathResult {
  grid: GameCell[][];
  playerMirrors: number;
}

function tryGenerate(
  rng: () => number,
  gridSize: number,
  totalMirrors: number,
  hintsToGive: number,
  tier: number,
): PathResult | null {
  const addAbsorbers = tier >= 2;
  const grid = emptyGrid(gridSize);
  const occupied = new Set<string>();

  // 1. Place laser source on a random edge
  const [sr, sc, sDir] = randomEdge(gridSize, rng);
  grid[sr][sc] = { kind: 'laser', direction: sDir, fixed: true };
  occupied.add(`${sr},${sc}`);

  // 2. Step into the grid
  let r = sr, c = sc, dir = sDir;
  {
    const [nr, nc] = stepInDir(r, c, dir);
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return null;
    r = nr; c = nc;
    occupied.add(`${r},${c}`);
  }

  // 3. Walk the path and place mirrors
  const mirrorSpecs: MirrorSpec[] = [];

  for (let m = 0; m < totalMirrors; m++) {
    const walkLen = randInt(rng, 1, Math.max(2, gridSize - 2));

    for (let w = 0; w < walkLen; w++) {
      const [nr, nc] = stepInDir(r, c, dir);
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
      if (occupied.has(`${nr},${nc}`)) break;
      r = nr; c = nc;
      occupied.add(`${r},${c}`);
    }

    const turnRight = rng() > 0.5;
    const { kind, newDir } = getMirrorForTurn(dir, turnRight);
    mirrorSpecs.push({ row: r, col: c, kind, arrivalDir: dir });
    dir = newDir;

    const [nr, nc] = stepInDir(r, c, dir);
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) {
      if (m < totalMirrors - 1) return null;
      break;
    }
    if (occupied.has(`${nr},${nc}`)) return null;
    r = nr; c = nc;
    occupied.add(`${r},${c}`);
  }

  // 4. Walk to target (last non-occupied cell in current direction)
  let targetRow = r, targetCol = c;
  while (true) {
    const [nr, nc] = stepInDir(r, c, dir);
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
    if (occupied.has(`${nr},${nc}`)) break;
    targetRow = nr; targetCol = nc;
    r = nr; c = nc;
    occupied.add(`${r},${c}`);
  }

  if (targetRow === sr && targetCol === sc) return null;
  if (grid[targetRow][targetCol].kind !== 'empty') return null;
  if (mirrorSpecs.some(m => m.row === targetRow && m.col === targetCol)) return null;

  // 5. Place fixed hint mirrors
  for (let i = 0; i < mirrorSpecs.length; i++) {
    const { row, col, kind } = mirrorSpecs[i];
    if (i < hintsToGive) {
      grid[row][col] = { kind, fixed: true };
    }
  }

  // 6. Place target
  grid[targetRow][targetCol] = { kind: 'target', fixed: true };

  // 7. Place ordered checkpoints along the beam path
  {
    const numCheckpoints = tier >= 10 ? 3 : tier >= 5 ? 2 : 1;

    const solutionGrid2 = cloneGrid(grid);
    for (let i = 0; i < mirrorSpecs.length; i++) {
      const { row, col, kind } = mirrorSpecs[i];
      if (i >= hintsToGive) {
        solutionGrid2[row][col] = { kind, fixed: false };
      }
    }
    const { segments } = traceLaser(solutionGrid2, gridSize);

    // Collect beam-path empty cells in traversal order (deduplicated)
    const seen = new Set<string>();
    const beamCells: [number, number][] = [];
    for (const seg of segments) {
      const key = `${seg.row},${seg.col}`;
      if (!seen.has(key) &&
          grid[seg.row][seg.col].kind === 'empty' &&
          !(seg.row === targetRow && seg.col === targetCol)) {
        seen.add(key);
        beamCells.push([seg.row, seg.col]);
      }
    }

    const interior = beamCells.filter(
      ([rr, cc]) => rr > 0 && rr < gridSize - 1 && cc > 0 && cc < gridSize - 1
    );
    const pool = interior.length >= numCheckpoints ? interior : beamCells;

    if (pool.length >= numCheckpoints) {
      for (let i = 0; i < numCheckpoints; i++) {
        const idx = Math.floor((i + 0.5) * pool.length / numCheckpoints);
        const [cpR, cpC] = pool[Math.min(idx, pool.length - 1)];
        if (grid[cpR][cpC].kind === 'empty') {
          grid[cpR][cpC] = { kind: 'checkpoint', fixed: true, checkpointOrder: i + 1 };
        }
      }
    } else if (pool.length > 0) {
      const [cpR, cpC] = pool[Math.floor(pool.length / 2)];
      if (grid[cpR][cpC].kind === 'empty') {
        grid[cpR][cpC] = { kind: 'checkpoint', fixed: true, checkpointOrder: 1 };
      }
    }
  }

  // 8. Add absorbers on non-path cells
  if (addAbsorbers) {
    const numAbsorbers = randInt(rng, 1, 2 + Math.floor(gridSize / 3));
    const free = freeCells(grid);
    for (let i = 0; i < Math.min(numAbsorbers, free.length); i++) {
      const idx = Math.floor(rng() * free.length);
      const [rr, cc] = free.splice(idx, 1)[0];
      grid[rr][cc] = { kind: 'absorber', fixed: true };
    }
  }

  // 9. Add fixed splitters (off-path obstacles, scale with tier)
  {
    const numSplitters = tier >= 12 ? 3 : tier >= 7 ? 2 : tier >= 3 ? 1 : 0;
    if (numSplitters > 0) {
      const free = freeCells(grid);
      for (let i = 0; i < Math.min(numSplitters, free.length); i++) {
        const idx = Math.floor(rng() * free.length);
        const [rr, cc] = free.splice(idx, 1)[0];
        grid[rr][cc] = { kind: 'splitter', fixed: true };
      }
    }
  }

  // 10. Add fixed fiber tunnels (scale with tier)
  {
    const numFibers = tier >= 15 ? 2 : tier >= 6 ? 1 : 0;
    if (numFibers > 0) {
      const free = freeCells(grid);
      for (let f = 0; f < Math.min(numFibers, Math.floor(free.length / 2)); f++) {
        if (free.length < 2) break;
        const fiberId = 200 + f;
        const entryIdx = Math.floor(rng() * free.length);
        const [er, ec] = free.splice(entryIdx, 1)[0];
        const exitIdx  = Math.floor(rng() * free.length);
        const [xr, xc] = free.splice(exitIdx,  1)[0];
        grid[er][ec] = { kind: 'fiber-entry', fixed: true, fiberId };
        grid[xr][xc] = { kind: 'fiber-exit',  fixed: true, fiberId };
      }
    }
  }

  // ─── Validation pass 1: solution must be solvable with ordered checkpoints ───
  let totalTargets = 0, totalCheckpoints = 0;
  for (let rr = 0; rr < gridSize; rr++) {
    for (let cc = 0; cc < gridSize; cc++) {
      if (grid[rr][cc].kind === 'target')     totalTargets++;
      if (grid[rr][cc].kind === 'checkpoint') totalCheckpoints++;
    }
  }

  const solutionGrid = cloneGrid(grid);
  for (let i = hintsToGive; i < mirrorSpecs.length; i++) {
    const { row, col, kind } = mirrorSpecs[i];
    if (solutionGrid[row][col].kind === 'empty') {
      solutionGrid[row][col] = { kind, fixed: false };
    }
  }

  const { hitTargets: htSol, checkpointsHitInOrder } = traceLaser(solutionGrid, gridSize);
  const orderedOk =
    checkpointsHitInOrder.length >= totalCheckpoints &&
    checkpointsHitInOrder.every((v, i) => v === i + 1);
  if (htSol.size < totalTargets || !orderedOk) return null;

  // ─── Validation pass 2: initial state must NOT be already solved ─────────────
  const { hitTargets: htInit, checkpointsHitInOrder: cpInit } = traceLaser(grid, gridSize);
  const initSolved =
    totalTargets > 0 &&
    htInit.size >= totalTargets &&
    cpInit.length >= totalCheckpoints &&
    cpInit.every((v, i) => v === i + 1);
  if (initSolved) return null;

  // 11. Scatter coin collectibles on safe (non-mirror-position) free cells
  {
    const numCoins = tier >= 8 ? 2 : tier >= 1 ? 1 : 0;
    if (numCoins > 0) {
      const mirrorPositions = new Set(mirrorSpecs.slice(hintsToGive).map(m => `${m.row},${m.col}`));
      const safe = freeCells(grid).filter(([rr, cc]) => !mirrorPositions.has(`${rr},${cc}`));
      for (let i = 0; i < Math.min(numCoins, safe.length); i++) {
        const idx = Math.floor(rng() * safe.length);
        const [rr, cc] = safe.splice(idx, 1)[0];
        const value = tier >= 10 ? 3 : tier >= 5 ? 2 : 1;
        grid[rr][cc] = { kind: 'coin', fixed: true, coinValue: value };
      }
    }
  }

  const playerMirrors = mirrorSpecs.filter((_, i) => i >= hintsToGive).length;
  return { grid, playerMirrors: Math.max(1, playerMirrors) };
}

const LEVEL_NAMES = [
  'The Bend', 'Detour', 'Right Angle', 'Shortcut', 'The Zigzag',
  'Split Path', 'Echo', 'Rebound', 'Phase Shift', 'Kaleidoscope',
  'Double Back', 'Prism Walk', 'Dead End', 'Snaking', 'The Arc',
  'Crossfire', 'Blind Turn', 'Mirror Mind', 'Labyrinth', 'Cascade',
];

function getDifficultyTag(tier: number): string {
  if (tier < 3)  return 'Beginner';
  if (tier < 7)  return 'Intermediate';
  if (tier < 12) return 'Advanced';
  if (tier < 18) return 'Expert';
  return 'Master';
}

function getObstacleTag(tier: number): string {
  if (tier >= 6)  return ' · splitters · fibers';
  if (tier >= 3)  return ' · splitters';
  return '';
}

function generateFallback(levelNum: number): LevelConfig {
  const grid = emptyGrid(4);
  grid[0][0] = { kind: 'laser', direction: 'right', fixed: true };
  grid[1][3] = { kind: 'checkpoint', fixed: true, checkpointOrder: 1 };
  grid[3][3] = { kind: 'target', fixed: true };
  return {
    id: levelNum,
    name: 'First Light',
    description: 'Redirect the laser through the gate.',
    gridSize: 4,
    grid,
    playerMirrors: 1,
  };
}

export function generateLevel(levelNum: number): LevelConfig {
  const tier = Math.max(0, levelNum - 11);

  const gridSize     = Math.min(4 + Math.floor(tier / 3), 9);
  const totalMirrors = Math.min(1 + Math.floor(tier / 2), 7);
  const hintsToGive  = Math.max(0, totalMirrors - 1 - Math.floor(tier / 4));

  for (let attempt = 0; attempt < 400; attempt++) {
    const attemptRng = makeRng(levelNum * 7919 + 13 + attempt * 97);
    const result = tryGenerate(
      attemptRng,
      gridSize,
      totalMirrors,
      hintsToGive,
      tier,
    );
    if (result) {
      const nameIdx   = (levelNum - 11) % LEVEL_NAMES.length;
      const nameSuffix = Math.floor((levelNum - 11) / LEVEL_NAMES.length) + 1;
      const diff = getDifficultyTag(tier);
      return {
        id: levelNum,
        name: LEVEL_NAMES[nameIdx] + (nameSuffix > 1 ? ` ${nameSuffix}` : ''),
        description: `${diff} · ${gridSize}×${gridSize} · ${result.playerMirrors} mirror${result.playerMirrors !== 1 ? 's' : ''}${getObstacleTag(tier)}`,
        gridSize,
        grid: result.grid,
        playerMirrors: result.playerMirrors,
      };
    }
  }

  return generateFallback(levelNum);
}
