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
import type { GameCell, Inventory, LevelConfig, SelectedTool } from '@/types/game';
import { generateLevel } from '@/utils/generate';
import { traceLaser } from '@/utils/laser';

const STORAGE_KEY_PROGRESS  = '@reflection_chess_progress';
const STORAGE_KEY_COINS     = '@reflection_chess_coins';
const STORAGE_KEY_INVENTORY = '@reflection_chess_inventory';

interface GameState {
  level: LevelConfig;
  grid: GameCell[][];
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;
  isSolved: boolean;
  remainingMirrors: number;
  selectedTool: SelectedTool;
  history: GameCell[][][];
  coinsJustEarned: number | null;
}

interface GameContextType {
  state: GameState | null;
  completedLevels: Set<number>;
  coins: number;
  inventory: Inventory;
  loadLevel: (id: number) => void;
  tapCell: (row: number, col: number) => void;
  setTool: (tool: SelectedTool) => void;
  undo: () => void;
  resetLevel: () => void;
  getLevel: (id: number) => LevelConfig;
  purchaseItem: (id: keyof Inventory, cost: number) => boolean;
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
      if (level.grid[r][c].kind === 'target')     totalTargets++;
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

function computeCoinsEarned(par: number, mirrorsUsed: number): number {
  const underPar = par - mirrorsUsed;
  return Math.max(1, underPar + 1);
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [coins, setCoins] = useState(0);
  const [inventory, setInventory] = useState<Inventory>({ splitter: 0, bomb: 0 });
  const initialized = useRef(false);

  // Keep a ref to inventory so tapCell can read it synchronously
  const inventoryRef = useRef(inventory);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_PROGRESS),
      AsyncStorage.getItem(STORAGE_KEY_COINS),
      AsyncStorage.getItem(STORAGE_KEY_INVENTORY),
    ]).then(([rawProgress, rawCoins, rawInventory]) => {
      if (rawProgress) {
        try { setCompletedLevels(new Set(JSON.parse(rawProgress) as number[])); } catch {}
      }
      if (rawCoins) {
        const n = parseInt(rawCoins, 10);
        if (!isNaN(n)) setCoins(n);
      }
      if (rawInventory) {
        try {
          const inv = JSON.parse(rawInventory) as Partial<Inventory>;
          setInventory({ splitter: inv.splitter ?? 0, bomb: inv.bomb ?? 0 });
        } catch {}
      }
    });
  }, []);

  const saveInventory = useCallback((inv: Inventory) => {
    AsyncStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inv));
  }, []);

  const saveCoins = useCallback((amount: number) => {
    AsyncStorage.setItem(STORAGE_KEY_COINS, String(amount));
  }, []);

  const purchaseItem = useCallback((id: keyof Inventory, cost: number): boolean => {
    const currentCoins = coinsRef.current;
    if (currentCoins < cost) return false;
    const newCoins = currentCoins - cost;
    setCoins(newCoins);
    saveCoins(newCoins);
    setInventory(inv => {
      const next = { ...inv, [id]: inv[id] + 1 };
      saveInventory(next);
      return next;
    });
    return true;
  }, [saveCoins, saveInventory]);

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
      selectedTool: 'slash',
      history: [],
      coinsJustEarned: null,
    });
  }, []);

  const tapCell = useCallback((row: number, col: number) => {
    setState(prev => {
      if (!prev || prev.isSolved) return prev;

      const cell = prev.grid[row][col];

      // ── Bomb: destroy absorber ───────────────────────────────────────────
      if (prev.selectedTool === 'bomb' && cell.kind === 'absorber' && cell.fixed) {
        const inv = inventoryRef.current;
        if (inv.bomb <= 0) return prev;
        const newInv = { ...inv, bomb: inv.bomb - 1 };
        setInventory(newInv);
        saveInventory(newInv);
        const newGrid = prev.grid.map(r => r.map(c => ({ ...c })));
        newGrid[row][col] = { kind: 'empty', fixed: false };
        const { hitTargets, hitCheckpoints, isSolved } = computeSolved(prev.level, newGrid);
        const usedMirrors = countPlayerMirrors(newGrid);
        return {
          ...prev,
          grid: newGrid,
          hitTargets,
          hitCheckpoints,
          isSolved,
          remainingMirrors: prev.level.playerMirrors - usedMirrors,
          // No history push — bomb use is not undoable
        };
      }

      // ── Splitter: remove player-placed splitter (return to inventory) ────
      if (cell.kind === 'splitter' && !cell.fixed) {
        const inv = inventoryRef.current;
        const newInv = { ...inv, splitter: inv.splitter + 1 };
        setInventory(newInv);
        saveInventory(newInv);
        const newGrid = prev.grid.map(r => r.map(c => ({ ...c })));
        const history = [...prev.history, prev.grid.map(r => r.map(c => ({ ...c })))];
        newGrid[row][col] = { kind: 'empty', fixed: false };
        const { hitTargets, hitCheckpoints, isSolved } = computeSolved(prev.level, newGrid);
        const usedMirrors = countPlayerMirrors(newGrid);
        return { ...prev, grid: newGrid, hitTargets, hitCheckpoints, isSolved, remainingMirrors: prev.level.playerMirrors - usedMirrors, history };
      }

      // ── Fixed / non-tappable cells ───────────────────────────────────────
      if (cell.fixed) return prev;

      // ── Splitter: place from inventory ───────────────────────────────────
      if (prev.selectedTool === 'splitter' && cell.kind === 'empty') {
        const inv = inventoryRef.current;
        if (inv.splitter <= 0) return prev;
        const newInv = { ...inv, splitter: inv.splitter - 1 };
        setInventory(newInv);
        saveInventory(newInv);
        const newGrid = prev.grid.map(r => r.map(c => ({ ...c })));
        const history = [...prev.history, prev.grid.map(r => r.map(c => ({ ...c })))];
        newGrid[row][col] = { kind: 'splitter', fixed: false };
        const { hitTargets, hitCheckpoints, isSolved } = computeSolved(prev.level, newGrid);
        const usedMirrors = countPlayerMirrors(newGrid);
        let coinsJustEarned = prev.coinsJustEarned;
        if (isSolved && !prev.isSolved) {
          coinsJustEarned = computeCoinsEarned(prev.level.playerMirrors, usedMirrors);
          const earned = coinsJustEarned;
          const levelId = prev.level.id;
          setCompletedLevels(prev2 => {
            const next = new Set(prev2);
            next.add(levelId);
            AsyncStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify([...next]));
            return next;
          });
          setCoins(c => {
            const next = c + earned;
            AsyncStorage.setItem(STORAGE_KEY_COINS, String(next));
            return next;
          });
        }
        return { ...prev, grid: newGrid, hitTargets, hitCheckpoints, isSolved, remainingMirrors: prev.level.playerMirrors - usedMirrors, history, coinsJustEarned };
      }

      // ── Regular mirror placement / cycling ───────────────────────────────
      const newGrid = prev.grid.map(r => r.map(c => ({ ...c })));
      const history = [...prev.history, prev.grid.map(r => r.map(c => ({ ...c })))];

      if (cell.kind === 'empty') {
        if (prev.remainingMirrors <= 0) return prev;
        const kind = prev.selectedTool === 'backslash' ? 'mirror-backslash' : 'mirror-slash';
        newGrid[row][col] = { kind, fixed: false };
      } else if (cell.kind === 'mirror-slash') {
        newGrid[row][col] = { kind: 'mirror-backslash', fixed: false };
      } else if (cell.kind === 'mirror-backslash') {
        newGrid[row][col] = { kind: 'empty', fixed: false };
      } else {
        return prev;
      }

      const { hitTargets, hitCheckpoints, isSolved } = computeSolved(prev.level, newGrid);
      const usedMirrors = countPlayerMirrors(newGrid);
      const remaining = prev.level.playerMirrors - usedMirrors;

      let coinsJustEarned = prev.coinsJustEarned;
      if (isSolved && !prev.isSolved) {
        coinsJustEarned = computeCoinsEarned(prev.level.playerMirrors, usedMirrors);
        const earned = coinsJustEarned;
        const levelId = prev.level.id;
        setCompletedLevels(prev2 => {
          const next = new Set(prev2);
          next.add(levelId);
          AsyncStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify([...next]));
          return next;
        });
        setCoins(c => {
          const next = c + earned;
          AsyncStorage.setItem(STORAGE_KEY_COINS, String(next));
          return next;
        });
      }

      return { ...prev, grid: newGrid, hitTargets, hitCheckpoints, isSolved, remainingMirrors: remaining, history, coinsJustEarned };
    });
  }, [saveInventory]);

  const setTool = useCallback((tool: SelectedTool) => {
    setState(prev => prev ? { ...prev, selectedTool: tool } : prev);
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
        coinsJustEarned: null,
      };
    });
  }, []);

  const ctxGetLevel = useCallback((id: number) => getLevel(id), []);

  return (
    <GameContext.Provider value={{
      state, completedLevels, coins, inventory,
      loadLevel, tapCell, setTool, undo, resetLevel,
      getLevel: ctxGetLevel, purchaseItem,
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
