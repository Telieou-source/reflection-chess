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
import type { GameCell, Inventory, LaserSegment, LevelConfig, SelectedTool } from '@/types/game';
import { generateLevel } from '@/utils/generate';
import { traceLaser } from '@/utils/laser';

const STORAGE_KEY_PROGRESS  = '@reflection_chess_progress';
const STORAGE_KEY_COINS     = '@reflection_chess_coins';
const STORAGE_KEY_INVENTORY = '@reflection_chess_inventory';

type AnimState = 'none' | 'short-circuit' | 'combustion';

interface PendingBeamResult {
  isSolved: boolean;
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;
  selfCross: boolean;
  crossPos: { row: number; col: number } | null;
  hitForbidden: boolean;
  forbiddenPos: { row: number; col: number } | null;
  hitCoins: Set<string>;
}

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
  // Beam
  beamFired: boolean;
  allSegments: LaserSegment[];
  // Animation (applied after beam animation completes)
  animState: AnimState;
  animPos: { row: number; col: number } | null;
  // Fiber two-phase placement
  fiberPhase: 'idle' | 'placing-exit';
  pendingFiberEntry: { row: number; col: number } | null;
  nextFiberId: number;
}

interface GameContextType {
  state: GameState | null;
  completedLevels: Set<number>;
  coins: number;
  inventory: Inventory;
  loadLevel: (id: number) => void;
  tapCell: (row: number, col: number) => void;
  fireBeam: () => void;
  onBeamComplete: () => void;
  setTool: (tool: SelectedTool) => void;
  undo: () => void;
  resetLevel: () => void;
  getLevel: (id: number) => LevelConfig;
  purchaseItem: (id: keyof Inventory, cost: number) => boolean;
  spendCoins: (amount: number) => boolean;
  useExtraMirror: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function getLevel(id: number): LevelConfig {
  const tutorial = LEVELS.find(l => l.id === id);
  if (tutorial) return tutorial;
  return generateLevel(id);
}

function checkSolved(level: LevelConfig, hitTargets: Set<string>, checkpointsHitInOrder: number[]): boolean {
  let totalTargets = 0;
  const expectedOrders: number[] = [];
  for (let r = 0; r < level.gridSize; r++) {
    for (let c = 0; c < level.gridSize; c++) {
      if (level.grid[r][c].kind === 'target')     totalTargets++;
      if (level.grid[r][c].kind === 'checkpoint') {
        expectedOrders.push(level.grid[r][c].checkpointOrder ?? 1);
      }
    }
  }
  expectedOrders.sort((a, b) => a - b);
  if (totalTargets === 0) return false;
  if (hitTargets.size < totalTargets) return false;
  if (checkpointsHitInOrder.length < expectedOrders.length) return false;
  for (let i = 0; i < expectedOrders.length; i++) {
    if (checkpointsHitInOrder[i] !== expectedOrders[i]) return false;
  }
  return true;
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
  return Math.max(1, par - mirrorsUsed + 1);
}

function cloneGrid(grid: GameCell[][]): GameCell[][] {
  return grid.map(row => row.map(cell => ({ ...cell })));
}

function clearBeamState() {
  return {
    beamFired: false as const,
    allSegments: [] as LaserSegment[],
    hitTargets: new Set<string>(),
    hitCheckpoints: new Set<string>(),
    isSolved: false,
    animState: 'none' as AnimState,
    animPos: null as null,
  };
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState | null>(null);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [coins, setCoins] = useState(0);
  const [inventory, setInventory] = useState<Inventory>({ splitter: 0, bomb: 0, fiber: 0, mirror: 0 });
  const initialized = useRef(false);

  const pendingBeamResultRef = useRef<PendingBeamResult | null>(null);

  const inventoryRef = useRef(inventory);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  const saveInventory = useCallback((inv: Inventory) => {
    AsyncStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inv));
  }, []);

  const saveCoins = useCallback((amount: number) => {
    AsyncStorage.setItem(STORAGE_KEY_COINS, String(amount));
  }, []);

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
          setInventory({ splitter: inv.splitter ?? 0, bomb: inv.bomb ?? 0, fiber: inv.fiber ?? 0, mirror: inv.mirror ?? 0 });
        } catch {}
      }
    });
  }, []);

  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetLevel = useCallback(() => {
    if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    pendingBeamResultRef.current = null;
    setState(prev => {
      if (!prev) return prev;
      const grid = cloneGrid(prev.level.grid);
      return {
        ...prev,
        grid,
        ...clearBeamState(),
        remainingMirrors: prev.level.playerMirrors,
        history: [],
        coinsJustEarned: null,
        fiberPhase: 'idle',
        pendingFiberEntry: null,
      };
    });
  }, []);

  useEffect(() => {
    if (!state || state.animState === 'none') return;
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    animTimerRef.current = setTimeout(() => { resetLevel(); }, 1600);
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, [state?.animState, resetLevel]);

  const loadLevel = useCallback((id: number) => {
    if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    pendingBeamResultRef.current = null;
    const level = getLevel(id);
    const grid = cloneGrid(level.grid);
    setState({
      level,
      grid,
      ...clearBeamState(),
      remainingMirrors: level.playerMirrors,
      selectedTool: 'slash',
      history: [],
      coinsJustEarned: null,
      fiberPhase: 'idle',
      pendingFiberEntry: null,
      nextFiberId: 0,
    });
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

  const spendCoins = useCallback((amount: number): boolean => {
    const current = coinsRef.current;
    if (current < amount) return false;
    const next = current - amount;
    setCoins(next);
    saveCoins(next);
    return true;
  }, [saveCoins]);

  const useExtraMirror = useCallback(() => {
    const inv = inventoryRef.current;
    if (inv.mirror <= 0) return;
    const newInv = { ...inv, mirror: inv.mirror - 1 };
    setInventory(newInv);
    saveInventory(newInv);
    setState(prev => {
      if (!prev || prev.isSolved) return prev;
      return { ...prev, remainingMirrors: prev.remainingMirrors + 1 };
    });
  }, [saveInventory]);

  const fireBeam = useCallback(() => {
    setState(prev => {
      if (!prev || prev.isSolved) return prev;
      if (prev.animState !== 'none') return prev;

      const { segments, hitTargets, hitCheckpoints, checkpointsHitInOrder, selfCross, crossPos, hitForbidden, forbiddenPos, hitCoins } =
        traceLaser(prev.grid, prev.level.gridSize);

      const isSolved =
        !selfCross && !hitForbidden &&
        checkSolved(prev.level, hitTargets, checkpointsHitInOrder);

      pendingBeamResultRef.current = {
        isSolved, hitTargets, hitCheckpoints, selfCross, crossPos, hitForbidden, forbiddenPos, hitCoins,
      };

      return {
        ...prev,
        beamFired: true,
        allSegments: segments,
        hitTargets: new Set<string>(),
        hitCheckpoints: new Set<string>(),
        isSolved: false,
        animState: 'none',
        animPos: null,
      };
    });
  }, []);

  const onBeamComplete = useCallback(() => {
    const pending = pendingBeamResultRef.current;
    if (!pending) return;
    pendingBeamResultRef.current = null;

    setState(prev => {
      if (!prev) return prev;

      const { isSolved, hitTargets, hitCheckpoints, selfCross, crossPos, hitForbidden, forbiddenPos, hitCoins } = pending;

      const animState: AnimState = selfCross ? 'short-circuit' : hitForbidden ? 'combustion' : 'none';
      const animPos = selfCross ? crossPos : hitForbidden ? forbiddenPos : null;

      // Collect map coins — remove them from grid and credit balance
      let newGrid = prev.grid;
      if (hitCoins.size > 0) {
        newGrid = cloneGrid(prev.grid);
        let mapCoins = 0;
        for (const coinKey of hitCoins) {
          const [r, c] = coinKey.split(',').map(Number);
          const cell = newGrid[r][c];
          if (cell.kind === 'coin') {
            mapCoins += cell.coinValue ?? 1;
            newGrid[r][c] = { kind: 'empty', fixed: false };
          }
        }
        if (mapCoins > 0) {
          setCoins(cc => {
            const next = cc + mapCoins;
            AsyncStorage.setItem(STORAGE_KEY_COINS, String(next));
            return next;
          });
        }
      }

      let coinsJustEarned = null as number | null;
      if (isSolved && !prev.isSolved) {
        const usedMirrors = countPlayerMirrors(newGrid);
        coinsJustEarned = computeCoinsEarned(prev.level.playerMirrors, usedMirrors);
        const earned = coinsJustEarned;
        const levelId = prev.level.id;
        setCompletedLevels(prevSet => {
          const next = new Set(prevSet);
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

      return { ...prev, grid: newGrid, hitTargets, hitCheckpoints, isSolved, animState, animPos, coinsJustEarned };
    });
  }, []);

  const tapCell = useCallback((row: number, col: number) => {
    setState(prev => {
      if (!prev || prev.isSolved) return prev;
      if (prev.animState !== 'none') return prev;

      const cell = prev.grid[row][col];

      if (prev.selectedTool === 'bomb' && cell.kind === 'absorber' && cell.fixed) {
        const inv = inventoryRef.current;
        if (inv.bomb <= 0) return prev;
        const newInv = { ...inv, bomb: inv.bomb - 1 };
        setInventory(newInv);
        saveInventory(newInv);
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'empty', fixed: false };
        return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid) };
      }

      if (prev.selectedTool === 'fiber') {
        if (prev.fiberPhase === 'idle' && (cell.kind === 'fiber-entry' || cell.kind === 'fiber-exit') && !cell.fixed) {
          const fiberId = cell.fiberId;
          const newGrid = cloneGrid(prev.grid);
          newGrid[row][col] = { kind: 'empty', fixed: false };
          if (fiberId !== undefined) {
            for (let r = 0; r < prev.level.gridSize; r++) {
              for (let c = 0; c < prev.level.gridSize; c++) {
                const pc = newGrid[r][c];
                if (pc.fiberId === fiberId && (pc.kind === 'fiber-entry' || pc.kind === 'fiber-exit')) {
                  newGrid[r][c] = { kind: 'empty', fixed: false };
                }
              }
            }
            const inv = inventoryRef.current;
            const newInv = { ...inv, fiber: inv.fiber + 1 };
            setInventory(newInv);
            saveInventory(newInv);
          }
          return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), history: [...prev.history, cloneGrid(prev.grid)] };
        }

        if (prev.fiberPhase === 'placing-exit' && prev.pendingFiberEntry?.row === row && prev.pendingFiberEntry?.col === col) {
          const newGrid = cloneGrid(prev.grid);
          newGrid[row][col] = { kind: 'empty', fixed: false };
          return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), fiberPhase: 'idle', pendingFiberEntry: null };
        }

        if (prev.fiberPhase === 'idle' && cell.kind === 'empty') {
          const inv = inventoryRef.current;
          if (inv.fiber <= 0) return prev;
          const newGrid = cloneGrid(prev.grid);
          newGrid[row][col] = { kind: 'fiber-entry', fixed: false };
          return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), fiberPhase: 'placing-exit', pendingFiberEntry: { row, col } };
        }

        if (prev.fiberPhase === 'placing-exit' && cell.kind === 'empty') {
          const inv = inventoryRef.current;
          const newInv = { ...inv, fiber: inv.fiber - 1 };
          setInventory(newInv);
          saveInventory(newInv);
          const fiberId = prev.nextFiberId;
          const newGrid = cloneGrid(prev.grid);
          newGrid[prev.pendingFiberEntry!.row][prev.pendingFiberEntry!.col] = { kind: 'fiber-entry', fixed: false, fiberId };
          newGrid[row][col] = { kind: 'fiber-exit', fixed: false, fiberId };
          return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), history: [...prev.history, cloneGrid(prev.grid)], fiberPhase: 'idle', pendingFiberEntry: null, nextFiberId: fiberId + 1 };
        }

        return prev;
      }

      if (cell.kind === 'splitter' && !cell.fixed) {
        const inv = inventoryRef.current;
        const newInv = { ...inv, splitter: inv.splitter + 1 };
        setInventory(newInv);
        saveInventory(newInv);
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'empty', fixed: false };
        return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), history: [...prev.history, cloneGrid(prev.grid)] };
      }

      if (cell.fixed) return prev;

      if (prev.selectedTool === 'splitter' && cell.kind === 'empty') {
        const inv = inventoryRef.current;
        if (inv.splitter <= 0) return prev;
        const newInv = { ...inv, splitter: inv.splitter - 1 };
        setInventory(newInv);
        saveInventory(newInv);
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'splitter', fixed: false };
        return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), history: [...prev.history, cloneGrid(prev.grid)] };
      }

      const newGrid = cloneGrid(prev.grid);
      if (cell.kind === 'empty') {
        if (prev.remainingMirrors <= 0) return prev;
        newGrid[row][col] = { kind: prev.selectedTool === 'backslash' ? 'mirror-backslash' : 'mirror-slash', fixed: false };
      } else if (cell.kind === 'mirror-slash') {
        newGrid[row][col] = { kind: 'mirror-backslash', fixed: false };
      } else if (cell.kind === 'mirror-backslash') {
        newGrid[row][col] = { kind: 'empty', fixed: false };
      } else {
        return prev;
      }
      return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), history: [...prev.history, cloneGrid(prev.grid)] };
    });
  }, [saveInventory]);

  const setTool = useCallback((tool: SelectedTool) => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.fiberPhase === 'placing-exit' && prev.pendingFiberEntry) {
        const { row, col } = prev.pendingFiberEntry;
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'empty', fixed: false };
        return { ...prev, grid: newGrid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(newGrid), selectedTool: tool, fiberPhase: 'idle', pendingFiberEntry: null };
      }
      return { ...prev, selectedTool: tool };
    });
  }, []);

  const undo = useCallback(() => {
    pendingBeamResultRef.current = null;
    setState(prev => {
      if (!prev || prev.history.length === 0) return prev;
      const history = [...prev.history];
      const grid = history.pop()!;
      return { ...prev, grid, ...clearBeamState(), remainingMirrors: prev.level.playerMirrors - countPlayerMirrors(grid), history, fiberPhase: 'idle', pendingFiberEntry: null };
    });
  }, []);

  const ctxGetLevel = useCallback((id: number) => getLevel(id), []);

  return (
    <GameContext.Provider value={{
      state, completedLevels, coins, inventory,
      loadLevel, tapCell, fireBeam, onBeamComplete, setTool, undo, resetLevel,
      getLevel: ctxGetLevel, purchaseItem, spendCoins, useExtraMirror,
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
