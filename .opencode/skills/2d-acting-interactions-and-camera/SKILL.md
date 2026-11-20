---
name: 2d-acting-interactions-and-camera
description: Direct character acting, facial expressions, keep-alive motion, character-to-object actions (cup drink, scroll reading), two-character interactions (gaze, prop handoffs, action-reaction overlap), background crowds, and 16:9/9:16 documentary camera framing. Load when coding shot acting and camera motion.
compatibility: opencode
---

# 2D Acting, Interactions & Documentary Camera

Bring scenes to life so characters behave like actors in a historical documentary rather than stiff puppets.

## 1. Inputs to Read First
1. `projects/<project_slug>/02_DIRECTOR_PLAN.md`
2. `projects/<project_slug>/RIG_MANIFEST.json` (`armMaxReach = 76` — keep hand targets within `72` units of shoulder!)
3. `projects/<project_slug>/04_SETS_MANIFEST.json`

## 2. Keep-Alive Rule (Never Freeze Characters)
On EVERY visible character in EVERY shot:
- Call `char.autoBlink(t, period, offset)` — vary `period` (`3.0`, `3.5`, `4.1`) and `offset` per character so characters never blink in unison.
- Call `char.autoBreathe(t, 1.6)` when standing or seated.

## 3. Object Interaction Recipes (Socket-Locked, Zero Drift)
Always compute `sk = char.getSkeleton()` before setting arm IK targets. Keep `Math.hypot(target.x - sh.x, target.y - sh.y) <= 72`.

### A. Drink From Cup (`CupProp`)
1. **Reach (`0.65s`):** Ease `char.handRTarget` from rest (`{ x: sk.shR.x + 6, y: sk.shR.y + 62 }`) to `cup.gripPoint()`. Draw cup in world (`cup.pushToQueue(api.queue, 118)`).
2. **Lift (`0.75s`):** Set `char.attachedProps.R = cup` (do NOT also call `cup.pushToQueue`). Ease `handRTarget` to `{ x: sk.mouthPos.x + fSign * 2, y: sk.mouthPos.y + 6, tilt: -0.42 * fSign }` and `char.headTilt = -0.14 * fSign`.
3. **Sip (`0.8–1.2s`):** Hold cup at mouth (`tilt: -0.52 * fSign`), `char.headTilt = -0.16 * fSign`, `char.mood = 'sip'`.
4. **Place Back & Release (`1.2s`):** Ease back to `cup.gripPoint()` (`tilt -> 0`, `headTilt -> 0`, `mood = 'happy'`), then clear `attachedProps.R = null`, draw `cup.pushToQueue(...)`, and relax hand to rest.

### B. Read / Inspect Scroll or Document
- Hold scroll at chest/reading height: `handRTarget = { x: sk.shR.x + 30 * fSign, y: sk.shR.y + 16 }`, `char.headTilt = 0.14 * fSign`, `char.gaze = handRTarget`.

## 4. Two-Character Interactions & Prop Handoffs
1. **Mutual Eye-Line (`gaze`):** Set `charA.gaze = { x: charB.hips.x, y: charB.hips.y - 100 }` (and vice versa) during conversation/confrontation. Only set `gaze = null` with `turn = 0` when addressing the camera.
2. **Action-Reaction Overlap:** While Character A gestures or speaks, Character B MUST react visibly—nod (`headTilt = Math.sin(t * 7) * 0.08`), lean back in shock (`torsoLean = -0.09 * fSign`, `mood = 'surprised'`), or scowl with hand on hip (`mood = 'angry'`).
3. **Prop Handoff (Scroll / Coin Bag / Crown):**
   - Stand characters `~130–150 px` apart facing each other (`+0.74` and `-0.74`).
   - Define midpoint `pt = { x: 0.5 * (giver.hips.x + receiver.hips.x), y: -125 }`.
   - Before `tSwap`: `giver.attachedProps.R = prop`; both `giver.handRTarget` and `receiver.handLTarget` ease into `pt`.
   - At `t >= tSwap`: switch `giver.attachedProps.R = null` and `receiver.attachedProps.L = prop`, then ease both hands back toward chest/rest.

## 5. Expressive Gesture Library (Pure Functions of `t`)
Use these clean IK targets relative to `sk = char.getSkeleton()` (`fSign = sk.fSign`):
- **Wave:** `{ x: sk.shR.x + 26 * fSign + Math.sin(t * 10) * 14, y: sk.shR.y - 36 }`
- **Explain / Gesture:** `{ x: sk.shR.x + 40 * fSign, y: sk.shR.y + 6 + Math.sin(t * 7) * 6 }`
- **Point Forward:** `{ x: sk.shR.x + 56 * fSign, y: sk.shR.y - 4 }`
- **Hands on Hips (Authority):** `{ x: char.hips.x + 20 * fSign, y: char.hips.y - 8 }`
- **Shock / Facepalm:** `{ x: sk.headCenter.x + 6 * fSign, y: sk.headCenter.y + 6 }`, `char.mood = 'sad'` or `'surprised'`

## 6. Crowds & Documentary Camera Grammar
- **Background Crowds:** Place background soldiers/villagers at `baseZ = 55–75` (behind hero `baseZ = 100`). Offset animations deterministically (`autoBlink(t, 3.4, idx * 0.65)`, `autoBreathe(t + idx * 0.5)`).
- **Framing & Zooms:**
  - `WIDE`: `cam.zoom = 1.4–1.6`, `cam.y = -125`
  - `MEDIUM`: `cam.zoom = 1.8–2.0`, `cam.y = -115`
  - `CLOSE` (face / cup / emotion): `cam.zoom = 2.35–2.65`, `cam.y = -148` (center higher on head & shoulders!)
- **9:16 Safe Zone Check:** Keep active characters and held props within `X ∈ [-420, +420]` of `api.cam.x` at all times.
- **Smooth Camera Motion:** Always wrap `cam.x`, `cam.y`, and `cam.zoom` changes in `K2D.smooth01(k)` or `K2D.ramp(...)` so camera moves ease softly in and out.
