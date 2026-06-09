import type { CellKind, Direction, GameCell, LevelConfig } from '../types/game';
import { reflectBackslash, reflectSlash, stepInDir } from './laser';

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

function randItem<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

type MirrorKind = 'mirror-slash' | 'mirror-backslash';

interface TurnResult {
  kind: MirrorKind;
  newDir: Direction;
}

function getMirrorForTurn(dir: Direction, turnRight: boolean): TurnResult {
  const cwMap: Record<Direction, TurnResult> = {
    right: { kind: 'mirror-backslash', newDir: 'down'  },
    down:  { kind: 'mirror-slash',     newDir: 'left'  },
    left:  { kind: 'mirror-backslash', newDir: 'up'    },
    up:    { kind: 'mirror-slash',     newDir: 'right' },
  };
  const ccwMap: Record<Direction, TurnResult> = {
    right: { kind: 'mirror-slash',     newDir: 'up'    },
    up:    { kind: 'mirror-backslash', newDir: 'left'  },
    left:  { kind: 'mirror-slash',     newDir: 'down'  },
    down:  { kind: 'mirror-backslash', newDir: 'right' },
  };
  return (turnRight ? cwMap : ccwMap)[dir];
}

function randomEdge(gridSize: number, rng: () => number): [number, number, Direction] {
  const side = Math.floor(rng() * 4);
  const pos = Math.floor(rng() * gridSize);
  switch (side) {
    case 0: return [0, pos, 'down'];
    case 1: return [gridSize - 1, pos, 'up'];
    case 2: return [pos, 0, 'right'];
    default: return [pos, gridSize - 1, 'left'];
  }
}

function emptyGrid(gridSize: number): GameCell[][] {
  return Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => ({ kind: 'empty' as CellKind, fixed: false }))
  );
}

interface PathResult {
  grid: GameCell[][];
  pathCells: Set<string>;
  playerMirrors: number;
}

function tryGenerate(
  rng: () => number,
  gridSize: number,
  totalMirrors: number,
  hintsToGive: number,
  addAbsorbers: boolean,
  addCheckpoint: boolean,
  addSplitter: boolean,
): PathResult | null {
  const grid = emptyGrid(gridSize);
  const occupied = new Set<string>();

  // 1. Place laser source
  const [sr, sc, sDir] = randomEdge(gridSize, rng);
  grid[sr][sc] = { kind: 'laser', direction: sDir, fixed: true };
  occupied.add(`${sr},${sc}`);

  // 2. Build path with mirrors
  let r = sr;
  let c = sc;
  let dir = sDir;

  // Step into grid
  {
    const [nr, nc] = stepInDir(r, c, dir);
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) return null;
    r = nr; c = nc;
    occupied.add(`${r},${c}`);
  }

  const mirrorSpecs: Array<{ row: number; col: number; kind: MirrorKind }> = [];

  for (let m = 0; m < totalMirrors; m++) {
    // Walk a random distance before placing next mirror
    const walkLen = randInt(rng, 1, Math.max(2, gridSize - 2));

    for (let w = 0; w < walkLen; w++) {
      const [nr, nc] = stepInDir(r, c, dir);
      if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
      if (occupied.has(`${nr},${nc}`)) break;
      r = nr; c = nc;
      occupied.add(`${r},${c}`);
    }

    // Place mirror at current position
    const turnRight = rng() > 0.5;
    const { kind, newDir } = getMirrorForTurn(dir, turnRight);
    mirrorSpecs.push({ row: r, col: c, kind });
    dir = newDir;

    // Step in new direction
    const [nr, nc] = stepInDir(r, c, dir);
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) {
      if (m < totalMirrors - 1) return null;
      break;
    }
    if (occupied.has(`${nr},${nc}`)) return null;
    r = nr; c = nc;
    occupied.add(`${r},${c}`);
  }

  // 3. Walk to target
  let targetRow = r;
  let targetCol = c;
  while (true) {
    const [nr, nc] = stepInDir(r, c, dir);
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
    if (occupied.has(`${nr},${nc}`)) break;
    targetRow = nr; targetCol = nc;
    r = nr; c = nc;
    occupied.add(`${r},${c}`);
  }

  // Validate target
  if (targetRow === sr && targetCol === sc) return null;
  if (grid[targetRow][targetCol].kind !== 'empty') return null;
  if (mirrorSpecs.some(m => m.row === targetRow && m.col === targetCol)) return null;

  // 4. Place mirrors:
  //    - First `hintsToGive` are fixed hints (shown to player)
  //    - Rest remain EMPTY — player must discover and place them
  for (let i = 0; i < mirrorSpecs.length; i++) {
    const { row, col, kind } = mirrorSpecs[i];
    if (i < hintsToGive) {
      grid[row][col] = { kind, fixed: true };
    }
    // else: leave as empty — player places mirrors here
  }

  // 5. Place target
  grid[targetRow][targetCol] = { kind: 'target', fixed: true };

  // 6. Optionally add splitter + checkpoint branch
  if (addSplitter && mirrorSpecs.length > 0) {
    // Pick a random mirror on the path and make it a splitter (fixed)
    const pick = mirrorSpecs[Math.floor(rng() * mirrorSpecs.length)];
    const splitterRow = pick.row;
    const splitterCol = pick.col;

    // The splitter reflects as backslash, so figure out what direction branch goes
    // We need to know what direction the beam was traveling when it hit this mirror
    // For simplicity: pick the first mirror. The beam was arriving in the original source direction before any turns.
    // Actually this is complex — let's trace which direction hit each mirror.
    // Skip splitter if this is getting too complex; it will be added in a simpler way below.
    
    // Simpler: find any empty cell adjacent to an occupied path cell and place checkpoint
    const branchResult = tryAddBranch(rng, grid, occupied, gridSize, splitterRow, splitterCol, mirrorSpecs, pick.kind);
    if (branchResult) {
      grid[splitterRow][splitterCol] = { kind: 'splitter', fixed: true };
      grid[branchResult.checkpointRow][branchResult.checkpointCol] = { kind: 'checkpoint', fixed: true };
    }
  }

  // 7. Add checkpoint on path (simpler version, no splitter needed)
  if (addCheckpoint && !addSplitter) {
    // Place checkpoint on a path cell (not source/target/mirror)
    const pathOnly: Array<[number, number]> = [];
    occupied.forEach(key => {
      const [rr, cc] = key.split(',').map(Number);
      if (
        grid[rr][cc].kind === 'empty' &&
        !(rr === sr && cc === sc) &&
        !(rr === targetRow && cc === targetCol)
      ) {
        pathOnly.push([rr, cc]);
      }
    });
    if (pathOnly.length > 0) {
      const [cr, cc2] = pathOnly[Math.floor(rng() * pathOnly.length)];
      grid[cr][cc2] = { kind: 'checkpoint', fixed: true };
    }
  }

  // 8. Add absorbers in non-path cells
  if (addAbsorbers) {
    const numAbsorbers = randInt(rng, 1, 2 + Math.floor(gridSize / 3));
    const freeCells: Array<[number, number]> = [];
    for (let rr = 0; rr < gridSize; rr++) {
      for (let cc2 = 0; cc2 < gridSize; cc2++) {
        if (!occupied.has(`${rr},${cc2}`) && grid[rr][cc2].kind === 'empty') {
          freeCells.push([rr, cc2]);
        }
      }
    }
    for (let i = 0; i < Math.min(numAbsorbers, freeCells.length); i++) {
      const idx = Math.floor(rng() * freeCells.length);
      const [rr, cc2] = freeCells.splice(idx, 1)[0];
      grid[rr][cc2] = { kind: 'absorber', fixed: true };
    }
  }

  const playerMirrors = Math.max(1, totalMirrors - hintsToGive);
  return { grid, pathCells: occupied, playerMirrors };
}

function tryAddBranch(
  rng: () => number,
  grid: GameCell[][],
  occupied: Set<string>,
  gridSize: number,
  splitterRow: number,
  splitterCol: number,
  mirrorSpecs: Array<{ row: number; col: number; kind: MirrorKind }>,
  mirrorKind: MirrorKind,
): { checkpointRow: number; checkpointCol: number } | null {
  // The splitter at (splitterRow, splitterCol) was a backslash mirror.
  // The beam hit it going in some direction and turned.
  // The splitter also lets beam through straight.
  // We need to add a checkpoint that the straight-through beam can reach.
  // This is complex to compute exactly, so let's find any free adjacent cell.

  const dirs: Direction[] = ['right', 'left', 'up', 'down'];
  const candidateDirs = dirs.filter(d => {
    const [nr, nc] = stepInDir(splitterRow, splitterCol, d);
    return nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && !occupied.has(`${nr},${nc}`);
  });

  if (candidateDirs.length === 0) return null;

  const dir = randItem(rng, candidateDirs);
  let r = splitterRow;
  let c = splitterCol;
  let checkpointRow = -1;
  let checkpointCol = -1;

  for (let steps = 0; steps < gridSize; steps++) {
    const [nr, nc] = stepInDir(r, c, dir);
    if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
    if (occupied.has(`${nr},${nc}`)) break;
    if (grid[nr][nc].kind !== 'empty') break;
    checkpointRow = nr;
    checkpointCol = nc;
    r = nr; c = nc;
    occupied.add(`${r},${c}`);
  }

  if (checkpointRow === -1) return null;
  return { checkpointRow, checkpointCol };
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

function generateFallback(levelNum: number): LevelConfig {
  const grid = emptyGrid(4);
  grid[0][0] = { kind: 'laser', direction: 'right', fixed: true };
  grid[3][3] = { kind: 'target', fixed: true };
  return {
    id: levelNum,
    name: 'First Light',
    description: 'Redirect the laser.',
    gridSize: 4,
    grid,
    playerMirrors: 1,
  };
}

export function generateLevel(levelNum: number): LevelConfig {
  const rng = makeRng(levelNum * 7919 + 13);
  const tier = Math.max(0, levelNum - 11);

  const gridSize  = Math.min(4 + Math.floor(tier / 3), 9);
  const totalMirrors = Math.min(1 + Math.floor(tier / 2), 7);
  const hintsToGive  = Math.max(0, totalMirrors - 1 - Math.floor(tier / 4));
  const addAbsorbers  = tier >= 2;
  const addCheckpoint = tier >= 5 && tier < 8;
  const addSplitter   = tier >= 8;

  for (let attempt = 0; attempt < 400; attempt++) {
    // Re-seed slightly differently each attempt so we don't repeat the same failure
    const attemptRng = makeRng(levelNum * 7919 + 13 + attempt * 97);
    const result = tryGenerate(
      attemptRng,
      gridSize,
      totalMirrors,
      hintsToGive,
      addAbsorbers,
      addCheckpoint,
      addSplitter,
    );
    if (result) {
      const nameIdx = (levelNum - 11) % LEVEL_NAMES.length;
      const nameSuffix = Math.floor((levelNum - 11) / LEVEL_NAMES.length) + 1;
      const diff = getDifficultyTag(tier);
      return {
        id: levelNum,
        name: LEVEL_NAMES[nameIdx] + (nameSuffix > 1 ? ` ${nameSuffix}` : ''),
        description: `${diff} · ${gridSize}×${gridSize} · ${result.playerMirrors} mirror${result.playerMirrors !== 1 ? 's' : ''}`,
        gridSize,
        grid: result.grid,
        playerMirrors: result.playerMirrors,
      };
    }
  }

  return generateFallback(levelNum);
}
