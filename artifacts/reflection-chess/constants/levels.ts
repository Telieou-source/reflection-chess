import type { Direction, GameCell, LevelConfig } from '../types/game';

function empty(): GameCell { return { kind: 'empty', fixed: false }; }
function laser(direction: Direction): GameCell { return { kind: 'laser', direction, fixed: true }; }
function target(): GameCell { return { kind: 'target', fixed: true }; }
function wall(): GameCell { return { kind: 'wall', fixed: true }; }
function slashFixed(): GameCell { return { kind: 'mirror-slash', fixed: true }; }
function backFixed(): GameCell { return { kind: 'mirror-backslash', fixed: true }; }

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

const level1 = (): LevelConfig => {
  const g = makeGrid(4);
  return {
    id: 1,
    name: 'First Light',
    description: 'Redirect the laser to the target.',
    gridSize: 4,
    playerMirrors: 1,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 3, c: 3, cell: target() },
    ]),
  };
};

const level2 = (): LevelConfig => {
  const g = makeGrid(5);
  return {
    id: 2,
    name: 'Double Bounce',
    description: 'Two reflections required.',
    gridSize: 5,
    playerMirrors: 2,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 4, c: 0, cell: target() },
    ]),
  };
};

const level3 = (): LevelConfig => {
  const g = makeGrid(5);
  return {
    id: 3,
    name: 'Guided Path',
    description: 'A mirror is already in place. Add one more.',
    gridSize: 5,
    playerMirrors: 1,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('down') },
      { r: 3, c: 0, cell: backFixed() },
      { r: 0, c: 4, cell: target() },
    ]),
  };
};

const level4 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 4,
    name: 'Obstacle',
    description: 'Navigate around the wall.',
    gridSize: 6,
    playerMirrors: 2,
    grid: place(g, [
      { r: 0, c: 2, cell: laser('down') },
      { r: 3, c: 2, cell: wall() },
      { r: 5, c: 5, cell: target() },
    ]),
  };
};

const level5 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 5,
    name: 'Triple Bounce',
    description: 'Three reflections to reach the target.',
    gridSize: 6,
    playerMirrors: 3,
    grid: place(g, [
      { r: 5, c: 5, cell: laser('up') },
      { r: 0, c: 0, cell: target() },
    ]),
  };
};

const level6 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 6,
    name: 'Corner Office',
    description: 'Use fixed mirrors as anchors.',
    gridSize: 6,
    playerMirrors: 2,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 0, c: 5, cell: backFixed() },
      { r: 5, c: 5, cell: slashFixed() },
      { r: 5, c: 0, cell: target() },
    ]),
  };
};

const level7 = (): LevelConfig => {
  const g = makeGrid(7);
  return {
    id: 7,
    name: 'Labyrinth',
    description: 'Walls narrow your options.',
    gridSize: 7,
    playerMirrors: 3,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 3, c: 3, cell: wall() },
      { r: 3, c: 4, cell: wall() },
      { r: 6, c: 6, cell: target() },
    ]),
  };
};

const level8 = (): LevelConfig => {
  const g = makeGrid(7);
  return {
    id: 8,
    name: 'Zigzag',
    description: 'Keep it bouncing.',
    gridSize: 7,
    playerMirrors: 4,
    grid: place(g, [
      { r: 3, c: 0, cell: laser('right') },
      { r: 0, c: 6, cell: target() },
    ]),
  };
};

const level9 = (): LevelConfig => {
  const g = makeGrid(8);
  return {
    id: 9,
    name: 'Maze Runner',
    description: 'Navigate a complex field.',
    gridSize: 8,
    playerMirrors: 4,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('down') },
      { r: 4, c: 3, cell: wall() },
      { r: 4, c: 4, cell: wall() },
      { r: 5, c: 3, cell: wall() },
      { r: 7, c: 7, cell: target() },
    ]),
  };
};

const level10 = (): LevelConfig => {
  const g = makeGrid(8);
  return {
    id: 10,
    name: 'Grand Master',
    description: 'The ultimate reflection challenge.',
    gridSize: 8,
    playerMirrors: 5,
    grid: place(g, [
      { r: 0, c: 7, cell: laser('down') },
      { r: 2, c: 5, cell: backFixed() },
      { r: 5, c: 2, cell: slashFixed() },
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
