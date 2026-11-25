# Reflection Chess

A laser-and-mirrors puzzle game for iOS built with Expo and React Native. Guide a laser beam through reflections, beam splitters, and fiber tunnels to hit the bullseye — in the right order.

---

## Gameplay

Place mirrors on the grid to redirect a laser beam through every checkpoint gate (in order) and into the target. The fewer mirrors you use, the more coins you earn.

### Mechanics

| Element | Description |
|---|---|
| `\` Backslash mirror | Deflects right→down, down→right, left→up, up→left |
| `/` Slash mirror | Deflects right→up, up→right, left→down, down→left |
| ⋈ Beam Splitter | Splits the beam — one path reflects, one passes straight through |
| 〇 Fiber Tunnel | Teleports the beam underground between entry and exit holes |
| ✕ Absorber | Destroys the beam on contact (combustion — puzzle resets) |
| ✦ Coin collectible | Collected when the beam passes through the cell |
| ◎ Checkpoint | Must be hit in numbered order before the target |
| ⊕ Target | The bullseye — hit this last to solve the puzzle |

### Win / Fail conditions

- **Solve** — beam hits all checkpoints in order, then the target
- **Short circuit** — beam crosses its own path → reset
- **Combustion** — beam hits an absorber → reset

---

## Levels

### Handcrafted (1–10)

Ten carefully designed tutorial levels that introduce each mechanic progressively:

| Level | Name | Size | Par | Introduces |
|---|---|---|---|---|
| 1 | First Light | 4×4 | 1 | Basic mirror reflection |
| 2 | Double Bounce | 4×4 | 2 | Two-mirror chain, coin detour path |
| 3 | The Fork | 4×4 | 2 | Checkpoint ordering |
| 4 | Beam Juggler | 6×6 | 2 | Fixed beam splitter |
| 5 | Wormhole | 6×6 | 1 | Fiber tunnel teleport |
| 6 | Corner Office | 6×6 | 2 | Fixed mirror + coin detour |
| 7 | The Gauntlet | 7×7 | 3 | Multi-checkpoint routing |
| 8 | Prism Run | 7×7 | 4 | Fiber + splitter combined |
| 9 | Deep Space | 8×8 | 4 | Complex multi-path routing |
| 10 | Grand Finale | 8×8 | 5 | All mechanics combined |

### Coin system in handcrafted levels

Levels 2 and 6 offer two valid solution paths:
- **Par route** (fewer mirrors) — collects one coin automatically
- **Detour route** (one extra mirror) — collects a second bonus coin by routing the beam off the main path

All other levels place both coins directly on the required beam path — they're collected as a natural part of solving.

### Infinite procedural levels (11+)

From level 11 onward every puzzle is procedurally generated from a seeded RNG keyed to the level number — so each level is unique but deterministic (same number always produces the same puzzle).

**Difficulty scaling (`tier = levelNum − 11`):**

| Feature | Scales with tier |
|---|---|
| Grid size | 4×4 → 9×9 (max) |
| Total mirrors | 1 → 7 (max) |
| Pre-placed hint mirrors | Generous at low tiers → zero at high tiers |
| Checkpoints | 1 (tier 0–4) → 2 (tier 5–9) → 3 (tier 10+) |
| Absorbers | Appear at tier 2+ |
| Splitters | 1 at tier 3, 2 at tier 7, 3 at tier 12 |
| Fiber tunnels | 1 at tier 6, 2 at tier 15 |
| Coin value | 1 → 2 → 3 |
| Label | Beginner → Intermediate → Advanced → Expert → Master |

Every generated level is validated twice before being accepted: once to confirm it's solvable, once to confirm it isn't already solved by the pre-placed hints.

---

## Shop

Coins are earned through gameplay only — no real money involved.

**Earning coins:**
- Solve at par: 1 coin
- 1 under par: 2 coins
- 2 under par: 3 coins (and so on)
- Beam passes through a ✦ collectible on the board

**Spending coins:**

| Item | Cost | Effect |
|---|---|---|
| Extra Mirror | 6 | Adds one extra mirror placement for the current level |
| Beam Splitter | 5 | Placeable splitter tool |
| Disruptor Bomb | 8 | Removes one absorber from the board |
| Fiber Tunnel | 12 | Placeable fiber entry/exit pair |

**Cosmetics (also coin-purchased):**
- Laser beam color (Cyan, Red, Gold, Green, Purple, White)
- Board theme (Dark, Arctic, Ember, Forest, Slate)
- Background music tracks

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + expo-router 6 |
| Language | TypeScript |
| UI | React Native |
| Storage | AsyncStorage (save data, progress, coins) |
| Fonts | Inter (Google Fonts via expo-google-fonts) |
| Icons | @expo/vector-icons (Feather) |
| Haptics | expo-haptics |
| Audio | expo-av |
| Animations | React Native Animated |
| Workspace | pnpm monorepo |

---

## Project Structure

```
artifacts/reflection-chess/
├── app/
│   ├── (tabs)/index.tsx      # Home screen
│   ├── levels.tsx            # Level select
│   ├── game.tsx              # Game board screen
│   ├── shop.tsx              # Coin shop (hints, cosmetics)
│   └── how-to-play.tsx       # Rules / tutorial
├── components/
│   └── Board.tsx             # Board rendering and piece interaction
├── context/
│   ├── GameContext.tsx       # Progress, coins, save data
│   └── CosmeticsContext.tsx  # Laser colors, board themes, music
├── constants/
│   └── levels.ts             # Handcrafted levels 1–10
├── utils/
│   ├── laser.ts              # Beam tracing (mirrors, splitters, tunnels)
│   └── generate.ts           # Procedural level generator (11+)
└── types/game.ts             # Shared game types
```

---

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the Expo dev server
pnpm --filter @workspace/reflection-chess exec expo start
```

Then scan the QR code with the **Expo Go** app on your iPhone.
