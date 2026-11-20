---
name: animation-director-qa
description: Visually inspect multi-moment contact sheets (15%, 50%, 85% of every shot) in 16:9 and 9:16 against 02_DIRECTOR_PLAN.md, log QA_REPORT.md, and fix only failing shots. Load after animating any scene session and before final MP4 rendering.
compatibility: opencode
---

# Animation Director Visual QA

Never render a full MP4 blindly. Always inspect multi-moment contact sheets first so movement, grip, framing, and continuity bugs are caught in seconds.

## 1. Generate Multi-Moment Contact Sheets
`render2d.mjs` always reads `projects/<project_slug>/shots.js`. Before every QA render, activate the session by copying its canonical source file to `shots.js`:

```bash
cp projects/<project_slug>/sessions/session_NN.js projects/<project_slug>/shots.js
```

Never edit `shots.js` directly. It is an active-session copy, not the source of truth.

Run `--stills` at `0.15,0.5,0.85` (start, middle, end of every shot). Note that `render2d.mjs` writes to `out/sheet.jpg`, so rename each size before running the next:

```bash
# 16:9 Landscape check (fast 1280x720 preview matches 1920x1080 framing exactly)
node engine/render2d.mjs projects/<project_slug> --stills --at 0.15,0.5,0.85 --size 1280x720
cp projects/<project_slug>/out/sheet.jpg projects/<project_slug>/out/sheet_16x9.jpg

# 9:16 Portrait check (verify safe zone & caption wrapping)
node engine/render2d.mjs projects/<project_slug> --stills --at 0.15,0.5,0.85 --size 1080x1920
cp projects/<project_slug>/out/sheet.jpg projects/<project_slug>/out/sheet_9x16.jpg
```

## 2. Mandatory 8-Point Visual Inspection Checklist
Open `sheet_16x9.jpg` and `sheet_9x16.jpg` and inspect every shot row against `02_DIRECTOR_PLAN.md`:
1. **No Empty / Boring Frames:** Every shot shows the planned characters, furniture, props, or animated map—never a blank wall or missing hero.
2. **9:16 Safe Zone & Caption Wrap:** In `sheet_9x16.jpg`, no active character/prop is cropped at the left/right edges, and caption text wraps cleanly inside its rounded box.
3. **No Crab-Walking:** Walking characters face their travel direction (`turn ≈ ±0.76`), never `turn === 0` sliding sideways.
4. **Grounded Feet & Upright Idle:** Standing characters are upright (`hips.y ≈ -91.6`), not half-squatting; walk frames show alternating planted feet and lifted swing knees.
5. **Chair & Table Contact:** Seated characters have hips on the cushion, backrest behind torso, knees bent ~90° with feet on `groundY = 0`, and no clipping through chair legs.
6. **Prop & Cup Grip:** Held props sit cleanly at the hand socket (never drawn twice or floating), and cups align cleanly near the mouth without the fist covering the eyes.
7. **Real Motion Progression:** Comparing `0.15` → `0.50` → `0.85` across a row shows clear movement, gesture, expression change, or camera motion (no frozen static shots).
8. **Cut Continuity:** Character `(X, turn, seated/standing)` at `0.85` of Shot `N` matches `0.15` of Shot `N+1` in the same set.

## 3. Surgical Fix Rule & `QA_REPORT.md`
1. Save findings to `projects/<project_slug>/QA_REPORT.md` (`PASS` or `FAIL` per shot with exact fix notes).
2. If Shot `k` fails, edit **ONLY Shot `k`** in `projects/<project_slug>/sessions/session_NN.js` (do not alter passing shots and do not edit `shots.js` directly).
3. Copy the updated canonical session file to the active render file before re-checking:
   ```bash
   cp projects/<project_slug>/sessions/session_NN.js projects/<project_slug>/shots.js
   node engine/render2d.mjs projects/<project_slug> --shots <k> --stills --at 0.15,0.5,0.85 --size 1280x720
   ```
4. Only proceed to `scene-session-assembler` once all shots in the session mark `PASS`. The verified `sessions/session_NN.js` remains the source of truth when later sessions are activated.
