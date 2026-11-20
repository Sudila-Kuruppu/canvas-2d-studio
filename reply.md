Here is **Step 4** — the two Movement & Acting skills built directly on top of your verified `engine/kit2d.js` helpers (`computeWalkPose`, `sitDown`, `solve2BoneIK`, `attachedProps`, `gaze`, and `turn`).

Save these two files inside `.opencode/skills/` in `~/canvas-2d-studio/`.

---

### 1. `.opencode/skills/2d-character-locomotion/SKILL.md`

```markdown
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
// Example 0.70s jump starting at t0 (0.14s crouch -> 0.38s arc -> 0.18s land)
if (t >= t0 && t <= t0 + 0.70) {
  const dt = t - t0;
  if (dt < 0.14) {
    const p = K2D.smooth01(dt / 0.14);
    char.hips.y = -91.6 + 14 * p; // knees bend, feet stay on floor!
    char.torsoLean = 0.12 * fSign * p;
  } else if (dt < 0.52) {
    const u = (dt - 0.14) / 0.38;
    const arc = 4 * u * (1 - u) * 58;
    char.hips.y = -91.6 - arc;
    char.footL.y = -arc * 0.85;
    char.footR.y = -arc * 0.85;
    char.torsoLean = K2D.lerp(0.12, -0.06, u) * fSign;
  } else {
    const p = K2D.smooth01((dt - 0.52) / 0.18);
    const squash = Math.sin(Math.PI * (1 - p)) * 10;
    char.hips.y = -91.6 + squash;
    char.footL.y = 0;
    char.footR.y = 0;
  }
}
```
- **Startled Recoil:** Quick `0.3s` step backward (`14–20 px`) + `mood = 'surprised'` + hands raised near chest.

## 6. Continuity Guard
Verify that every shot's `t = 0` character `(x, turn, seated/standing)` matches the exact end state of the previous shot in `02_DIRECTOR_PLAN.md` unless a location/time cut occurred.
```

---

### 2. `.opencode/skills/2d-acting-interactions-and-camera/SKILL.md`

```markdown
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
```

---

### One Step Left!
Only **Step 5** remains:
- **`animation-director-qa`** (3-moment visual audit per shot checking grounded feet, chair contact, cup grip, facing, and motion progression)
- **`scene-session-assembler`** (building & stitching 15–30s scenes into a 1–3 minute silent master `.mp4` + `TIMELINE_MARKERS.json` ready for voiceover/SFX later)

Say **"Start Step 5"** whenever you're ready to finish the skill suite!
Here is **Step 5** — the final two skills covering **Multi-Moment Visual QA** and **1-Min / 3-Min Multi-Session Assembly** (with `TIMELINE_MARKERS.json` so you can drop voiceover, music, and SFX in later).

Save these two files inside `.opencode/skills/` in `~/canvas-2d-studio/`.

---

### 1. `.opencode/skills/animation-director-qa/SKILL.md`

```markdown
---
name: animation-director-qa
description: Visually inspect multi-moment contact sheets (15%, 50%, 85% of every shot) in 16:9 and 9:16 against 02_DIRECTOR_PLAN.md, log QA_REPORT.md, and fix only failing shots. Load after animating any scene session and before final MP4 rendering.
compatibility: opencode
---

# Animation Director Visual QA

Never render a full MP4 blindly. Always inspect multi-moment contact sheets first so movement, grip, framing, and continuity bugs are caught in seconds.

## 1. Generate Multi-Moment Contact Sheets
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
2. If Shot `k` fails, edit **ONLY Shot `k`** (do not alter passing shots) and re-check it fast:
   ```bash
   node engine/render2d.mjs projects/<project_slug> --shots <k> --stills --at 0.15,0.5,0.85 --size 1280x720
   ```
3. Only proceed to `scene-session-assembler` once all shots in the session mark `PASS`.
```

---

### 2. `.opencode/skills/scene-session-assembler/SKILL.md`

```markdown
---
name: scene-session-assembler
description: Organize 1-minute or 3-minute videos into clean per-scene sessions (sessions/session_NN.js), render each verified session safely to 16:9 and 9:16 MP4s, concatenate into a silent master video, and export TIMELINE_MARKERS.json for future voice/SFX mixing. Load when rendering or assembling multi-scene projects.
compatibility: opencode
---

# Multi-Session Renderer & Master Assembler

For **1-minute and 3-minute videos**, NEVER cram 20–55 shots into a single giant `shots.js` file. Animate, QA, and render **one Scene Session (~15–30s) at a time**, then stitch the verified scene clips together.

## 1. Per-Session Folder Structure
Keep each verified scene saved safely inside `projects/<project_slug>/sessions/`:
```text
projects/<project_slug>/
├── cast.js
├── sets.js
├── sessions/
│   ├── session_01.js   (Scene 1: Shots S01-01..S01-05)
│   ├── session_02.js   (Scene 2: Shots S02-01..S02-05)
│   └── ...
├── shots.js            (Active session copied here for render2d.mjs)
└── out/
```

## 2. Rendering Each Verified Session Safely
**CRITICAL CACHE GUARD:** `render2d.mjs` caches individual shot videos inside `out/parts/shot_000_...mp4`. Before rendering a **different** session (`session_02.js` after `session_01.js`), ALWAYS clear `out/parts/` so `--resume` never mixes shots from two different scenes!

For each session `NN` (after `animation-director-qa` marks all shots `PASS`):
```bash
# 1. Activate session NN and clear stale shot parts from previous sessions
cp projects/<project_slug>/sessions/session_NN.js projects/<project_slug>/shots.js
rm -rf projects/<project_slug>/out/parts

# 2. Render 16:9 Landscape scene clip
node engine/render2d.mjs projects/<project_slug> --size 1920x1080 --out projects/<project_slug>/out/scene_NN_16x9.mp4

# 3. Render 9:16 Portrait scene clip (uses different WxH filename in parts/, safe!)
node engine/render2d.mjs projects/<project_slug> --size 1080x1920 --out projects/<project_slug>/out/scene_NN_9x16.mp4
```
*(If a render stops mid-way on the **same** session, re-run the exact same command with `--resume`.)*

## 3. Concatenate All Scene Clips Into Silent Master MP4
Once all sessions `01..M` are rendered, create `out/master_concat_16x9.txt` (and `_9x16.txt`) listing each `scene_NN` MP4 in order:
```text
file 'scene_01_16x9.mp4'
file 'scene_02_16x9.mp4'
file 'scene_03_16x9.mp4'
```
Concatenate losslessly (`-c copy`, zero quality loss, instant):
```bash
ffmpeg -y -f concat -safe 0 -i projects/<project_slug>/out/master_concat_16x9.txt -c copy -movflags +faststart projects/<project_slug>/out/master_silent_16x9.mp4
ffmpeg -y -f concat -safe 0 -i projects/<project_slug>/out/master_concat_9x16.txt -c copy -movflags +faststart projects/<project_slug>/out/master_silent_9x16.mp4
```
Verify final runtime with `ffprobe`:
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 projects/<project_slug>/out/master_silent_16x9.mp4
```

## 4. Export `TIMELINE_MARKERS.json` (Audio-Ready Blueprint)
Compute exact frame-aligned shot boundaries (`round(dur * fps) / fps`) from `02_DIRECTOR_PLAN.md` + `sessions/session_*.js` and write `projects/<project_slug>/TIMELINE_MARKERS.json`:
```json
{
  "fps": 30,
  "totalDurationSec": 60.0,
  "shots": [
    {
      "id": "S01-01",
      "session": 1,
      "startSec": 0.0,
      "endSec": 4.0,
      "caption": "...",
      "sfxCues": [
        { "t": 0.4, "type": "footsteps_start" },
        { "t": 3.5, "type": "cup_clink" }
      ]
    }
  ]
}
```
This lets you drop in voiceover, music, and SFX later without re-animating a single frame.
```

---

### Your Complete Canvas 2D Studio Is Finished!

Your new `~/canvas-2d-studio/` workspace now has **100% of the engine + all 9 skills**:

```text
~/canvas-2d-studio/
├── AGENTS.md
├── engine/
│   ├── package.json
│   ├── page.html
│   ├── kit2d.js          (2-Bone IK, footprint walk, sitDown, Cup sockets, multi-view turn, caption wrap)
│   └── render2d.mjs      (Fast in-page toDataURL -> FFmpeg, multi-moment --stills, --resume)
├── projects/
│   └── calibration_test/
└── .opencode/
    └── skills/
        ├── story-ideation-and-script/SKILL.md
        ├── video-director-shotlist/SKILL.md
        ├── 2d-character-designer/SKILL.md
        ├── 2d-rig-and-ik-engine/SKILL.md
        ├── 2d-sets-and-interactive-props/SKILL.md
        ├── 2d-character-locomotion/SKILL.md
        ├── 2d-acting-interactions-and-camera/SKILL.md
        ├── animation-director-qa/SKILL.md
        └── scene-session-assembler/SKILL.md
```

Whenever you want to make your first **real 1-minute historical documentary or cartoon video** with this pipeline, just open `opencode` inside `~/canvas-2d-studio/` and start at Step 1:
> *"Load `story-ideation-and-script` and create a 1-minute historical documentary script about `<your topic>` for 16:9 and 9:16."*