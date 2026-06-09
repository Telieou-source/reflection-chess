import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { LEVELS } from '@/constants/levels';
import type { GameCell, LevelConfig } from '@/types/game';
import { generateLevel } from '@/utils/generate';
import { traceLaser } from '@/utils/laser';

const STORAGE_KEY = '@reflection_chess_progress';

interface GameState {
  level: LevelConfig;
  grid: GameCell[][];
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;
  isSolved: boolean;
  remainingMirrors: number;
  selectedMirrorType: 'slash' | 'backslash';
  history: GameCell[][][];
}

interface GameContextType {
  state: GameState | null;
  completedLevels: Set<number>;
  loadLevel: (id: number) => void;
  tapCell: (row: number, col: number) => void;
  setMirrorType: (type: 'slash' | 'backslash') => void;
  undo: () => void;
  resetLevel: () => void;
  getLevel: (id: number) => LevelConfig;
}

const GameContext = createContext<GameContextType | null>(null);

export function getLevel(id: number): LevelConfig {
  const tutorial = LEVELS.find(l => l.id === id);
  if (tutorial) return tutorial;
  return generateLevel(id);
}

function computeSolved(level: LevelConfig, grid: GameCell[][]): {
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;
  isSolved: boolean;
} {
  const { hitTargets, hitCheckpoints } = traceLaser(grid, level.gridSize);

  let totalTargets = 0;
  let totalCheckpoints = 0;
  for (let r = 0; r < level.gridSize; r++) {
    for (let c = 0; c < level.gridSize; c++) {
      if (level.grid[r][c].kind === 'target') totalTargets++;
      if (level.grid[r][c].kind === 'checkpoint') totalCheckpoints++;
    }
  }

  const isSolved =
    totalTargets > 0 &&
    hitTargets.size >= totalTargets &&
    hitCheckpoints.size >= totalCheckpoints;

  return { hitTargets, hitCheckpoints, isSolved };
}

function countPlayerMirrors(grid: GameCell[][]): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (!cell.fixed && (cell.kind === 'mirror-slash' || cell.kind === 'mirror-backslash')) {
        count++;
      }
    }
  }
  return count;
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const data = JSON.parse(raw) as number[];
          setCompletedLevels(new Set(data));
        } catch {}
      }
    });
  }, []);

  const saveProgress = useCallback((ids: Set<number>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  }, []);

  const loadLevel = useCallback((id: number) => {
    const level = getLevel(id);
    const grid = level.grid.map(row => row.map(cell => ({ ...cell })));
    const { hitTargets, hitCheckpoints, isSolved } = computeSolved(level, grid);
    setState({
      level,
      grid,
      hitTargets,
      hitCheckpoints,
      isSolved,
      remainingMirrors: level.playerMirrors,
      selectedMirrorType: 'slash',
      history: [],
    });
  }, []);

  const tapCell = useCallback((row: number, col: number) => {
    setState(prev => {
      if (!prev || prev.isSolved) return prev;
      const cell = prev.grid[row][col];
      if (cell.fixed) return prev;

      const newGrid = prev.grid.map(r => r.map(c => ({ ...c })));
      const history = [...prev.history, prev.grid.map(r => r.map(c => ({ ...c })))];

      if (cell.kind === 'empty') {
        if (prev.remainingMirrors <= 0) return prev;
        const kind = prev.selectedMirrorType === 'slash' ? 'mirror-slash' : 'mirror-backslash';
        newGrid[row][col] = { kind, fixed: false };
      } else if (cell.kind === 'mirror-slash') {
        newGrid[row][col] = { kind: 'mirror-backslash', fixed: false };
      } else if (cell.kind === 'mirror-backslash') {
        newGrid[row][col] = { kind: 'empty', fixed: false };
      }

      const { hitTargets, hitCheckpoints, isSolved } = computeSolved(prev.level, newGrid);
      const usedMirrors = countPlayerMirrors(newGrid);
      const remaining = prev.level.playerMirrors - usedMirrors;

      if (isSolved) {
        const levelId = prev.level.id;
        setCompletedLevels(prev2 => {
          if (prev2.has(levelId)) return prev2;
          const next = new Set(prev2);
          next.add(levelId);
          saveProgress(next);
          return next;
        });
      }

      return { ...prev, grid: newGrid, hitTargets, hitCheckpoints, isSolved, remainingMirrors: remaining, history };
    });
  }, [saveProgress]);

  const setMirrorType = useCallback((type: 'slash' | 'backslash') => {
    setState(prev => prev ? { ...prev, selectedMirrorType: type } : prev);
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (!prev || prev.history.length === 0) return prev;
      const history = [...prev.history];
      const grid = history.pop()!;
      const { hitTargets, hitCheckpoints, isSolved } = computeSolved(prev.level, grid);
      const usedMirrors = countPlayerMirrors(grid);
      const remaining = prev.level.playerMirrors - usedMirrors;
      return { ...prev, grid, hitTargets, hitCheckpoints, isSolved, remainingMirrors: remaining, history };
    });
  }, []);

  const resetLevel = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const grid = prev.level.grid.map(row => row.map(cell => ({ ...cell })));
      const { hitTargets, hitCheckpoints, isSolved } = computeSolved(prev.level, grid);
      return {
        ...prev,
        grid,
        hitTargets,
        hitCheckpoints,
        isSolved,
        remainingMirrors: prev.level.playerMirrors,
        history: [],
      };
    });
  }, []);

  const ctxGetLevel = useCallback((id: number) => getLevel(id), []);

  return (
    <GameContext.Provider value={{
      state, completedLevels, loadLevel, tapCell,
      setMirrorType, undo, resetLevel, getLevel: ctxGetLevel,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
