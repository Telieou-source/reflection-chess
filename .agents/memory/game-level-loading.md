---
name: Game screen level loading
description: How to avoid the infinite loadLevel loop in game.tsx useEffect
---

In `app/game.tsx`, the useEffect that calls `loadLevel` must NOT include `state` in its dependency array.

**Why:** Including `state` causes a loop: loadLevel → setState → state changes → useEffect fires → loadLevel again. Even though the condition `state.level.id !== levelId` would be false on the second fire, React's batching/StrictMode can cause it to loop before the check resolves.

**How to apply:** Use a ref to track the last-loaded level ID:

```javascript
const loadedLevelIdRef = useRef(-1);
useEffect(() => {
  if (loadedLevelIdRef.current !== levelId) {
    loadedLevelIdRef.current = levelId;
    loadLevel(levelId);
  }
}, [levelId, loadLevel]); // ← state is NOT in this array
```
