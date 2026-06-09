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

type AnimState = 'none' | 'short-circuit' | 'combustion';

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
  // Beam state — false until player explicitly fires
  beamFired: boolean;
  // Animation
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

interface SolvedResult {
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;
  isSolved: boolean;
  selfCross: boolean;
  crossPos: { row: number; col: number } | null;
  hitForbidden: boolean;
  forbiddenPos: { row: number; col: number } | null;
}

function computeSolved(level: LevelConfig, grid: GameCell[][]): SolvedResult {
  const result = traceLaser(grid, level.gridSize);
  const { hitTargets, hitCheckpoints, selfCross, crossPos, hitForbidden, forbiddenPos } = result;

  if (selfCross || hitForbidden) {
    return { hitTargets, hitCheckpoints, isSolved: false, selfCross, crossPos, hitForbidden, forbiddenPos };
  }

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

  return { hitTargets, hitCheckpoints, isSolved, selfCross: false, crossPos: null, hitForbidden: false, forbiddenPos: null };
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

function emptyBeamState() {
  return {
    beamFired: false as const,
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
  const [inventory, setInventory] = useState<Inventory>({ splitter: 0, bomb: 0, fiber: 0 });
  const initialized = useRef(false);

  const inventoryRef = useRef(inventory);
  useEffect(() => { inventoryRef.current = inventory; }, [inventory]);

  const coinsRef = useRef(coins);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  // ── Persist helpers ────────────────────────────────────────────────────────
  const saveInventory = useCallback((inv: Inventory) => {
    AsyncStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inv));
  }, []);

  const saveCoins = useCallback((amount: number) => {
    AsyncStorage.setItem(STORAGE_KEY_COINS, String(amount));
  }, []);

  // ── Load persisted state ───────────────────────────────────────────────────
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
          setInventory({ splitter: inv.splitter ?? 0, bomb: inv.bomb ?? 0, fiber: inv.fiber ?? 0 });
        } catch {}
      }
    });
  }, []);

  // ── Auto-reset after animation ─────────────────────────────────────────────
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetLevel = useCallback(() => {
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    setState(prev => {
      if (!prev) return prev;
      const grid = cloneGrid(prev.level.grid);
      return {
        ...prev,
        grid,
        ...emptyBeamState(),
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
    animTimerRef.current = setTimeout(() => {
      resetLevel();
    }, 1600);
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [state?.animState, resetLevel]);

  // ── loadLevel ──────────────────────────────────────────────────────────────
  const loadLevel = useCallback((id: number) => {
    if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }
    const level = getLevel(id);
    const grid = cloneGrid(level.grid);
    setState({
      level,
      grid,
      ...emptyBeamState(),
      remainingMirrors: level.playerMirrors,
      selectedTool: 'slash',
      history: [],
      coinsJustEarned: null,
      fiberPhase: 'idle',
      pendingFiberEntry: null,
      nextFiberId: 0,
    });
  }, []);

  // ── purchaseItem ───────────────────────────────────────────────────────────
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

  // ── fireBeam ───────────────────────────────────────────────────────────────
  // Runs the laser trace, evaluates solved state, triggers animations.
  const fireBeam = useCallback(() => {
    setState(prev => {
      if (!prev || prev.isSolved) return prev;
      if (animTimerRef.current) { clearTimeout(animTimerRef.current); animTimerRef.current = null; }

      const { hitTargets, hitCheckpoints, isSolved, selfCross, crossPos, hitForbidden, forbiddenPos } =
        computeSolved(prev.level, prev.grid);

      const animState: AnimState = selfCross ? 'short-circuit' : hitForbidden ? 'combustion' : 'none';
      const animPos = selfCross ? crossPos : hitForbidden ? forbiddenPos : null;

      const usedMirrors = countPlayerMirrors(prev.grid);
      let coinsJustEarned = prev.coinsJustEarned;

      if (isSolved && !prev.isSolved) {
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

      return {
        ...prev,
        beamFired: true,
        hitTargets,
        hitCheckpoints,
        isSolved,
        animState,
        animPos,
        coinsJustEarned,
      };
    });
  }, []);

  // ── tapCell ─────────────────────────────────────────────────────────────────
  // Modifies the board; resets beam so player must re-fire to see the result.
  const tapCell = useCallback((row: number, col: number) => {
    setState(prev => {
      if (!prev || prev.isSolved) return prev;
      if (prev.animState !== 'none') return prev;

      const cell = prev.grid[row][col];

      // ── Bomb: destroy a fixed absorber ────────────────────────────────────
      if (prev.selectedTool === 'bomb' && cell.kind === 'absorber' && cell.fixed) {
        const inv = inventoryRef.current;
        if (inv.bomb <= 0) return prev;
        const newInv = { ...inv, bomb: inv.bomb - 1 };
        setInventory(newInv);
        saveInventory(newInv);
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'empty', fixed: false };
        const usedMirrors = countPlayerMirrors(newGrid);
        return {
          ...prev,
          grid: newGrid,
          ...emptyBeamState(),
          remainingMirrors: prev.level.playerMirrors - usedMirrors,
        };
      }

      // ── Fiber tool ────────────────────────────────────────────────────────
      if (prev.selectedTool === 'fiber') {
        // Remove an existing fiber pair
        if (
          prev.fiberPhase === 'idle' &&
          (cell.kind === 'fiber-entry' || cell.kind === 'fiber-exit') &&
          !cell.fixed
        ) {
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
          const usedMirrors = countPlayerMirrors(newGrid);
          return {
            ...prev,
            grid: newGrid,
            ...emptyBeamState(),
            remainingMirrors: prev.level.playerMirrors - usedMirrors,
            history: [...prev.history, cloneGrid(prev.grid)],
          };
        }

        // Cancel pending placement by re-tapping entry cell
        if (
          prev.fiberPhase === 'placing-exit' &&
          prev.pendingFiberEntry?.row === row &&
          prev.pendingFiberEntry?.col === col
        ) {
          const newGrid = cloneGrid(prev.grid);
          newGrid[row][col] = { kind: 'empty', fixed: false };
          const usedMirrors = countPlayerMirrors(newGrid);
          return {
            ...prev,
            grid: newGrid,
            ...emptyBeamState(),
            remainingMirrors: prev.level.playerMirrors - usedMirrors,
            fiberPhase: 'idle',
            pendingFiberEntry: null,
          };
        }

        // Phase 1: place provisional entry (no fiberId yet, tracer absorbs it)
        if (prev.fiberPhase === 'idle' && cell.kind === 'empty') {
          const inv = inventoryRef.current;
          if (inv.fiber <= 0) return prev;
          const newGrid = cloneGrid(prev.grid);
          newGrid[row][col] = { kind: 'fiber-entry', fixed: false };
          const usedMirrors = countPlayerMirrors(newGrid);
          return {
            ...prev,
            grid: newGrid,
            ...emptyBeamState(),
            remainingMirrors: prev.level.playerMirrors - usedMirrors,
            fiberPhase: 'placing-exit',
            pendingFiberEntry: { row, col },
          };
        }

        // Phase 2: place exit and link the pair
        if (prev.fiberPhase === 'placing-exit' && cell.kind === 'empty') {
          const inv = inventoryRef.current;
          const newInv = { ...inv, fiber: inv.fiber - 1 };
          setInventory(newInv);
          saveInventory(newInv);

          const fiberId = prev.nextFiberId;
          const newGrid = cloneGrid(prev.grid);
          const entryRow = prev.pendingFiberEntry!.row;
          const entryCol = prev.pendingFiberEntry!.col;
          newGrid[entryRow][entryCol] = { kind: 'fiber-entry', fixed: false, fiberId };
          newGrid[row][col] = { kind: 'fiber-exit', fixed: false, fiberId };

          const usedMirrors = countPlayerMirrors(newGrid);
          return {
            ...prev,
            grid: newGrid,
            ...emptyBeamState(),
            remainingMirrors: prev.level.playerMirrors - usedMirrors,
            history: [...prev.history, cloneGrid(prev.grid)],
            fiberPhase: 'idle',
            pendingFiberEntry: null,
            nextFiberId: fiberId + 1,
          };
        }

        return prev;
      }

      // ── Remove a player-placed splitter (return to inventory) ─────────────
      if (cell.kind === 'splitter' && !cell.fixed) {
        const inv = inventoryRef.current;
        setInventory({ ...inv, splitter: inv.splitter + 1 });
        saveInventory({ ...inv, splitter: inv.splitter + 1 });
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'empty', fixed: false };
        const usedMirrors = countPlayerMirrors(newGrid);
        return {
          ...prev,
          grid: newGrid,
          ...emptyBeamState(),
          remainingMirrors: prev.level.playerMirrors - usedMirrors,
          history: [...prev.history, cloneGrid(prev.grid)],
        };
      }

      // ── Fixed / non-interactive cells ─────────────────────────────────────
      if (cell.fixed) return prev;

      // ── Place a splitter from inventory ───────────────────────────────────
      if (prev.selectedTool === 'splitter' && cell.kind === 'empty') {
        const inv = inventoryRef.current;
        if (inv.splitter <= 0) return prev;
        setInventory({ ...inv, splitter: inv.splitter - 1 });
        saveInventory({ ...inv, splitter: inv.splitter - 1 });
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'splitter', fixed: false };
        const usedMirrors = countPlayerMirrors(newGrid);
        return {
          ...prev,
          grid: newGrid,
          ...emptyBeamState(),
          remainingMirrors: prev.level.playerMirrors - usedMirrors,
          history: [...prev.history, cloneGrid(prev.grid)],
        };
      }

      // ── Mirror placement / cycling ────────────────────────────────────────
      const newGrid = cloneGrid(prev.grid);

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

      const usedMirrors = countPlayerMirrors(newGrid);
      return {
        ...prev,
        grid: newGrid,
        ...emptyBeamState(),
        remainingMirrors: prev.level.playerMirrors - usedMirrors,
        history: [...prev.history, cloneGrid(prev.grid)],
      };
    });
  }, [saveInventory]);

  // ── setTool ────────────────────────────────────────────────────────────────
  const setTool = useCallback((tool: SelectedTool) => {
    setState(prev => {
      if (!prev) return prev;
      if (prev.fiberPhase === 'placing-exit' && prev.pendingFiberEntry) {
        const { row, col } = prev.pendingFiberEntry;
        const newGrid = cloneGrid(prev.grid);
        newGrid[row][col] = { kind: 'empty', fixed: false };
        const usedMirrors = countPlayerMirrors(newGrid);
        return {
          ...prev,
          grid: newGrid,
          ...emptyBeamState(),
          remainingMirrors: prev.level.playerMirrors - usedMirrors,
          selectedTool: tool,
          fiberPhase: 'idle',
          pendingFiberEntry: null,
        };
      }
      return { ...prev, selectedTool: tool };
    });
  }, []);

  // ── undo ───────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setState(prev => {
      if (!prev || prev.history.length === 0) return prev;
      const history = [...prev.history];
      const grid = history.pop()!;
      const usedMirrors = countPlayerMirrors(grid);
      return {
        ...prev,
        grid,
        ...emptyBeamState(),
        remainingMirrors: prev.level.playerMirrors - usedMirrors,
        history,
        fiberPhase: 'idle',
        pendingFiberEntry: null,
      };
    });
  }, []);

  const ctxGetLevel = useCallback((id: number) => getLevel(id), []);

  return (
    <GameContext.Provider value={{
      state, completedLevels, coins, inventory,
      loadLevel, tapCell, fireBeam, setTool, undo, resetLevel,
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
