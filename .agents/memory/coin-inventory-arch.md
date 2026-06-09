---
name: Coin and inventory architecture in GameContext
description: Pattern for reading inventory/coins inside tapCell setState without anti-patterns
---

`coins` and `inventory` are separate useState values from `GameState`. To read them synchronously inside `tapCell` (which uses functional setState), keep refs:

```javascript
const inventoryRef = useRef(inventory);
useEffect(() => { inventoryRef.current = inventory; }, [inventory]);
const coinsRef = useRef(coins);
useEffect(() => { coinsRef.current = coins; }, [coins]);
```

**Why:** Calling `setInventory` inside a `setState` functional updater is a React anti-pattern and can cause render loops. Instead, read from the ref inside the updater, then call `setInventory` as a separate synchronous call outside the updater.

**How to apply:** In tapCell, read `inventoryRef.current` to check counts, call `setInventory(newInv)` then `setState(prev => ...)` as separate calls (not nested).

**Coin formula:** `coinsEarned = Math.max(1, level.playerMirrors - mirrorsUsed + 1)` — only slash/backslash mirrors count (not splitters). Splitters are purchased from shop and don't affect the par score.

**AsyncStorage keys:**
- `@reflection_chess_progress` — JSON array of completed level IDs
- `@reflection_chess_coins` — string (number)
- `@reflection_chess_inventory` — JSON `{ splitter: number, bomb: number }`
