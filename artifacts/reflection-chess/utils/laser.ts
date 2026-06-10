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
  const hitTargets            = new Set<string>();
  const hitCheckpoints        = new Set<string>();
  const checkpointsHitInOrder: number[] = [];

  // cell+direction visited — prevents infinite loops through the same cell in same direction
  const visited = new Set<string>();
  // cell-only visited — detects self-crossing (any two beam paths sharing a cell)
  const cellVisited = new Set<string>();

  let selfCross    = false;
  let crossPos:    { row: number; col: number } | null = null;
  let hitForbidden = false;
  let forbiddenPos: { row: number; col: number } | null = null;

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

    if (row < 0 || row >= gridSize || col < 0 || col >= gridSize) {
      // Wrap to opposite edge (torus topology)
      const wr = ((row % gridSize) + gridSize) % gridSize;
      const wc = ((col % gridSize) + gridSize) % gridSize;
      queue.push({ row: wr, col: wc, dir });
      continue;
    }

    // Loop guard (same cell + direction already processed)
    const key = `${row},${col},${dir}`;
    if (visited.has(key)) continue;
    visited.add(key);

    // ── Self-crossing check ─────────────────────────────────────────────────
    const cellKey = `${row},${col}`;
    if (cellVisited.has(cellKey)) {
      if (!selfCross) {
        selfCross = true;
        crossPos  = { row, col };
      }
      continue; // stop this beam path; don't extend further
    }
    cellVisited.add(cellKey);
    // ────────────────────────────────────────────────────────────────────────

    const cell = grid[row][col];
    const from = getEntrySide(dir);

    switch (cell.kind) {
      case 'wall':
        // Silently blocked — no segment, no penalty
        break;

      case 'absorber':
        // Forbidden contact — triggers combustion animation + reset
        if (!hitForbidden) {
          hitForbidden = true;
          forbiddenPos = { row, col };
        }
        // Still render a short segment up to the absorber so the player can see where the beam died
        segments.push({ row, col, from, to: getExitSide(dir) });
        break;

      case 'target': {
        segments.push({ row, col, from, to: getExitSide(dir) });
        hitTargets.add(`${row},${col}`);
        break;
      }

      case 'checkpoint': {
        segments.push({ row, col, from, to: getExitSide(dir) });
        hitCheckpoints.add(`${row},${col}`);
        checkpointsHitInOrder.push(cell.checkpointOrder ?? 1);
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
        // Straight-through
        segments.push({ row, col, from, to: getExitSide(dir) });
        const [nr1, nc1] = stepInDir(row, col, dir);
        queue.push({ row: nr1, col: nc1, dir });

        // And reflected (backslash direction)
        const reflDir = reflectBackslash(dir);
        if (reflDir !== dir) {
          segments.push({ row, col, from, to: getExitSide(reflDir) });
          const [nr2, nc2] = stepInDir(row, col, reflDir);
          queue.push({ row: nr2, col: nc2, dir: reflDir });
        }
        break;
      }

      case 'fiber-entry': {
        const fiberId = cell.fiberId;
        if (fiberId === undefined) {
          // Orphaned entry (pending placement) — absorb silently
          break;
        }

        // Find the paired exit
        let exitRow = -1;
        let exitCol = -1;
        search: for (let r2 = 0; r2 < gridSize; r2++) {
          for (let c2 = 0; c2 < gridSize; c2++) {
            const ec = grid[r2][c2];
            if (ec.kind === 'fiber-exit' && ec.fiberId === fiberId) {
              exitRow = r2;
              exitCol = c2;
              break search;
            }
          }
        }

        if (exitRow === -1) {
          // No exit found — absorb silently
          break;
        }

        // Segment showing beam entering the tunnel (tunnelTo drives the underground trace in Board)
        segments.push({ row, col, from, to: getExitSide(dir), tunnelTo: { row: exitRow, col: exitCol } });

        // Mark exit cell visited so no other beam can cross it
        const exitCellKey = `${exitRow},${exitCol}`;
        if (!cellVisited.has(exitCellKey)) {
          cellVisited.add(exitCellKey);
          // Segment showing beam emerging at exit (same direction)
          segments.push({ row: exitRow, col: exitCol, from: getEntrySide(dir), to: getExitSide(dir) });
        }

        // Continue beam from the cell after the exit in the same direction
        const [nr, nc] = stepInDir(exitRow, exitCol, dir);
        queue.push({ row: nr, col: nc, dir });
        break;
      }

      case 'fiber-exit':
        // A beam arriving directly at an exit (not teleported) just passes through
        // (This can happen if another beam somehow reaches it physically)
        segments.push({ row, col, from, to: getExitSide(dir) });
        {
          const [nr, nc] = stepInDir(row, col, dir);
          queue.push({ row: nr, col: nc, dir });
        }
        break;

      default: {
        // empty — beam passes straight through
        segments.push({ row, col, from, to: getExitSide(dir) });
        const [nr, nc] = stepInDir(row, col, dir);
        queue.push({ row: nr, col: nc, dir });
        break;
      }
    }
  }

  return {
    segments,
    hitTargets,
    hitCheckpoints,
    checkpointsHitInOrder,
    selfCross,
    crossPos,
    hitForbidden,
    forbiddenPos,
  };
}
