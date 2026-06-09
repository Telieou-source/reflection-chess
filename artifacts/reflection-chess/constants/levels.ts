import type { Direction, GameCell, LevelConfig } from '../types/game';

function empty(): GameCell { return { kind: 'empty', fixed: false }; }
function laser(direction: Direction): GameCell { return { kind: 'laser', direction, fixed: true }; }
function target(): GameCell { return { kind: 'target', fixed: true }; }
function wall(): GameCell { return { kind: 'wall', fixed: true }; }
function slashFixed(): GameCell { return { kind: 'mirror-slash', fixed: true }; }
function backFixed(): GameCell { return { kind: 'mirror-backslash', fixed: true }; }
function checkpoint(): GameCell { return { kind: 'checkpoint', fixed: true }; }

function makeGrid(size: number): GameCell[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => empty())
  );
}

function place(
  grid: GameCell[][],
  cells: Array<{ r: number; c: number; cell: GameCell }>
): GameCell[][] {
  const g = grid.map(row => row.map(cell => ({ ...cell })));
  for (const { r, c, cell } of cells) {
    g[r][c] = cell;
  }
  return g;
}

// Level 1 (4x4): laser(0,0)→right, target(3,3)
// Solution: \ at (0,3) → beam turns DOWN col3 → (1,3)(2,3)(3,3)=target
// Checkpoint at (2,3) is on the vertical segment.
const level1 = (): LevelConfig => {
  const g = makeGrid(4);
  return {
    id: 1,
    name: 'First Light',
    description: 'Redirect the laser through the gate to the target.',
    gridSize: 4,
    playerMirrors: 1,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 2, c: 3, cell: checkpoint() },
      { r: 3, c: 3, cell: target() },
    ]),
  };
};

// Level 2 (5x5): laser(0,0)→right, target(4,0)
// Solution: \ at (0,4) → DOWN col4, / at (4,4) → LEFT row4 → (4,0)=target
// Checkpoint at (2,4) on the vertical segment.
const level2 = (): LevelConfig => {
  const g = makeGrid(5);
  return {
    id: 2,
    name: 'Double Bounce',
    description: 'Two reflections required. Pass through the gate.',
    gridSize: 5,
    playerMirrors: 2,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 2, c: 4, cell: checkpoint() },
      { r: 4, c: 0, cell: target() },
    ]),
  };
};

// Level 3 (5x5): laser(0,0)→down, fixed \ at (3,0), target(0,4)
// Beam: down col0 → (3,0) \ → RIGHT row3
// Solution: / at (3,4) → UP col4 → (0,4)=target
// Checkpoint at (3,2) on the horizontal segment.
const level3 = (): LevelConfig => {
  const g = makeGrid(5);
  return {
    id: 3,
    name: 'Guided Path',
    description: 'A mirror is already in place. Pass through the gate.',
    gridSize: 5,
    playerMirrors: 1,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('down') },
      { r: 3, c: 0, cell: backFixed() },
      { r: 3, c: 2, cell: checkpoint() },
      { r: 0, c: 4, cell: target() },
    ]),
  };
};

// Level 4 (6x6): laser(0,2)→down, wall(3,2), target(5,5)
// Solution: \ at (2,2) → RIGHT row2, \ at (2,5) → DOWN col5 → (5,5)=target
// Checkpoint at (4,5) on the second vertical segment.
const level4 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 4,
    name: 'Obstacle',
    description: 'Navigate around the wall through the gate.',
    gridSize: 6,
    playerMirrors: 2,
    grid: place(g, [
      { r: 0, c: 2, cell: laser('down') },
      { r: 3, c: 2, cell: wall() },
      { r: 4, c: 5, cell: checkpoint() },
      { r: 5, c: 5, cell: target() },
    ]),
  };
};

// Level 5 (6x6): laser(5,5)→up, target(0,0)
// Solution: \ at (4,5) → LEFT row4, \ at (4,3) → UP col3, \ at (0,3) → LEFT row0 → (0,0)=target
// Checkpoint at (2,3) on the vertical segment of col3.
const level5 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 5,
    name: 'Triple Bounce',
    description: 'Three reflections to reach the target through the gate.',
    gridSize: 6,
    playerMirrors: 3,
    grid: place(g, [
      { r: 5, c: 5, cell: laser('up') },
      { r: 2, c: 3, cell: checkpoint() },
      { r: 0, c: 0, cell: target() },
    ]),
  };
};

// Level 6 (6x6): laser(0,0)→right, fixed \ at (0,5), target(5,0)
// Beam: right→(0,5)\→DOWN col5
// Solution: / at (4,5) → LEFT row4, / at (4,0) → DOWN col0 → (5,0)=target
// Checkpoint at (4,2) on the horizontal segment.
const level6 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 6,
    name: 'Corner Office',
    description: 'Use the top-right anchor to reach the opposite corner.',
    gridSize: 6,
    playerMirrors: 2,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 0, c: 5, cell: backFixed() },
      { r: 4, c: 2, cell: checkpoint() },
      { r: 5, c: 0, cell: target() },
    ]),
  };
};

// Level 7 (7x7): laser(0,0)→right, walls(3,3)(3,4), target(6,6)
// Solution: \ at (0,6) → DOWN col6 → (6,6)=target
// Checkpoint at (3,6) on the vertical segment (par=3, min is 1 mirror).
const level7 = (): LevelConfig => {
  const g = makeGrid(7);
  return {
    id: 7,
    name: 'Labyrinth',
    description: 'Walls narrow your options. Find the clear path through the gate.',
    gridSize: 7,
    playerMirrors: 3,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 3, c: 3, cell: wall() },
      { r: 3, c: 4, cell: wall() },
      { r: 3, c: 6, cell: checkpoint() },
      { r: 6, c: 6, cell: target() },
    ]),
  };
};

// Level 8 (7x7): laser(3,0)→right, target(0,6)
// Solution: / at (3,6) → UP col6 → (0,6)=target
// Checkpoint at (1,6) on the vertical segment (par=4, min is 1 mirror).
const level8 = (): LevelConfig => {
  const g = makeGrid(7);
  return {
    id: 8,
    name: 'Zigzag',
    description: 'Keep it bouncing through the gate.',
    gridSize: 7,
    playerMirrors: 4,
    grid: place(g, [
      { r: 3, c: 0, cell: laser('right') },
      { r: 1, c: 6, cell: checkpoint() },
      { r: 0, c: 6, cell: target() },
    ]),
  };
};

// Level 9 (8x8): laser(0,0)→down, walls(4,3)(4,4)(5,3), target(7,7)
// Solution: \ at (3,0) → RIGHT row3, \ at (3,7) → DOWN col7 → (7,7)=target
// Checkpoint at (3,4) on the horizontal segment.
const level9 = (): LevelConfig => {
  const g = makeGrid(8);
  return {
    id: 9,
    name: 'Maze Runner',
    description: 'Navigate a complex field through the gate.',
    gridSize: 8,
    playerMirrors: 4,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('down') },
      { r: 4, c: 3, cell: wall() },
      { r: 4, c: 4, cell: wall() },
      { r: 5, c: 3, cell: wall() },
      { r: 3, c: 4, cell: checkpoint() },
      { r: 7, c: 7, cell: target() },
    ]),
  };
};

// Level 10 (8x8): laser(0,7)→down, fixed \ at (2,5), fixed / at (5,2), target(7,0)
// Solution: / at (3,7) → LEFT row3, / at (3,0) → DOWN col0 → (7,0)=target
// Checkpoint at (3,4) on the horizontal segment.
const level10 = (): LevelConfig => {
  const g = makeGrid(8);
  return {
    id: 10,
    name: 'Grand Master',
    description: 'The ultimate reflection challenge. Pass through the gate.',
    gridSize: 8,
    playerMirrors: 5,
    grid: place(g, [
      { r: 0, c: 7, cell: laser('down') },
      { r: 2, c: 5, cell: backFixed() },
      { r: 5, c: 2, cell: slashFixed() },
      { r: 3, c: 4, cell: checkpoint() },
      { r: 7, c: 0, cell: target() },
    ]),
  };
};

export const LEVELS: LevelConfig[] = [
  level1(),
  level2(),
  level3(),
  level4(),
  level5(),
  level6(),
  level7(),
  level8(),
  level9(),
  level10(),
];
