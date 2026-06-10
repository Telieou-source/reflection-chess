export type Direction = 'right' | 'left' | 'up' | 'down';
export type Side = 'left' | 'right' | 'top' | 'bottom';
export type CellKind =
  | 'empty'
  | 'laser'
  | 'target'
  | 'wall'
  | 'mirror-slash'
  | 'mirror-backslash'
  | 'splitter'       // player-placed; splits beam (backslash + straight-through)
  | 'checkpoint'     // beam passes through; must be hit for win
  | 'absorber'       // forbidden — beam touching this resets the puzzle
  | 'fiber-entry'    // underground tunnel entrance; paired with a fiber-exit
  | 'fiber-exit';    // underground tunnel exit; paired with a fiber-entry

export interface GameCell {
  kind: CellKind;
  direction?: Direction;
  fixed: boolean;
  fiberId?: number;          // links a fiber-entry to its matching fiber-exit
  checkpointOrder?: number;  // 1-based order; beam must hit checkpoints in this order
}

export interface LaserSegment {
  row: number;
  col: number;
  from: Side;
  to: Side;
  /** fiber-entry only: coordinates of the matching exit cell */
  tunnelTo?: { row: number; col: number };
}

export interface LaserResult {
  segments: LaserSegment[];
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;           // which cells were lit (for animation)
  checkpointsHitInOrder: number[];       // order values as they were encountered
  selfCross: boolean;
  crossPos: { row: number; col: number } | null;
  hitForbidden: boolean;
  forbiddenPos: { row: number; col: number } | null;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  gridSize: number;
  grid: GameCell[][];
  playerMirrors: number;
}

export type SelectedTool = 'slash' | 'backslash' | 'splitter' | 'bomb' | 'fiber';

export interface Inventory {
  splitter: number;
  bomb: number;
  fiber: number;
}

export interface ShopItem {
  id: keyof Inventory;
  name: string;
  description: string;
  cost: number;
  icon: string;
}
