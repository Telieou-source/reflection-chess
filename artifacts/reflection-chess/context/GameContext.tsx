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
import { traceLaser } from '@/utils/laser';

const STORAGE_KEY = '@reflection_chess_progress';

interface GameState {
  level: LevelConfig;
  grid: GameCell[][];
  hitTargets: Set<string>;
  isSolved: boolean;
  remainingMirrors: number;
  selectedMirrorType: 'slash' | 'backslash';
  history: GameCell[][][];
}

interface GameContextType {
  state: GameState | null;
  completedLevels: number[];
  loadLevel: (id: number) => void;
  tapCell: (row: number, col: number) => void;
  setMirrorType: (type: 'slash' | 'backslash') => void;
  undo: () => void;
  resetLevel: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

function computeState(level: LevelConfig, grid: GameCell[][]): {
  hitTargets: Set<string>;
  isSolved: boolean;
} {
  const { segments, hitTargets } = traceLaser(grid, level.gridSize);
  void segments;
  let totalTargets = 0;
  for (let r = 0; r < level.gridSize; r++) {
    for (let c = 0; c < level.gridSize; c++) {
      if (level.grid[r][c].kind === 'target') totalTargets++;
    }
  }
  const isSolved = hitTargets.size === totalTargets && totalTargets > 0;
  return { hitTargets, isSolved };
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
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const data = JSON.parse(raw) as number[];
          setCompletedLevels(data);
        } catch {}
      }
    });
  }, []);

  const saveProgress = useCallback((ids: number[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, []);

  const loadLevel = useCallback((id: number) => {
    const level = LEVELS.find(l => l.id === id);
    if (!level) return;
    const grid = level.grid.map(row => row.map(cell => ({ ...cell })));
    const { hitTargets, isSolved } = computeState(level, grid);
    setState({
      level,
      grid,
      hitTargets,
      isSolved,
      remainingMirrors: level.playerMirrors,
      selectedMirrorType: 'slash',
      history: [],
    });
  }, []);

  const tapCell = useCallback((row: number, col: number) => {
    setState(prev => {
      if (!prev) return prev;
      const cell = prev.grid[row][col];
      if (cell.fixed) return prev;
      if (prev.isSolved) return prev;

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

      const { hitTargets, isSolved } = computeState(prev.level, newGrid);
      const usedMirrors = countPlayerMirrors(newGrid);
      const remaining = prev.level.playerMirrors - usedMirrors;

      if (isSolved) {
        const ids = prev.level.id;
        setCompletedLevels(prev2 => {
          const next = prev2.includes(ids) ? prev2 : [...prev2, ids];
          saveProgress(next);
          return next;
        });
      }

      return { ...prev, grid: newGrid, hitTargets, isSolved, remainingMirrors: remaining, history };
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
      const { hitTargets, isSolved } = computeState(prev.level, grid);
      const usedMirrors = countPlayerMirrors(grid);
      const remaining = prev.level.playerMirrors - usedMirrors;
      return { ...prev, grid, hitTargets, isSolved, remainingMirrors: remaining, history };
    });
  }, []);

  const resetLevel = useCallback(() => {
    setState(prev => {
      if (!prev) return prev;
      const grid = prev.level.grid.map(row => row.map(cell => ({ ...cell })));
      const { hitTargets, isSolved } = computeState(prev.level, grid);
      return {
        ...prev,
        grid,
        hitTargets,
        isSolved,
        remainingMirrors: prev.level.playerMirrors,
        history: [],
      };
    });
  }, []);

  return (
    <GameContext.Provider value={{ state, completedLevels, loadLevel, tapCell, setMirrorType, undo, resetLevel }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
