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

interface PathResult {
  grid: GameCell[][];
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
    // player mirrors left as empty — they'll be placed to solve
  }

  // 6. Place target
  grid[targetRow][targetCol] = { kind: 'target', fixed: true };

  // 7. Optionally add splitter (only replaces a backslash player mirror)
  //    The splitter reflects as backslash — so it only makes sense to swap a backslash mirror.
  //    Checkpoint is placed in the straight-through direction (the beam continues undeflected).
  let splitterMirrorIndex = -1;
  if (addSplitter) {
    // Candidates: player mirrors (index >= hintsToGive) that are backslash mirrors
    const candidates = mirrorSpecs
      .map((m, i) => ({ m, i }))
      .filter(({ m, i }) => i >= hintsToGive && m.kind === 'mirror-backslash');

    for (let attempt2 = 0; attempt2 < candidates.length; attempt2++) {
      const { m: pick, i: pickIdx } = candidates[Math.floor(rng() * candidates.length)];

      // Beam arrives at splitter going pick.arrivalDir
      // Splitter: continues straight in pick.arrivalDir AND reflects (backslash → reflectBackslash(arrivalDir))
      // The reflected direction is same as the original backslash mirror, so the path to target is preserved.
      // Place checkpoint in the straight-through direction (pick.arrivalDir) from the splitter.
      let cr = pick.row, cc = pick.col;
      let checkRow = -1, checkCol = -1;
      for (let steps = 0; steps < gridSize; steps++) {
        const [nr, nc] = stepInDir(cr, cc, pick.arrivalDir);
        if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize) break;
        if (occupied.has(`${nr},${nc}`)) break;
        if (grid[nr][nc].kind !== 'empty') break;
        checkRow = nr; checkCol = nc;
        cr = nr; cc = nc;
        occupied.add(`${cr},${cc}`);
      }

      if (checkRow !== -1) {
        grid[pick.row][pick.col] = { kind: 'splitter', fixed: true };
        grid[checkRow][checkCol] = { kind: 'checkpoint', fixed: true };
        splitterMirrorIndex = pickIdx;
        break;
      }
    }
  }

  // 8. Optionally add a checkpoint on the beam path (no splitter variant)
  //    We build the full solution grid first, run the tracer, then pick a cell the beam visits.
  if (addCheckpoint && !addSplitter && splitterMirrorIndex === -1) {
    const solutionGrid = cloneGrid(grid);
    for (let i = 0; i < mirrorSpecs.length; i++) {
      const { row, col, kind } = mirrorSpecs[i];
      if (i >= hintsToGive) {
        solutionGrid[row][col] = { kind, fixed: false };
      }
    }
    const { segments } = traceLaser(solutionGrid, gridSize);

    // Collect cells the beam passes through (not source, not target, not already special)
    const beamCells: Array<[number, number]> = [];
    for (const seg of segments) {
      const { row: sr2, col: sc2 } = seg;
      if (
        grid[sr2][sc2].kind === 'empty' &&
        !(sr2 === targetRow && sc2 === targetCol)
      ) {
        const key = `${sr2},${sc2}`;
        if (!beamCells.some(([rr, cc]) => rr === sr2 && cc === sc2)) {
          beamCells.push([sr2, sc2]);
        }
      }
    }

    if (beamCells.length > 0) {
      const [cpR, cpC] = beamCells[Math.floor(rng() * beamCells.length)];
      grid[cpR][cpC] = { kind: 'checkpoint', fixed: true };
    }
  }

  // 9. Add absorbers on non-path, non-special cells
  if (addAbsorbers) {
    const numAbsorbers = randInt(rng, 1, 2 + Math.floor(gridSize / 3));
    const freeCells: Array<[number, number]> = [];
    for (let rr = 0; rr < gridSize; rr++) {
      for (let cc = 0; cc < gridSize; cc++) {
        if (!occupied.has(`${rr},${cc}`) && grid[rr][cc].kind === 'empty') {
          freeCells.push([rr, cc]);
        }
      }
    }
    for (let i = 0; i < Math.min(numAbsorbers, freeCells.length); i++) {
      const idx = Math.floor(rng() * freeCells.length);
      const [rr, cc] = freeCells.splice(idx, 1)[0];
      grid[rr][cc] = { kind: 'absorber', fixed: true };
    }
  }

  // ─── VALIDATION PASS 1: solution must be solvable ───────────────────────
  // Build solution grid: place all player mirrors in their solution positions
  const solutionGrid = cloneGrid(grid);
  for (let i = hintsToGive; i < mirrorSpecs.length; i++) {
    const { row, col, kind } = mirrorSpecs[i];
    // Don't overwrite splitter (already fixed there)
    if (solutionGrid[row][col].kind === 'empty') {
      solutionGrid[row][col] = { kind, fixed: false };
    }
  }

  let totalTargets = 0, totalCheckpoints = 0;
  for (let rr = 0; rr < gridSize; rr++) {
    for (let cc = 0; cc < gridSize; cc++) {
      if (solutionGrid[rr][cc].kind === 'target')     totalTargets++;
      if (solutionGrid[rr][cc].kind === 'checkpoint') totalCheckpoints++;
    }
  }

  const { hitTargets: htSol, hitCheckpoints: hcSol } = traceLaser(solutionGrid, gridSize);
  if (htSol.size < totalTargets || hcSol.size < totalCheckpoints) return null;

  // ─── VALIDATION PASS 2: initial state must NOT be already won ───────────
  const { hitTargets: htInit, hitCheckpoints: hcInit } = traceLaser(grid, gridSize);
  const initSolved =
    totalTargets > 0 &&
    htInit.size >= totalTargets &&
    hcInit.size >= totalCheckpoints;
  if (initSolved) return null;

  // ─── Compute how many player mirrors the user must place ─────────────────
  // Player mirrors = non-hint specs that weren't replaced by a splitter
  const playerMirrors = mirrorSpecs.filter((spec, i) => {
    if (i < hintsToGive) return false;                     // hint — not player
    if (grid[spec.row][spec.col].kind === 'splitter') return false; // became splitter
    return true;
  }).length;

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
  const tier = Math.max(0, levelNum - 11);

  const gridSize      = Math.min(4 + Math.floor(tier / 3), 9);
  const totalMirrors  = Math.min(1 + Math.floor(tier / 2), 7);
  const hintsToGive   = Math.max(0, totalMirrors - 1 - Math.floor(tier / 4));
  const addAbsorbers  = tier >= 2;
  const addCheckpoint = tier >= 5 && tier < 9;
  const addSplitter   = tier >= 9;

  for (let attempt = 0; attempt < 400; attempt++) {
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
      const nameIdx   = (levelNum - 11) % LEVEL_NAMES.length;
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
