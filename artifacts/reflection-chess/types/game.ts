export type Direction = 'right' | 'left' | 'up' | 'down';
export type Side = 'left' | 'right' | 'top' | 'bottom';
export type CellKind =
  | 'empty'
  | 'laser'
  | 'target'
  | 'wall'
  | 'mirror-slash'
  | 'mirror-backslash'
  | 'splitter'      // passes beam + reflects (backslash rule); always fixed
  | 'checkpoint'    // beam passes through; must be hit for win
  | 'absorber';     // destroys beam; must route around

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
