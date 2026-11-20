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

`sessions/session_NN.js` is the canonical source of truth for Scene Session `NN`. During QA and any later fixes, always edit `sessions/session_NN.js` first and then copy it to `shots.js`. Never edit `shots.js` directly, because activating another session will overwrite it.

## 2. Rendering Each Verified Session Safely
**CRITICAL CACHE GUARD:** `render2d.mjs` caches individual shot videos inside `out/parts/shot_000_...mp4`. Before rendering a **different** session (`session_02.js` after `session_01.js`), ALWAYS clear `out/parts/` so `--resume` never mixes shots from two different scenes!

For each session `NN` (after `animation-director-qa` marks all shots `PASS`):
```bash
# 1. Activate session NN from its canonical source and clear stale shot parts
cp projects/<project_slug>/sessions/session_NN.js projects/<project_slug>/shots.js
rm -rf projects/<project_slug>/out/parts

# 2. Render 16:9 Landscape scene clip
node engine/render2d.mjs projects/<project_slug> --size 1920x1080 --out projects/<project_slug>/out/scene_NN_16x9.mp4

# 3. Render 9:16 Portrait scene clip (uses different WxH filename in parts/, safe!)
node engine/render2d.mjs projects/<project_slug> --size 1080x1920 --out projects/<project_slug>/out/scene_NN_9x16.mp4
```
*(If a render stops mid-way on the **same** session, re-run the exact same command with `--resume`.)*

If QA finds a defect after a session was activated, make the fix in `sessions/session_NN.js`, copy that file to `shots.js`, and re-check it before rendering the final scene clips.

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
