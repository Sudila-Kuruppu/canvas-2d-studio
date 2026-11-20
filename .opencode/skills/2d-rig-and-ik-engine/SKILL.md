---
name: 2d-rig-and-ik-engine
description: Build reusable character factories (cast.js) on top of engine/kit2d.js, add custom historical hats/costume overlays, generate RIG_MANIFEST.json, and render a mandatory Calibration Sheet testing walk, sit, cup grip, turns, and expressions. Load after 03_CHARACTER_BIBLE.md.
compatibility: opencode
---

# 2D Rig & IK Engine Builder

Build clean, reusable character definitions backed by `engine/kit2d.js`'s 2-Bone IK solver (`solve2BoneIK`), footprint walk (`computeWalkPose`), `sitDown`, and `attachedProps` sockets.

## 1. Inputs to Read First
1. `engine/kit2d.js` (do NOT reinvent IK or walk math—always call `K2D.*`).
2. `projects/<project_slug>/03_CHARACTER_BIBLE.md`.

## 2. Core Rigging Rules
1. **Shared Cast Module (`projects/<project_slug>/cast.js`):**
   Define a factory function per character (e.g., `makeKing()`, `makeAdvisor()`, `makeGuard(seed)`) so every Scene Session reuses identical colors, outfits, and proportions.
2. **Custom Historical Costumes & Hats:**
   `K2D.Character` supports `crown`, `cap`, `beard`, and `sash` out of the box. For extra historical pieces (e.g., `tricorne`, `helmet`, `monocle`, `royalCoat`, `mustache`, `cape`):
   - Attach a clean helper draw hook using `sk = char.getSkeleton()` (`sk.headCenter`, `sk.shX`, `sk.shY`, `char.turn`) pushed to `api.queue` at exact offsets (`headZ + 1` for hats/glasses, `torsoZ - 2` for capes, `torsoZ + 1` for coats/badges).
   - Never cover the eyes or mouth! Check `turn` offset (`fx = char.turn * 14`) so mustaches, glasses, and hat brims shift with the head turn.
3. **Orientation & Joint Limits:**
   - Standing `hips.y = groundY - 91.6` (upright posture, never bent/squatting).
   - `turn`: `-1.0` (left) .. `0` (front) .. `+1.0` (right). Use `±0.74` for 3/4 views.
   - Arm max reach = `upperArmLen + forearmLen - 2 = 74` world units from `sk.shL`/`sk.shR`. Keep props within `70` units of the shoulder when grabbing.

## 3. Mandatory Calibration Sheet Test
Before animating ANY story scene, create `projects/<project_slug>/calibration_shots.js` (or temporary `shots.js`) showing **each hero character** in 5 verification poses:
1. **Pose 0 — Upright 3/4 Idle (`turn = +0.74`)** + Left-facing (`turn = -0.74`)
2. **Pose 1 — Mid-Stride Walk Contact** (one foot planted, other lifting cleanly)
3. **Pose 2 — Seated 90° on `K2D.Chair`** (feet on floor, butt on cushion, backrest behind)
4. **Pose 3 — Prop Grip & Sip** (hand gripping `CupProp` or holding `Scroll` without fist covering eyes)
5. **Pose 4 — Expression Strip** (`neutral`, `happy`, `angry`, `sad`, `surprised`)

Render and inspect `sheet.jpg`:
```bash
node engine/render2d.mjs projects/<project_slug> --stills --at 0.5 --size 1280x720
```
Fix any hat misalignment, beard-overlapping-mouth, or awkward prop offset right now.

## 4. Output `projects/<project_slug>/RIG_MANIFEST.json`
Save exact rig metadata for downstream locomotion/acting skills:
```json
{
  "cast_file": "projects/<project_slug>/cast.js",
  "groundY": 0,
  "standHipsY": -91.6,
  "legMaxReach": 92,
  "armMaxReach": 76,
  "characters": {
    "King": {
      "factory": "makeKing",
      "hat": "crown",
      "customOverlays": ["royalCape"],
      "defaultMood": "neutral"
    }
  }
}
```
