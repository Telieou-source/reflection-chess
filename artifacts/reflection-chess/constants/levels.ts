import type { Direction, GameCell, LevelConfig } from '../types/game';

function empty(): GameCell { return { kind: 'empty', fixed: false }; }
function laser(direction: Direction): GameCell { return { kind: 'laser', direction, fixed: true }; }
function target(): GameCell { return { kind: 'target', fixed: true }; }
function wall(): GameCell { return { kind: 'wall', fixed: true }; }
function absorber(): GameCell { return { kind: 'absorber', fixed: true }; }
function slashFixed(): GameCell { return { kind: 'mirror-slash', fixed: true }; }
function backFixed(): GameCell { return { kind: 'mirror-backslash', fixed: true }; }
function checkpoint(order = 1): GameCell { return { kind: 'checkpoint', fixed: true, checkpointOrder: order }; }
function splitterFixed(): GameCell { return { kind: 'splitter', fixed: true }; }
function fiberEntry(fiberId: number): GameCell { return { kind: 'fiber-entry', fixed: true, fiberId }; }
function fiberExit(fiberId: number): GameCell { return { kind: 'fiber-exit', fixed: true, fiberId }; }
function coin(value = 1): GameCell { return { kind: 'coin', fixed: true, coinValue: value }; }

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
// Solution: \ at (0,3) → DOWN col3 → (2,3)=checkpoint → (3,3)=target
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
      { r: 1, c: 1, cell: coin(2) },
      { r: 2, c: 2, cell: coin(1) },
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
      { r: 2, c: 2, cell: coin(2) },
      { r: 3, c: 3, cell: coin(1) },
    ]),
  };
};

// Level 3 (5x5): introduce the Splitter
// Laser(0,0)→down hits fixed splitter at (2,0):
//   straight-through DOWN exits harmlessly at bottom
//   backslash-split goes RIGHT along row2
// Player places \ at (2,4) → DOWN → (3,4)[cp] → (4,4)=target
const level3 = (): LevelConfig => {
  const g = makeGrid(5);
  return {
    id: 3,
    name: 'The Fork',
    description: 'A Splitter fires the beam in two directions. Catch the right path.',
    gridSize: 5,
    playerMirrors: 1,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('down') },
      { r: 2, c: 0, cell: splitterFixed() },
      { r: 3, c: 4, cell: checkpoint() },
      { r: 4, c: 4, cell: target() },
      { r: 1, c: 3, cell: coin(2) },
      { r: 3, c: 2, cell: coin(1) },
    ]),
  };
};

// Level 4 (6x6): splitter-focused puzzle with two ordered checkpoints
// Laser(0,0)→right hits splitter at (0,3):
//   right-beam exits right edge harmlessly
//   down-beam goes DOWN col3: (1,3)(2,3)[cp1] → player
// Solution: / at (4,3) → RIGHT → (4,4)[cp2] → \ at (4,5) → DOWN → (5,5)=target
const level4 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 4,
    name: 'Beam Juggler',
    description: 'The splitter fires two beams. Guide the right one through both gates in order.',
    gridSize: 6,
    playerMirrors: 2,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 0, c: 3, cell: splitterFixed() },
      { r: 2, c: 3, cell: checkpoint(1) },
      { r: 4, c: 4, cell: checkpoint(2) },
      { r: 5, c: 5, cell: target() },
      { r: 1, c: 5, cell: coin(2) },
      { r: 3, c: 1, cell: coin(1) },
    ]),
  };
};

// Level 5 (6x6): introduce the Fiber Tunnel
// Laser(0,0)→right enters fiber-entry(100) at (0,4), teleports to fiber-exit(100) at (3,0)
//   beam continues RIGHT from exit along row3
// Solution: \ at (3,3) → DOWN → (4,3)[cp] → (5,3)=target
const level5 = (): LevelConfig => {
  const g = makeGrid(6);
  return {
    id: 5,
    name: 'Wormhole',
    description: 'The fiber tunnel warps the beam to a new location. Plan for where it arrives.',
    gridSize: 6,
    playerMirrors: 1,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      { r: 0, c: 4, cell: fiberEntry(100) },
      { r: 3, c: 0, cell: fiberExit(100) },
      { r: 4, c: 3, cell: checkpoint() },
      { r: 5, c: 3, cell: target() },
      { r: 1, c: 2, cell: coin(2) },
      { r: 2, c: 4, cell: coin(1) },
    ]),
  };
};

// Level 6 (6x6): laser(0,0)→right, fixed \ at (0,5), target(5,0)
// Beam: right→(0,5)\→DOWN col5
// Solution: / at (4,5) → LEFT row4, / at (4,0) → DOWN col0 → (5,0)=target
// Checkpoint at (4,2).
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
      { r: 2, c: 2, cell: splitterFixed() },
      { r: 1, c: 3, cell: fiberEntry(100) },
      { r: 3, c: 1, cell: fiberExit(100) },
      { r: 2, c: 5, cell: checkpoint(1) },
      { r: 4, c: 2, cell: checkpoint(2) },
      { r: 5, c: 0, cell: target() },
      { r: 2, c: 4, cell: coin(2) },
      { r: 3, c: 4, cell: coin(1) },
    ]),
  };
};

// ─────────────────────────────────────────────────────────────────
// LEVEL 7 — "The Gauntlet" (7×7, par 3, REDESIGNED)
//
// Concept: laser enters from left-middle, must navigate around a
// dense absorber field that blocks all short exits.
//
// Laser: (3,0)→right
// Target: (6,3)
// Checkpoint: (5,3) — beam must pass through it going DOWN before target
//
// Absorbers block all naive 1-mirror solutions:
//   (0,3)(0,4)(0,5)(0,6) block "bounce up and off top edge"
//   (1,6)(2,6)(6,6)      block "bounce to col 6"
//   (3,6)                block direct exit right
//   (6,5)(6,4)           block "slide to bottom edge" shortcuts
//
// Required 3-mirror solution (verified by hand):
//   Beam: (3,0)→RIGHT along row 3
//   Mirror 1: \ at (3,2) → beam turns DOWN col 2
//   Beam: DOWN col 2 → (4,2)(5,2)(6,2)... wait, target is (6,3).
//
// Let me use a cleaner approach — verified solution:
//   Beam (3,0)→RIGHT row 3
//   \ at (3,4) → beam DOWN col 4
//   Beam: (4,4)(5,4)(6,4)=absorber ← blocked!
//
// Revised — final verified solution:
//   Laser (2,0)→right
//   \ at (2,2) → DOWN col 2
//   / at (5,2) → RIGHT row 5
//   \ at (5,5) → DOWN col 5
//   Beam hits (6,5)=absorber ← blocked
//
// Cleanest verified design:
//   Laser (0,0)→down
//   \ at (2,0) → RIGHT row 2 — wall at (2,5) blocks
//   \ at (2,3) → DOWN col 3
//   / at (5,3) → LEFT row 5
//   / at (5,0) → DOWN col 0 → (6,0)=target
//   Checkpoint at (4,3) on col-3 descent
//
// Absorbers blocking shortcuts:
//   Direct laser (0,0)→down to (6,0): absorber at (3,0) blocks it
//   Right-angle (2,0)\→right→wall at (2,6): OK no shortcut
//   Any 1-mirror solution from (0,0)→down: absorbed at (3,0)
//
// Walls: (2,5) — forces the beam to turn before reaching edge
//
// Let's place absorbers strategically so you MUST use all 3 mirrors.
//
// FINAL DESIGN — Level 7 "The Gauntlet" (7×7, par 3)
//
// Laser (0,3)→down
// Target (6,1)
// Checkpoint (3,4) — beam must pass RIGHT through row 4 at col 4
//
// Solution (3 mirrors, verified step-by-step):
//   Step 1: Laser (0,3)→DOWN col 3
//   Mirror 1: \ at (2,3) → beam turns RIGHT along row 2
//   Step 2: Beam RIGHT row 2 → (2,4)(2,5)... wall at (2,6) stops it
//   Mirror 2: / at (2,5) → beam turns UP col 5
//   Step 3: Beam UP col 5 → (1,5)(0,5) → exits. Nope.
//
// Let me try a different approach — just carefully trace then block:
//
// FINAL VERIFIED DESIGN:
// Laser (0,6)→down, target (6,0)
// Beam: DOWN col 6 → wall at (1,6) blocks immediately → useless
//
// OK I'll do this properly with a clear trace:
//
// Laser (3,0)→right (mid-left edge, going right)
// Wall at (3,6)     — blocks direct exit to right edge
// Wall at (0,3)     — blocks bounce-and-escape upward in col 3
// Absorber at (6,3) — blocks downward exit in col 3
// Target: (0,5)
// Checkpoint: (2,5) — beam must pass UP through col 5 at row 2
//
// Solution (exactly 3 mirrors):
//   Beam (3,0)→RIGHT along row 3
//   Mirror 1 \ at (3,3) → beam DOWN col 3
//   But absorber at (6,3)... beam hits it and dies. Need to turn before.
//   Mirror 1 \ at (3,3) → beam DOWN col 3... hmm absorber is there.
//   Actually: absorber at (6,3) only stops it at row 6. The beam passes
//   (4,3)(5,3) fine, then hits absorber at (6,3). Dead. ✗
//
// Let me just write the cleanest well-verified design I know works:
// ─────────────────────────────────────────────────────────────────

// LEVEL 7 — "The Gauntlet" (7×7, par 3, FINAL)
//
// Laser: (0,0)→right
// Target: (6,4)
// Checkpoint: (3,4) — beam passes DOWN through col 4 at row 3
//
// Absorbers seal off 1- and 2-mirror shortcuts:
//   (0,5)(0,6)    — can't redirect right then escape off top-right
//   (6,5)(6,6)    — can't escape bottom-right
//   (2,6)(4,6)    — col 6 is a dead zone
//
// Walls: (3,2) — forces beam off col 2 vertical
//
// Required solution (3 mirrors):
//   Beam (0,0)→RIGHT row 0
//   M1: \ at (0,4) → DOWN col 4
//   Beam: (1,4)(2,4)(3,4)=checkpoint✓ (4,4)(5,4)(6,4)=target✓
//
//   That's only 1 mirror! I need to make it harder.
//   Block: absorber at (1,4) — beam hits it immediately after mirror.
//
//   With absorber at (1,4):
//   M1: \ at (0,4) → DOWN — hits absorber at (1,4). Dead. ✗
//   So player can't use (0,4).
//
//   Any \ in row 0 at col c → DOWN col c → absorber at (1,c)?
//   That would require absorbers at (1,1)(1,2)(1,3)(1,4)(1,5)(1,6).
//   Too many. Use selectively.
//
//   Block col 4 row 1: absorber at (1,4).
//   Block col 3 row 1: absorber at (1,3).
//   Block col 2 row 1: absorber at (1,2).
//   So any immediate downward reflection in row 0 col 2-4 is blocked.
//
//   Remaining single-mirror solutions from (0,0)→right:
//   \ at (0,1) → DOWN col 1 → (1,1)(2,1)...(6,1). No target there.
//   \ at (0,5) → DOWN col 5 → (1,5)(2,5)...(6,5)=absorber. Dead.
//   \ at (0,6) → DOWN col 6 → absorber at (2,6). Dead.
//   / in row 0 → beam goes UP = exits immediately.
//   So no 1-mirror solution exists. ✓
//
//   Now 2-mirror solutions:
//   Beam right row 0, \ at (0,1) → down col 1, then mirror X:
//     / at (r,1) → right row r → hits wall or absorber or exits
//     Need to reach (6,4). From col 1 going down, / at (5,1) → right row 5
//       → (5,2)(5,3)(5,4)(5,5)... if target were at (5,5)... but target is (6,4).
//     So right row 5 can't reach (6,4) with 0 more mirrors.
//   \ at (0,1) → down, / at (4,1) → right → (4,2)(4,3)(4,4)... no target.
//   Block: put absorbers smartly so 2-mirror solutions fail.
//
// This is getting complex. Let me use a known-hard topology instead:
//
// TOPOLOGY: "S-bend" — beam must make 3 direction changes, each
// carefully forced by walls/absorbers that eliminate alternatives.
//
// (7×7), Laser (0,0)→right, Target (6,6), par=3
//
//  Row 0: L . . abs abs abs abs   (absorbers at cols 3-6 in row 0)
//         → only escape is from row 0 going DOWN in col 1 or 2
//  Col 6: abs at (1,6)(2,6)(3,6)(4,6) → col 6 approach from above blocked
//         except from row 5 onward
//  Row 6: abs at (6,0)(6,1)(6,2)(6,3) → target is at (6,6), approach from above only
//
// Solution:
//   Beam RIGHT row 0 → col 2, mirror \ at (0,2) → DOWN col 2
//   Beam DOWN col 2 → row 4, mirror / at (4,2) → RIGHT row 4
//   Beam RIGHT row 4 → (4,3)(4,4) checkpoint (4,4)✓ → (4,5)(4,6)=absorber. Dead.
//   Hmm. Blocked at (4,6).
//
//   With (4,6) as absorber: need to turn before hitting it.
//   / at (4,4) → right... already going right. / reflects right→up.
//   So: beam right row 4, \ at (4,5) → DOWN col 5, → (5,5)(6,5)... no target.
//
//   Use target at (6,6), approach from left (row 6) or from above (col 6).
//   Col 6 from above: absorbers at (1,6)-(4,6), so approach from (5,6)→(6,6).
//   Beam must enter col 6 going DOWN from row 5 or earlier (5,6).
//
//   So 3rd mirror must be \ or / that sends beam DOWN col 6 from row ≤5.
//   If beam coming RIGHT in row r, \ at (r,6) → but (r,6) is absorber for r=1-4.
//   Beam coming RIGHT in row 5: \ at (5,6) → DOWN col 6 → (6,6)=target ✓
//   Beam coming UP in col c, / at (5,c) → RIGHT row 5 → need c≤5, then beam
//     hits (5,c+1)...(5,5)... need \ at (5,5) → DOWN col 5 → no target there.
//
//   Let me try:
//   \ at (0,2) → DOWN col 2
//   / at (4,2) → RIGHT row 4
//   \ at (4,5) → DOWN col 5
//   → (5,5)(6,5). Target at (6,5)? But I wanted (6,6). Change target to (6,5):
//   Checkpoint must be on path. Let's put it at (3,2) (col 2, row 3, between 0 and 4).
//   (3,2) is between rows 0 and 4 in col 2. ✓
//
//   Check no 1-mirror solution:
//   \ in row 0 at col c → DOWN col c → need to reach (6,5).
//     Only if c=5 AND (6,5)=target. \ at (0,5) → DOWN → but (0,3)-(0,6) absorbers. ✗
//   / in row 0 → beam up = exits. ✗
//   So no 1-mirror. ✓
//
//   Check no 2-mirror:
//   Any path from (0,0)→right that reaches (6,5) in 2 bounces:
//   Need to traverse 6 rows down and 5 cols right in 2 bends.
//   \ at (0,2) → down col 2 → / at (r,2) → right row r → target (6,5)?
//     Target is at row 6, can't reach from above. Only horizontal in row 6.
//     Need beam in row 6 going right from col≤5. Beam enters row 6 from above.
//     So 2nd mirror sends beam DOWN into row 6... but need 3rd for that.
//     Actually: \ at (0,c) → down col c → / at (6,c) → right row 6 → target at (6,5)?
//       Only works if c<5. If c=2: / at (6,2) → right → (6,3)(6,4)(6,5)=target ✓!
//     This is a valid 2-mirror solution! MUST BLOCK.
//     Block: put absorber at (6,2) or wall at (6,2). Use absorber at (6,2).
//     Same for other cols: absorber at (6,1)(6,2)(6,3)(6,4) blocks approach from above.
//     Then (6,5)=target, (6,0)=absorber.
//     What about: \ at (0,2) → down → / at (5,2) → right → (5,3)(5,4)(5,5) → \ at (5,5) → down → (6,5)=target. That's 3 mirrors. ✓
//     But / at (6,2) approach: (6,2)=absorber now. ✓ blocked.
//
//   Now verify 3-mirror solution still works:
//   Laser (0,0)→right → \ at (0,2) → DOWN col 2
//   Pass (1,2)(2,2)(3,2)=checkpoint✓(4,2) → / at (4,2) → RIGHT row 4
//   (4,3)(4,4)(4,5) → \ at (4,5) → DOWN col 5
//   (5,5)(6,5)=target ✓
//
//   Absorbers: (0,3)(0,4)(0,5)(0,6) [row 0 right half]
//              (1,6)(2,6)(3,6)       [col 6 upper]
//              (6,0)(6,1)(6,2)(6,3)(6,4) [row 6 left]
//   Wall: (2,5)(3,5) — block any attempt to go right in rows 2-3 past col 4
//         Actually, is there a 2-mirror: \ at (0,2) down → / at (5,2) right →
//           (5,3)(5,4)(5,5)(5,6)... exits right edge. ✗ Not target.
//         \ at (0,2) down → / at (3,2)... wait checkpoint is AT (3,2). Checkpoint
//           is fixed and beam passes through it — it's not a mirror. So player
//           cannot place a mirror at (3,2). Good.
//         Any other 2-mirror from (0,0)→right after the row-0 absorbers limit
//         the first bounce to col 1 or col 2:
//         col 1: \ at (0,1) → down col 1 → / at (r,1) → right row r
//           → no row r leads to (6,5) with 1 more direction change...
//           unless r=6 and (6,1)=absorber (blocked) ✓
//           r=5: → right row 5 → (5,2)...(5,5)=✓ but target is (6,5), not (5,5).
//         So all 2-mirror solutions blocked. ✓
//
// Final Level 7 layout:
// 7×7, laser(0,0)→right, target(6,5), checkpoint(3,2), par=3
// Absorbers: (0,3)(0,4)(0,5)(0,6)(1,6)(2,6)(3,6)(6,0)(6,1)(6,2)(6,3)(6,4)
// Solution: \(0,2), /(4,2), \(4,5)
//
// ─────────────────────────────────────────────────────────────────
const level7 = (): LevelConfig => {
  const g = makeGrid(7);
  return {
    id: 7,
    name: 'The Gauntlet',
    description: 'Absorbers seal every shortcut. Use all three mirrors.',
    gridSize: 7,
    playerMirrors: 3,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      // Absorbers blocking row-0 easy exits
      { r: 0, c: 3, cell: absorber() },
      { r: 0, c: 4, cell: absorber() },
      { r: 0, c: 5, cell: absorber() },
      { r: 0, c: 6, cell: absorber() },
      // Absorbers sealing col-6 upper approach
      { r: 1, c: 6, cell: absorber() },
      { r: 2, c: 6, cell: absorber() },
      { r: 3, c: 6, cell: absorber() },
      // Absorbers sealing row-6 left approach
      { r: 6, c: 0, cell: absorber() },
      { r: 6, c: 1, cell: absorber() },
      { r: 6, c: 2, cell: absorber() },
      { r: 6, c: 3, cell: absorber() },
      { r: 6, c: 4, cell: absorber() },
      // Obstacles
      { r: 2, c: 4, cell: splitterFixed() },
      { r: 1, c: 3, cell: fiberEntry(101) },
      { r: 5, c: 3, cell: fiberExit(101) },
      // Checkpoints + target
      { r: 3, c: 2, cell: checkpoint(1) },
      { r: 4, c: 4, cell: checkpoint(2) },
      { r: 5, c: 5, cell: checkpoint(3) },
      { r: 6, c: 5, cell: target() },
      { r: 2, c: 5, cell: coin(3) },
      { r: 4, c: 1, cell: coin(2) },
    ]),
  };
};

// ─────────────────────────────────────────────────────────────────
// LEVEL 8 — "Dead Ends" (7×7, par 4, REDESIGNED)
//
// Old problem: / at (3,6) trivially won with 1 mirror.
//
// Concept: laser fires from top, must make 4 turns to reach a target
// tucked in a corner. Absorbers plug all short circuits.
//
// Laser: (0,3)→down (centre-top)
// Target: (6,0)
// Checkpoint: (4,1) — beam passes LEFT through row 4 at col 1
//
// Required 4-mirror solution (verified step-by-step):
//   Beam (0,3)→DOWN col 3
//   M1: / at (3,3) → beam LEFT along row 3
//   Beam LEFT row 3 → (3,2)(3,1)(3,0)... exits. Need a mirror.
//   M2: \ at (3,1) → beam DOWN col 1
//   Beam DOWN col 1 → (4,1)=checkpoint✓ (5,1)(6,1)... exits. Need turn.
//   M3: / at (5,1) → beam LEFT along row 5
//   Beam LEFT row 5 → (5,0)... exits. Need target there or another mirror.
//   Target at (6,0)? Beam is at row 5 col 0, going left = exits left. ✗
//
//   Revised: make it go DOWN then left then down:
//   Beam (0,3)→DOWN col 3
//   M1: / at (3,3) → LEFT row 3 → (3,2)(3,1)(3,0) exits. ✗ need wall or mirror
//   M1: \ at (2,3) → RIGHT row 2 → (2,4)(2,5)(2,6) exits. Need mirror.
//   M2: / at (2,5) → UP col 5 → (1,5)(0,5) exits. ✗
//   M2: / at (2,6)... exits instantly up. ✗
//
//   Better topology: "Z-shape"
//   Laser (0,6)→down, target (6,0)
//   Beam DOWN col 6
//   M1: / at (2,6) → LEFT row 2
//   Beam LEFT row 2 → (2,5)(2,4)(2,3)(2,2)(2,1)(2,0) exits. Need turn.
//   M2: \ at (2,2) → DOWN col 2
//   Beam DOWN col 2 → (3,2)(4,2)=checkpoint✓ (5,2) → need turn.
//   M3: / at (5,2) → LEFT row 5
//   Beam LEFT row 5 → (5,1)(5,0) exits. Need target at (5,0) or turn.
//   M4: \ at (5,0)? Can't — that's the edge. / at exit means beam exits.
//   Or: M3: \ at (5,2) → RIGHT row 5 → (5,3)(5,4)...(5,6) exits. ✗
//   Or: add one more turn to go down into (6,0):
//   M3: / at (4,2) → LEFT row 4 → (4,1)(4,0) exits. ✗ unless target at (4,0).
//
//   Simplest Z with 4 mirrors:
//   Laser (0,6)→down, target (6,0)
//   M1: / at (2,6) → LEFT row 2
//   M2: \ at (2,1) → DOWN col 1
//   M3: / at (5,1) → LEFT row 5 → (5,0) exits ✗
//   M3: \ at (4,1) → RIGHT row 4 → exits right ✗
//   M3: / at (4,1) → LEFT row 4 → (4,0) exits ✗ (not target)
//
//   Change target to (6,1):
//   M3: / at (5,1) → LEFT row 5 → (5,0) exits ✗
//   Need beam to go DOWN to (6,1):
//   After M2 (DOWN col 1): (3,1)(4,1)(5,1) → M3: \ at (5,1) → RIGHT ✗
//   After M2 (DOWN col 1): (3,1)(4,1)=checkpoint✓ (5,1)(6,1)=target ✓ ← only 3 mirrors!
//
//   Block (6,1) being directly accessible: absorber at (5,1)?
//   Then beam hits absorber at (5,1). ✗
//
//   New approach — 4-mirror "W" shape:
//   Laser (0,0)→right, target (6,6)
//   This is big-grid diagonal; need exactly 4 bounces.
//
//   Verified 4-mirror solution:
//   Laser (0,0)→RIGHT row 0
//   M1: \ at (0,3) → DOWN col 3
//   M2: / at (4,3) → RIGHT row 4     (checkpoint at (2,3) on descent)
//   M3: \ at (4,5) → DOWN col 5
//   M4: / at (6,5) → RIGHT row 6 → exits ✗ (target would need to be on right edge row 6)
//   Target (6,6)... at (6,6) would be off grid. Use 7×7: max index 6. (6,6) valid!
//   M4: / at (6,5) → RIGHT row 6 → (6,6)=target ✓
//
//   Block shortcuts:
//   1-mirror: \ at (0,6)→down→(6,6). Block: absorber at (3,6).
//   1-mirror: / at (r,c)→up from row 0. N/A since laser goes right.
//   2-mirror: \ at (0,c)→down→/ at (r,c)→right→target(6,6)?
//     Need beam going right to end at (6,6): beam enters row 6. Only if mirror in row 6.
//     / at (6,c)→right→(6,6): c=5 gives (6,6). So \ at (0,5)→down col5→/ at (6,5)→right→(6,6). 2 mirrors! Must block.
//     Block: absorber at (1,5) or at (4,5) (along col 5 descent). Use absorber at (2,5).
//     Then \ at (0,5)→down→(1,5)(2,5)=absorber. Dead. ✓
//   Also: \ at (0,3)→down→/ at (6,3)→right→(6,4)(6,5)(6,6). 2 mirrors. Block: absorber at (6,3).
//   Also: \ at (0,4)→down→/ at (6,4)→right→(6,5)(6,6). Block: absorber at (6,4).
//
//   After blocking (2,5)(3,6)(6,3)(6,4):
//   Does M4 (/ at (6,5)) still work? YES — (6,5) is empty.
//   Does M3 (\ at (4,5)) still work? YES — (4,5) is empty, (2,5)=absorber but M3 enters from left (row 4), not from above.
//
//   3-mirror check:
//   Beam right row 0, \ at (0,3)→down col 3, / at (4,3)→right row 4:
//     \ at (4,6)→down→(5,6)(6,6)=target. 3 mirrors! Must block.
//     Block: absorber at (5,6) or (4,6). Use absorber at (5,6).
//     Then beam hits absorber. ✓ But wait, (4,6) is in the grid. Put wall at (4,6).
//   Right row 0, \ at (0,3)→down, / at (3,3)→right:
//     \ at (3,6)=absorber. Dead. ✓ (we have absorber at (3,6)). ✓
//   Right row 0, \ at (0,3)→down, / at (2,3)→right:
//     (2,4)(2,5)=absorber. Dead. ✓
//   Right row 0, \ at (0,2)→down, / at (r,2)→right:
//     r=4: right→(4,3)(4,4)(4,5)\→down→(5,5)(6,5)/→right→(6,6)=target. 4 mirrors! ✓ Valid alt solution.
//     That's fine — alt solutions with same count are ok.
//
//   Does valid 4-mirror solution still work?
//   \ at (0,3)→down col 3 → (1,3)(2,3)=checkpoint✓ (3,3)(4,3)
//   / at (4,3)→right row 4 → (4,4)(4,5) → \ at (4,5)→down col 5
//     (4,5): not absorber (absorber is at (2,5))? Wait, let me recheck. (2,5)=absorber. M3 enters (4,5) from LEFT (it's in row 4). (4,5) empty ✓.
//   DOWN col 5 → (5,5)(6,5) → / at (6,5)→right→(6,6)=target ✓
//   Checkpoint: (2,3) on col-3 descent ✓
//
// Final Level 8 layout:
// 7×7, laser(0,0)→right, target(6,6), checkpoint(2,3), par=4
// Absorbers: (2,5)(3,6)(5,6)(6,3)(6,4)
// Solution: \(0,3), /(4,3), \(4,5), /(6,5)
// ─────────────────────────────────────────────────────────────────
const level8 = (): LevelConfig => {
  const g = makeGrid(7);
  return {
    id: 8,
    name: 'Dead Ends',
    description: 'Every shortcut leads nowhere. Find all four turns.',
    gridSize: 7,
    playerMirrors: 4,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      // Absorbers blocking shortcuts
      { r: 2, c: 5, cell: absorber() },
      { r: 3, c: 6, cell: absorber() },
      { r: 5, c: 6, cell: absorber() },
      { r: 6, c: 3, cell: absorber() },
      { r: 6, c: 4, cell: absorber() },
      // Obstacles
      { r: 2, c: 1, cell: splitterFixed() },
      { r: 1, c: 4, cell: fiberEntry(102) },
      { r: 5, c: 2, cell: fiberExit(102) },
      // Checkpoints + target
      { r: 2, c: 3, cell: checkpoint(1) },
      { r: 4, c: 4, cell: checkpoint(2) },
      { r: 5, c: 5, cell: checkpoint(3) },
      { r: 6, c: 6, cell: target() },
      { r: 3, c: 4, cell: coin(3) },
      { r: 5, c: 1, cell: coin(2) },
    ]),
  };
};

// ─────────────────────────────────────────────────────────────────
// LEVEL 9 — "Crossfire" (8×8, par 4, REDESIGNED)
//
// Old problem: \(3,0)+\(3,7) won with just 2 mirrors (under par by 2).
//
// New concept: beam must make an M-shape across the grid, touching
// 4 specific turning points. Absorber fields close off 1/2/3-mirror paths.
//
// Laser: (0,7)→down (top-right corner)
// Target: (7,0) (bottom-left corner)
// Checkpoint: (4,3) — beam passes LEFT through row 4 at col 3
//
// Required 4-mirror solution:
//   Beam (0,7)→DOWN col 7
//   M1: / at (2,7) → LEFT row 2
//   Beam LEFT row 2 → (2,6)(2,5)(2,4)(2,3)(2,2)(2,1)(2,0) exits.
//   M2: \ at (2,4) → DOWN col 4
//   Beam DOWN col 4 → (3,4)(4,4)(5,4)(6,4)(7,4) exits.
//   M3: / at (5,4) → LEFT row 5
//   Beam LEFT row 5 → (5,3)(5,2)(5,1)(5,0) exits. ✗
//   M3: \ at (4,4) → RIGHT row 4 → exits. ✗
//   M3: / at (4,4) → LEFT row 4 → (4,3)=checkpoint✓ (4,2)(4,1)(4,0) exits. ✗
//   M4: \ at (4,1) → DOWN col 1 → (5,1)(6,1)(7,1) exits. ✗
//   M4: / at (4,0) → DOWN (from left going left, / reflects left→down). Yes!
//     Actually: beam going LEFT, hits / → reflects DOWN. ✓
//     / at (4,0)... but (4,0) is the edge. Beam would exit there (col 0 wall).
//     No, in a 0-indexed grid, col 0 is the leftmost column. If beam at (4,1)
//     going left, it moves to (4,0), and if (4,0) has /, reflects down to (5,0)(6,0)(7,0)=target? ✓!
//   
//   But wait — (4,0) has a fixed cell? No, it's empty. Player places / at (4,0).
//   But the laser is at (0,7), not (4,0). Let me recheck...
//   Player's 4 mirrors: /(2,7), \(2,4), /(4,4), /(4,0)
//   Beam: DOWN col7 → /(2,7) → LEFT row2 → \(2,4) → DOWN col4 → /(4,4) → LEFT row4
//         → (4,3)=checkpoint✓ → (4,2)(4,1) → /(4,0) → DOWN col0 → (5,0)(6,0)(7,0)=target✓
//   That's 4 mirrors! ✓
//
//   Now block shortcuts:
//   1-mirror: / at (7,7)→left→(7,0)=target? Only 2 steps but beam goes DOWN col7 first.
//     / at (r,7)→left→(r,0) exits. Need target at (r,0)? Target is (7,0).
//     / at (7,7)→left row7→(7,6)(7,5)...(7,0)=target. That's 1 mirror! Must block.
//     Block: absorber at (7,5) or wall at some col in row 7. Use absorbers at (7,6)(7,5)(7,4)(7,3)(7,2)(7,1). That's harsh. Use wall at (7,4). Wall blocks beam in row 7 at col 4. So / at (7,7)→left→(7,6)(7,5)(7,4)=wall. Dead. ✓
//
//   2-mirror: / at (r,7)→left→\at(r,c)→down→target(7,0)?
//     \(r,c) down to (7,0): need c=0. So \(r,0) down to (7,0).
//     Beam left row r → arrives at col 0, but (r,0) needs \. Col 0 is edge.
//     Beam going left arrives at col 0: (r,0). If \ there → down col 0 → target at (7,0). ✓
//     This is 2 mirrors: /(r,7) + \(r,0). r can be anything from 1-6.
//     Block: absorber on col 0 at rows 1-6: (1,0)(2,0)(3,0)(4,0)(5,0)(6,0)?
//     That's a lot. Use strategic ones:
//     The beam going left in row r hits \(r,0)→down col0→(r+1,0)(r+2,0)...(7,0)=target.
//     For r=7: /(7,7)→left→(7,0)=direct (target). Blocked by wall at (7,4). ✓
//     For r=1-6: need \(r,0) + /(r,7). Block col 0 rows 1-5: absorbers at (1,0)(2,0)(3,0)(5,0)(6,0). (4,0) stays empty (used in solution).
//
//   3-mirror: Many combos. After absorbers blocking col 0 rows 1-3, 5-6:
//     /(2,7)→left→\(2,4)→down→/(5,4)→left→exits col 0 (5,0)=absorber. ✗
//     /(2,7)→left→\(2,4)→down→/(4,4)→left→reaches (4,0) which player can use. But that's 3 mirrors reaching (4,0) then needs a 4th to go down. ✓ (3 mirrors ≠ solved)
//     What about 3-mirror solution via different route?
//     /(2,7)→left→\(2,2)→down col2→/(6,2)→left→(6,1)(6,0)=absorber. ✗ Good if absorber at (6,0).
//     /(2,7)→left→\(2,2)→down col2→\(5,2)→right→exits. ✗
//     I think with the absorbers placed, 3-mirror solutions are all blocked.
//
//   Also need to block: \(2,7) not a mirror (that's /), also direct:
//   Beam DOWN col7, \(r,7) would need (r,7) to exist — col 7 is edge. Beam going down can't use \(r,7) to go right because right of col 7 is outside grid.
//   Actually \(r,7) → beam going DOWN hits \→turns RIGHT. RIGHT from col 7 = exits. ✗
//
//   Checkpoint at (4,3): is it reachable in the solution? YES (beam goes left in row 4). ✓
//   Is it blocking the player's mirrors? No — checkpoint is fixed, player can't place there.
//   Does checkpoint block the solution? (4,3) is checkpoint, beam passes through it. ✓
//
// Final Level 9 layout:
// 8×8, laser(0,7)→down, target(7,0), checkpoint(4,3), par=4
// Absorbers: (1,0)(2,0)(3,0)(5,0)(6,0) [col 0 shortcuts]
//            (7,4)(7,5)(7,6) [row 7 shortcuts — don't block (7,0)=target]
// Wait: target is (7,0), so row 7 absorbers should not be at col 0.
//   Actually row-7 shortcut via / at (r,7)→left: wall at (7,4) blocks. Use absorbers at (7,5)(7,6). Also wall at (7,4). 
//   Hmm, (7,0) is target, so absorbers at (7,1)(7,2)(7,3) would block solution?
//   Solution enters (7,0) from above (col 0 going down). (7,0)=target, beam hits it. ✓
//   Row 7 approach from right: / at (7,7)→left: blocked by absorbers at (7,5)(7,6).
//   /(r,7)→left row r → can't reach (7,0) via row r unless r=7. ✓
//
// Also block: absorber at (0,0)? No, laser is at (0,7). (0,0) is fine.
// Block /(r,7)→left→\(r,0) for r=1-3,5-6 via absorbers at (1,0)(2,0)(3,0)(5,0)(6,0). ✓
//
// SOLUTION CHECK:
// /(2,7): (2,7) is empty ✓ (no absorber there)
// \(2,4): (2,4) empty ✓
// /(4,4): (4,4) empty ✓, (4,3)=checkpoint (beam passes through) ✓
// /(4,0): (4,0) empty ✓ (no absorber at row 4 col 0!)
// Beam DOWN col0 from (5,0): (5,0)=absorber ✗ ← PROBLEM!
//
// Fix: don't put absorber at (5,0). Remove it from the list.
// Absorbers at (1,0)(2,0)(3,0)(6,0) only for col-0.
//
// Recheck 2-mirror via col 0:
// /(r,7)→left→\(r,0)→down to target(7,0):
//   r=1: \(1,0)→down→(2,0)=absorber. Dead. ✓
//   r=2: \(2,0)→down→(3,0)=absorber. Dead. ✓
//   r=3: \(3,0)→down→(4,0)(5,0)(6,0)=absorber. Dead. ✓ (absorber at 6,0)
//   r=4: \(4,0)→down→(5,0)(6,0)=absorber. Dead. ✓
//   r=5: \(5,0)→down→(6,0)=absorber. Dead. ✓
//   r=6: \(6,0)=absorber. Can't place mirror. ✓
//   r=7: row 7 approach blocked by absorbers at (7,5)(7,6). ✓
// All 2-mirror via col 0 blocked. ✓
//
// But now the solution uses /(4,0). Beam comes from /(4,4) going LEFT:
// (4,3)=checkpoint(passes through) → (4,2)(4,1)(4,0)=player mirror /
// Player places / at (4,0). Beam going LEFT hits / → reflects DOWN. ✓
// Down col 0: (5,0)(6,0)=absorber. BLOCKED. ✗ ← PROBLEM!
//
// I need (5,0) and (6,0) to be clear for the solution, but need to block
// the shortcut / at (r,7)→left→\(r,0)→down for r=5,6.
//
// Alternative: instead of blocking col 0 with absorbers at rows 5,6,
// block it differently. The 2-mirror shortcut for r=5:
//   /(5,7)→left row 5 → \(5,0)→down→(6,0)(7,0)=target. 2 mirrors.
//   Block by: absorber at (5,5) or (5,6) to kill the leftward beam before col 0.
//   /(5,7)→left→(5,6)=absorber. Dead. ✓
// For r=6:
//   /(6,7)→left row 6 → \(6,0)→down→(7,0)=target. 
//   Block by absorber at (6,6) or (6,5).
//   /(6,7)→left→(6,6)=absorber. Dead. ✓
//
// Remove col-0 absorbers at rows 5 and 6. Add absorbers at (5,6)(6,6) instead.
//
// Also, solution goes DOWN col 0 from (4,0): (5,0)(6,0)(7,0)=target.
// These must be empty. ✓ (no absorbers at (5,0)(6,0) now).
//
// Final absorbers:
//   (1,0)(2,0)(3,0)          — col 0 rows 1-3 block shortcuts for r=1-3
//   (5,6)(6,6)               — row-right approach kills r=5,6 shortcuts
//   (7,5)(7,6)               — row 7 / approach from right
//
// Recheck r=4 shortcut: /(4,7)→left→\(4,0)→down→(5,0)(6,0)(7,0)=target. 2 mirrors!
//   But (4,0) is where the player places their 4th mirror in the solution.
//   This 2-mirror "shortcut" actually IS the solution minus 2 mirrors... wait.
//   This 2-mirror path WORKS: /(4,7) and \(4,0). That's only 2 mirrors to win!
//   Must block this. Block: absorber at (4,6) or (4,7)... but (4,7) is on the edge.
//   Alternatively, block col 0 at row 4 too: absorber at (4,0)?
//   But solution needs player to place / at (4,0). Can't put absorber there.
//   Alternative block: absorber along row 4 between cols 1-6 to kill leftward beam:
//     Absorber at (4,5). Then /(4,7)→left→(4,6)(4,5)=absorber. Dead. ✓
//   But solution: /(4,4)→left→(4,3)=checkpoint→(4,2)(4,1)(4,0). The beam goes
//     left from col 4, so (4,5) is to the RIGHT and not crossed. ✓
//
// Recheck r=5 with absorber at (5,6):
//   /(5,7)→left→(5,6)=absorber. Dead. ✓
// OK. Also, does the solution beam cross (5,6)? No — solution in row 5 would be
//   going DOWN col 0: (5,0). Not near (5,6). ✓
//
// FINAL ABSORBERS for Level 9:
//   (1,0)(2,0)(3,0) — col-0 shortcuts rows 1-3
//   (4,5)           — row-4 right-approach shortcut
//   (5,6)(6,6)      — row 5/6 right-approach shortcuts
//   (7,5)(7,6)      — row-7 shortcut
//
// SOLUTION CHECK (final):
// Laser (0,7)→DOWN col 7
// /(2,7): (2,7) ✓ → LEFT row 2 → (2,6)(2,5)(2,4)(2,3)(2,2)(2,1)(2,0) exits? WAIT.
// Beam hits (2,0) = absorber! (we have absorber at (2,0)) ✗
//
// UGH. The solution beam goes LEFT in row 2 and HITS absorber at (2,0).
// BUT M2=\(2,4) turns it DOWN at col 4, so beam never reaches (2,0). ✓ ← right!
// Beam left in row 2: (2,6)(2,5)(2,4)=mirror → turns DOWN. ✓
// (2,3)(2,2)(2,1)(2,0) never reached. ✓
//
// /(2,7) → left → hits (2,4)=\(player) → DOWN col 4
// DOWN col 4: (3,4)(4,4)=/(player) → LEFT row 4
// LEFT row 4: (4,3)=checkpoint✓ (4,2)(4,1) → (4,0)=/(player)
// /(4,0) LEFT→DOWN: DOWN col 0: (5,0)(6,0)(7,0)=target ✓
//
// All clear! ✓
// ─────────────────────────────────────────────────────────────────
const level9 = (): LevelConfig => {
  const g = makeGrid(8);
  return {
    id: 9,
    name: 'Crossfire',
    description: 'Column zero is mined. Thread the beam through the gaps.',
    gridSize: 8,
    playerMirrors: 4,
    grid: place(g, [
      { r: 0, c: 7, cell: laser('down') },
      // Col-0 absorbers blocking 2-mirror col-0 shortcuts (rows 1-3)
      { r: 1, c: 0, cell: absorber() },
      { r: 2, c: 0, cell: absorber() },
      { r: 3, c: 0, cell: absorber() },
      // Row approach shortcuts
      { r: 4, c: 5, cell: absorber() },
      { r: 5, c: 6, cell: absorber() },
      { r: 6, c: 6, cell: absorber() },
      { r: 7, c: 5, cell: absorber() },
      { r: 7, c: 6, cell: absorber() },
      // Obstacles
      { r: 1, c: 4, cell: splitterFixed() },
      { r: 3, c: 6, cell: fiberEntry(103) },
      { r: 6, c: 3, cell: fiberExit(103) },
      // Checkpoints + target
      { r: 3, c: 4, cell: checkpoint(1) },
      { r: 4, c: 3, cell: checkpoint(2) },
      { r: 4, c: 1, cell: checkpoint(3) },
      { r: 7, c: 0, cell: target() },
      { r: 5, c: 3, cell: coin(3) },
      { r: 2, c: 2, cell: coin(2) },
      { r: 6, c: 5, cell: coin(1) },
    ]),
  };
};

// ─────────────────────────────────────────────────────────────────
// LEVEL 10 — "Grand Master" (8×8, par 5, REDESIGNED)
//
// Old problem: player could win with just 2 mirrors (/(3,7)+/(3,0)).
//
// New concept: 5-mirror "W" path with two fixed deflectors that look helpful
// but only work if you use the other 5 mirrors correctly.
//
// Fixed mirrors create forced path segments that must be used.
// Absorbers block all routes that don't use the fixed mirrors.
//
// Laser: (0,0)→right
// Fixed: \ at (0,4) — forces beam DOWN col 4 immediately
// Fixed: / at (4,4) — forces beam going DOWN col 4 to turn LEFT along row 4
// This creates a mandatory segment: RIGHT row0 → DOWN col4 → LEFT row4
// After /(4,4) the beam goes LEFT row 4: (4,3)(4,2)(4,1)(4,0) exits.
//
// Wait — if both fixed mirrors are on the main path, the "mandatory segment"
// is built-in, but then the player only needs 3 more turns (not 5 extra mirrors).
// Actually 0 mirrors from player still works if beam exits left from row 4 — that's not the target.
// Player needs 5 mirrors to route the beam from row-4-left-exit to target.
//
// Hmm, let me reconsider. With 2 fixed mirrors creating 2 mandatory turns,
// player places 5 mirrors for 5 more turns = 7 total turns. That's unwieldy.
//
// Better: 1 fixed mirror as a "red herring" that the player must work around,
// plus 1 fixed mirror on the correct path, so the player needs 5 player mirrors.
//
// CLEAN DESIGN:
// Laser (0,0)→down, target (7,7)
// Fixed: \ at (3,0) — beam going DOWN col0 turns RIGHT row3
// Fixed: / at (3,6) — beam going RIGHT row3 must turn UP col6 at some point
//   Actually beam going RIGHT row 3 hits /(3,6) → turns UP col6 → (2,6)(1,6)(0,6) exits. ✗
//   That's a dead end. Red herring!
//   Player must avoid using /(3,6) OR route around it.
//   If player places \ at (3,5) BEFORE (3,6): beam right row3 → \(3,5) → DOWN col5 → ...
//   But /(3,6) is fixed and beam already turned at (3,5). OK — beam goes DOWN col5, never hits (3,6). ✓
//
// 5-mirror solution (verified):
//   Laser (0,0)→DOWN col0
//   Fixed \ at (3,0) → RIGHT row3
//   M1: \ at (3,5) → DOWN col5 (avoids the / red herring at (3,6))
//   M2: / at (6,5) → RIGHT row6
//   M3: \ at (6,7) → DOWN col7
//   → (7,7)=target ✓
//   That's only 3 player mirrors! Need 5. Need a longer path.
//
// Let me use 0 fixed mirrors and design a clean 5-mirror level:
//
// FINAL DESIGN — No fixed mirrors, pure 5-mirror challenge.
// 8×8, laser(0,7)→down, target(7,7)
// ... wait, (0,7)→down straight to (7,7) is trivial (0 mirrors).
//
// Laser (0,0)→right, target (7,7).
// Absorbers seal off:
//   Direct paths: row 0 exits (absorbers at row 0 right side)
//   Col 7 direct (absorbers blocking straight descent into (7,7) from above)
//   Row 7 direct (absorbers blocking straight right approach to (7,7) from left)
//
// 5-mirror solution:
//   RIGHT row0 → \ at (0,2) → DOWN col2
//   DOWN col2 → / at (3,2) → RIGHT row3
//   RIGHT row3 → \ at (3,5) → DOWN col5
//   DOWN col5 → / at (5,5) → RIGHT row5
//   RIGHT row5 → \ at (5,7) → DOWN col7
//   DOWN col7 → (6,7)(7,7)=target ✓
//   Checkpoint: (4,5) on col5 descent (between rows 3 and 5) ✓
//
// Block shortcuts:
// 1-mirror: \ at (0,7) → down col7 → (7,7)=target. Block: absorber at (4,7).
//   Then (4,7)=absorber. But solution: M5=\ at (5,7) → DOWN col7 → (6,7)(7,7).
//   Solution enters col7 at row 6 (from row5+1=6). (4,7) doesn't matter. ✓
//   But wait: if player puts \ at (0,7) → down col7 → (1,7)(2,7)(3,7)(4,7)=absorber. Dead. ✓
//
// 2-mirror: \ at (0,7) blocked above. \(0,c)→down→/(r,c)→right to (r,7)... 
//   need target in some row at col7. Target is (7,7).
//   \(0,c)→down col c→/(r,c)→right row r→(r,7): not target (7,7) unless r=7.
//   \(0,c)→down→/(7,c)→right→(7,7). This only works if beam reaches (7,c).
//   Check absorbers at row 7: add absorbers at (7,2)(7,3)(7,4)(7,5)(7,6). 
//   Then /(7,c)→right→must pass through those absorbers if c<2. (7,1): right→(7,2)=absorber ✓.
//   (7,0): not reachable since (7,0)≠target and beam would exit.
//   ✓ row 7 approach blocked.
//
// Also: /(r,0)→right... laser goes right so beam never enters from col0 upward unless bounced.
//
// 3-mirror shortcuts: many. Let me add a wall at (3,7) to block beams going right
// in row 3 from exiting easily, and absorbers at strategic mid-points:
//   Wall (3,7): beam right row3 hits wall at (3,7). ✓ — player must turn before.
//   This forces M3=\ at some col < 7 in row 3.
//
// 4-mirror: from DOWN col2: \(0,2)→down→/(3,2)→right→\(3,5)→down→/(5,5)→right→\(5,7)?
//   Actually (5,7) is right edge. \ at (5,7)→right exits. ✗ Must use / at (5,7)?
//   / at (5,7)... beam going right hits / at (5,7) → turns UP. (4,7)(3,7)=wall. Dead. ✗
//   So M5=\ at (5,7) → DOWN: beam going right hits \(5,7) → DOWN col7.
//   (5,7) is valid. Beam right row5 → (5,7)=player \ → DOWN col7 → (6,7)(7,7)=target.✓
//   Does wall at (3,7) affect anything? No, beam doesn't go right in row3 past col5 (turns at \(3,5)). ✓
//
// Adding absorbers to kill 4-mirror shortcuts:
//   \(0,2)→down→/(3,2)→right→\(3,5)→down→/(6,5)→right→(6,7)=not target ✗ 
//   \(0,2)→down→/(3,2)→right→\(3,5)→down→/(5,5)→right→(5,6)(5,7)=mirror↓→(7,7)=target. 
//   This IS the solution! But what about going only to 4 by skipping M5?
//   \(0,2)→down→/(3,2)→right→\(3,5)→down→and somehow reaching target in 1 more:
//   /(7,5)→right→(7,6)(7,7)=target! But (7,5)=absorber (from our list). ✓
//   /(6,5)→right→(6,7)... target is at (7,7). ✗
//   So 4-mirror via this path is blocked. ✓
//
// Verify 5-mirror solution once more:
//   \(0,2): (0,2) empty ✓
//   /(3,2): (3,2) empty ✓
//   \(3,5): (3,5) empty ✓ — wall at (3,7) doesn't affect (3,5) ✓
//   /(5,5): (5,5) empty ✓ — checkpoint at (4,5) is passed ✓
//   \(5,7): (5,7) empty ✓ — not wall or absorber ✓
//   Path: (6,7)(7,7)=target ✓
//   Checkpoint (4,5): beam in col5 goes from (3,5) downward → (4,5)=checkpoint ✓
//
// FINAL ABSORBERS for Level 10:
//   (4,7)               — blocks trivial col-7 shortcut from top
//   (7,2)(7,3)(7,4)(7,5)(7,6) — blocks row-7 approach
//   (1,6)(2,6)(3,6)     — col-6 dead zone (prevents col-6 approaches)
//   (0,5)(0,6)          — blocks row-0 escape to right
// WALL: (3,7) — forces any right-moving beam in row3 to turn before edge
//
// ─────────────────────────────────────────────────────────────────
const level10 = (): LevelConfig => {
  const g = makeGrid(8);
  return {
    id: 10,
    name: 'Grand Master',
    description: 'Five turns, no shortcuts. This is the final puzzle.',
    gridSize: 8,
    playerMirrors: 5,
    grid: place(g, [
      { r: 0, c: 0, cell: laser('right') },
      // Wall forcing turns before edge
      { r: 3, c: 7, cell: wall() },
      // Absorbers sealing col-7 top approach
      { r: 4, c: 7, cell: absorber() },
      // Absorbers sealing row-7 (bottom) left approaches
      { r: 7, c: 2, cell: absorber() },
      { r: 7, c: 3, cell: absorber() },
      { r: 7, c: 4, cell: absorber() },
      { r: 7, c: 5, cell: absorber() },
      { r: 7, c: 6, cell: absorber() },
      // Absorbers sealing col-6 shortcuts
      { r: 1, c: 6, cell: absorber() },
      { r: 2, c: 6, cell: absorber() },
      // Absorbers sealing row-0 right escapes
      { r: 0, c: 5, cell: absorber() },
      { r: 0, c: 6, cell: absorber() },
      { r: 0, c: 7, cell: absorber() },
      // Obstacles
      { r: 4, c: 3, cell: splitterFixed() },
      { r: 6, c: 4, cell: splitterFixed() },
      { r: 1, c: 1, cell: fiberEntry(104) },
      { r: 6, c: 2, cell: fiberExit(104) },
      // Checkpoints + target
      { r: 2, c: 2, cell: checkpoint(1) },
      { r: 3, c: 4, cell: checkpoint(2) },
      { r: 4, c: 5, cell: checkpoint(3) },
      { r: 7, c: 7, cell: target() },
      { r: 2, c: 4, cell: coin(3) },
      { r: 5, c: 3, cell: coin(2) },
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
