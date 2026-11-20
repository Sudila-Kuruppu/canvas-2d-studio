---
name: video-director-shotlist
description: Convert 01_SCRIPT.md into a shot-by-shot visual directing plan (02_DIRECTOR_PLAN.md) specifying framing, camera motion, character facing, gaze, locomotion, furniture/prop interactions, expressions, and scene sessions. Load after 01_SCRIPT.md and before building characters, sets, or animation code.
compatibility: opencode
---

# Video Director & Shotlist Planner

You are the **Animation Director**. Your job is to translate `01_SCRIPT.md` into a crystal-clear, shot-by-shot blueprint (`02_DIRECTOR_PLAN.md`) so the animation stage never improvises empty walls, crab-walking characters, or floating objects.

Do NOT write JavaScript or `shots.js` in this step.

## 1. Inputs to Read First
1. `AGENTS.md` (format safe-zone rules: keep key action within `X ∈ [-420, +420]` around `cam.x` so both `16:9` and `9:16` frame cleanly).
2. `projects/<project_slug>/01_SCRIPT.md`.

## 2. Director's Mandatory Rules (Fix Common AI Failures)
1. **Zero Empty Shots:** Every 2.5–5.0s shot MUST contain active visual storytelling (character movement/gesture, character interaction, animated map/chart, or prop reveal). Never park the camera on an empty wall or blank water plane.
2. **Continuous Spatial Continuity:**
   - Within the same location, if `Char_A` finishes Shot `N` at `X = 116, facing +0.75`, Shot `N+1` MUST start `Char_A` at `X = 116, facing +0.75` (unless a deliberate time-jump/cutaway is noted).
   - Never teleport a character onto a chair! Plan the `walk -> stop at entryX -> sitDown` sequence explicitly.
3. **No Crab-Walking:** Specify `turn` (`-1` left, `0` front, `+0.74` 3/4 right, `-0.74` 3/4 left) for every character. Characters must turn toward travel direction (`0.25s–0.35s`) before walking, and turn toward each other during dialogue.
4. **Object & Furniture Sockets:** Explicitly state every object interaction lifecycle:
   - Chair: `stand at entryX -> sitDown -> seated pose` (specify backrest behind / table overlap if behind desk).
   - Grippable prop (`Cup`, `Scroll`, `Sword`, `Coin`): `onTable -> reach -> attach('R') -> action (drink/read/handoff) -> placeBack -> release`.
5. **Two-Character Action-Reaction Rule:** Whenever 2+ characters share a shot, define BOTH the **Speaker/Actor** AND the **Listener's** `gaze` target and reaction (nod, lean back, narrowed angry eyes, blink, subtle idle breath—no frozen statues!).
6. **Documentary Camera Grammar:** Vary shots intentionally so scenes feel directed:
   - `WIDE` (`zoom ~1.4–1.6`): establish location, arrivals, crowds.
   - `MEDIUM` (`zoom ~1.8–2.0`): walks, sitting at tables, two-character exchanges.
   - `CLOSE` (`zoom ~2.3–2.7`): drinking from cup, shocked facial reaction, coin/scroll detail.
   - `CUTAWAY` (`2D Map / Chart / Card`): animated battle arrows, timelines, stat bars.

## 3. Session Grouping (Critical for 1-Min and 3-Min Videos)
Group shots into **Scene Sessions** (`15–30 seconds` per session, ~4–8 shots each) so downstream animation sessions stay small, accurate, and easy to QA:
- 1-minute video → 3–4 Sessions
- 3-minute video → 6–8 Sessions

## 4. Required Output Template (`projects/<project_slug>/02_DIRECTOR_PLAN.md`)

```markdown
# Director Plan — <Title>
- **FPS:** 30 | **Total Duration:** <N>s (<F> frames) | **Formats:** 16:9 & 9:16
- **Cast List:** <IDs>
- **Sets Required:** <Set_IDs + Interactive Props Needed>

## Session Index
- **Session 1 (Scene 1):** Shots `S01-01` .. `S01-04` (<dur>s)
- **Session 2 (Scene 2):** Shots `S02-01` .. `S02-05` (<dur>s)

---

## Session 1 — Scene 1: <Scene Name>

### Shot S01-01 (`<dur>s` | `<frames>f`) — Beat B01
- **Set & Depth Layers:** `<Set_ID>` | BG: <sky/wall/window> | Mid: <furniture/props> | FG: <ambient dust/clouds/pillar>
- **Camera:** `<WIDE/MEDIUM/CLOSE/CUTAWAY>` | `cam: (x1, y1, z1) -> (x2, y2, z2)` (eased)
- **Cast & Placement:**
  - `<Char_A>`: start `(X, turn)` -> end `(X, turn)` | gaze: `<target>`
  - `<Char_B>`: start `(X, turn)` -> end `(X, turn)` | gaze: `<target>`
- **Action Choreography (Timed):**
  - `0.0–0.35s`: <turn / establish>
  - `0.35–2.6s`: <walk / gesture / sitDown / grab & drink>
  - `2.6–3.5s`: <settle / reaction>
- **Expressions & Secondary Motion:** `<Char_A> neutral->happy + blink`, `<Char_B> nods + waves`, <ambient candle flicker>
- **Props / Visual Gags:** `<Cup_Tea on Table_01>`, `<sweat drop / lightbulb / map arrow>`
- **Caption:** `<Exact <= 12 words or None>`
```

## 5. Pre-Production Checklist (Verify Before Finishing)
Before presenting `02_DIRECTOR_PLAN.md`:
- [ ] Every shot is `2.5s–5.0s` (or justified) and has clear visual motion.
- [ ] Zero shots leave a character missing or facing the wrong way while walking.
- [ ] Every sit, drink, or prop handoff includes the full physical sequence (reach/grab/return).
- [ ] Key characters/props stay within `X ∈ [-420, +420]` relative to `cam.x` for `9:16` safety.

STOP after saving `02_DIRECTOR_PLAN.md` and confirm the shotlist with the user before building characters and sets.
