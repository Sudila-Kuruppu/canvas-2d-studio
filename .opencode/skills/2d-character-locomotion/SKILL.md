---
name: 2d-character-locomotion
description: Animate believable 2D character body mechanics using engine/kit2d.js—smooth turns before walking (no crab-walking), ground-locked IK walk/run cycles (no moonwalking), upright standing posture, planted-foot sitDown/standUp, and 3-phase jumps/recoils. Load whenever animating character movement.
compatibility: opencode
---

# 2D Character Locomotion & Body Mechanics

Use `engine/kit2d.js` primitives. NEVER write raw `Math.sin(t)` leg rotation or unanchored horizontal sliding.

## 1. Inputs to Read First
1. `projects/<project_slug>/02_DIRECTOR_PLAN.md` (shot coordinates & timing)
2. `projects/<project_slug>/RIG_MANIFEST.json` (`standHipsY = -91.6`, `legMaxReach = 92`)
3. `projects/<project_slug>/04_SETS_MANIFEST.json` (`groundY`, `chair.entryX`, `chair.seatAnchor`)

## 2. Rule 1 — Turn Before Walking (Zero Crab-Walking)
Characters must NEVER slide horizontally while `turn === 0` (staring flat at the camera):
1. Compute `dir = endX >= startX ? 1 : -1` and target `walkTurn = dir * 0.76`.
2. Ease `char.turn` over `0.25s–0.35s` before (or during the start of) the walk:
   ```js
   char.turn = K2D.lerp(startTurn, dir * 0.76, K2D.ramp(t, tTurn0, 0.3));
   ```
3. To turn toward a listener after stopping, ease `char.turn` cleanly over `0.25s` toward `±0.74` (or `0` to face the viewer).

## 3. Rule 2 — Ground-Locked Walk & March (`K2D.computeWalkPose`)
Always use `K2D.computeWalkPose`, which pins the stance foot to a constant floor pixel while the swing foot arcs forward:
- **Casual Walk (~100–130 px/s):** `{ stepLen: 42, liftH: 24 }`
- **Brisk Walk / March (~160–200 px/s):** `{ stepLen: 48, liftH: 28 }`
- **Upright Idle Rule:** When standing still, `resetPose(x, groundY, turn)` sets `hips.y = groundY - 91.6` (upright legs). Use `char.autoBreathe(t)` for chest breathing—NEVER lower `hips.y` permanently into a squat.
- **Arm Override Order:** Because `char.applyWalk(wp)` writes default arm swing offsets, if the character is also waving or carrying a prop while walking, set `char.handRTarget` / `char.handLTarget` **AFTER** calling `char.applyWalk(wp)`.

## 4. Rule 3 — Sit-Down & Stand-Up (Zero Slipping)
Never teleport or slide a character sideways onto a chair:
1. **Walk to Seat Entry:** End the walk at `seat.entryX` (`chair.x + facing * 30`, clear in front of the seat cushion). While walking past the chair, push the chair slightly behind (`baseZ = 85`).
2. **Sit Down (`0.8s–0.95s`):** Use `char.sitDown(t, tStart, dur, entryX, chair, groundY)`. This plants the feet at `seat.footX` first, leans the torso slightly forward for real weight transfer, and lowers the hips cleanly onto the cushion (`chair.pushToQueue(api.queue, 100, groundY)`).
3. **Already Seated Shot:** Call `char.sitOn(chair, groundY)` when a shot begins already seated.
4. **Stand Up:** Reverse `sitDown` over `0.75s` by blending `u = K2D.ramp(t, tStart, 0.75)`:
   - Keep feet planted at `seat.footX` until `u > 0.7`, then step to `entryX ± 6`.
   - Blend `hips` from `(seat.x, seat.seatY - 7)` to `(entryX, groundY - 91.6)` with balance lean `Math.sin(Math.PI * u) * 0.16 * seat.facing`.

## 5. Rule 4 — 3-Phase Jump & Startled Recoil
Every jump or startled hop MUST include **Anticipation → Airborne Arc → Landing Squash**:
```js
// Smooth 0.70s jump starting at t0 (0.14s crouch -> 0.38s arc -> 0.18s land)
const groundY = 0;
if (t >= t0 && t <= t0 + 0.70) {
  const dt = t - t0;
  if (dt < 0.14) {
    const p = K2D.smooth01(dt / 0.14);
    char.hips.y = groundY - 91.6 + 14 * p; // knees bend, feet stay on floor
    char.torsoLean = 0.12 * fSign * p;
  } else if (dt < 0.52) {
    const u = (dt - 0.14) / 0.38;
    const arc = 4 * u * (1 - u) * 58;
    const pushOut = 14 * Math.pow(1 - u, 3); // smoothly leaves crouch without snapping!
    char.hips.y = groundY - 91.6 + pushOut - arc;
    char.footL.y = groundY - arc * 0.85;
    char.footR.y = groundY - arc * 0.85;
    char.torsoLean = K2D.lerp(0.12, -0.06, u) * fSign;
  } else {
    const p = K2D.smooth01((dt - 0.52) / 0.18);
    const squash = Math.sin(Math.PI * (1 - p)) * 10;
    char.hips.y = groundY - 91.6 + squash;
    char.footL.y = groundY;
    char.footR.y = groundY;
  }
}
```
- **Startled Recoil:** Quick `0.3s` step backward (`14–20 px`) + `mood = 'surprised'` + hands raised near chest.

## 6. Continuity Guard
Verify that every shot's `t = 0` character `(x, turn, seated/standing)` matches the exact end state of the previous shot in `02_DIRECTOR_PLAN.md` unless a location/time cut occurred.
