export type Direction = 'right' | 'left' | 'up' | 'down';
export type Side = 'left' | 'right' | 'top' | 'bottom';
export type CellKind =
  | 'empty'
  | 'laser'
  | 'target'
  | 'wall'
  | 'mirror-slash'
  | 'mirror-backslash'
  | 'splitter'      // player-placed from inventory; splits beam (backslash + straight-through)
  | 'checkpoint'    // beam passes through; must be hit for win
  | 'absorber';     // destroys beam; use bomb item to remove

export interface GameCell {
  kind: CellKind;
  direction?: Direction;
  fixed: boolean;
}

export interface LaserSegment {
  row: number;
  col: number;
  from: Side;
  to: Side;
}

export interface LaserResult {
  segments: LaserSegment[];
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;
}

export interface LevelConfig {
  id: number;
  name: string;
  description: string;
  gridSize: number;
  grid: GameCell[][];
  playerMirrors: number;
}

export type SelectedTool = 'slash' | 'backslash' | 'splitter' | 'bomb';

export interface Inventory {
  splitter: number;
  bomb: number;
}

export interface ShopItem {
  id: keyof Inventory;
  name: string;
  description: string;
  cost: number;
  icon: string;
}
