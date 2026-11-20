---
name: story-ideation-and-script
description: Generate visual-first 2D cartoon or historical documentary ideas and structured scripts scaled to 30s, 1-minute, or 3-minute runtimes (01_SCRIPT.md). Load when starting a new video concept or writing a script before directing.
compatibility: opencode
---

# Story Ideation & Visual Script Writer

Your job is to turn a topic into a **stageable, character-driven visual script** (`01_SCRIPT.md`). Do NOT write JavaScript, Canvas code, or `shots.js` in this step.

## 1. Confirm Core Parameters First
If the user did not specify them, infer sensible defaults and state them clearly at the top:
- **Topic / Premise:** (e.g., historical documentary story, fable, slice-of-life comedy)
- **Target Duration:**
  - **Short (30–45s):** 2–3 Scenes, 8–12 Beats (~70–110 caption words)
  - **1-Minute (60s):** 3–4 Scenes, 14–18 Beats (~130–160 caption words)
  - **3-Minute (180s):** 6–8 Scenes, 40–50 Beats (~360–430 caption words)
- **Format:** `16:9` (`1920x1080`), `9:16` (`1080x1920`), or `Both`
- **Cast Size:** Keep to **2–4 named characters** (plus optional background crowd) so visual storytelling stays clear.

## 2. Visual-First Writing Rules (Anti-Boring Filter)
Every beat in a 2D animated story MUST be physically actable with characters, expressions, furniture, props, or animated documentary maps/charts:
- **Rule of 3–5 Seconds:** Every beat must be **2.5s to 5.0s** long. Never write a single 15-second beat.
- **Forbid Abstract-Only Beats:**
  - *Bad:* "Taxes rose across the empire and people grew angry."
  - *Good:* "In the town square, a tax collector snatches coins off a baker's table while two villagers scowl and cross their arms."
- **Include Physical Interactions:** Intentionally weave in natural actions (`walk in`, `sit at table`, `pour/drink tea`, `hand over scroll`, `point at map`, `slam fist`, `react in shock`) so scenes feel alive.
- **Short Captions:** Keep optional on-screen caption text to **<= 12 words per beat** so it wraps cleanly inside `1080x1920` portrait frames as well as `1920x1080`.

## 3. Workflow
1. If the user only gave a broad topic (e.g., *"a 1-min historical story about ancient Rome"*), pitch **3 punchy story hooks** (with clear conflict + visual payoff) and let the user pick—OR if they already gave a specific story, proceed straight to writing `01_SCRIPT.md`.
2. Save the approved script to `projects/<project_slug>/01_SCRIPT.md` using the exact structure below.

## 4. Required Output Template (`projects/<project_slug>/01_SCRIPT.md`)

```markdown
# <Title>
- **Format:** 16:9 & 9:16 | **Target Runtime:** ~60s (16 beats) | **Genre:** Historical Documentary / 2D Cartoon
- **Cast:**
  - `Char_ID` (Role, brief personality/look note)
- **Locations:**
  - `Set_ID` (Brief setting note)

## Scene 1: <Scene Name> (~15s)
**Goal:** <What changes in the story during this scene>

- **[B01 | 4.0s]**
  - **Visual Action:** <Who is on screen, where they move, what object/character they interact with, and facial emotion.>
  - **Caption:** <Optional <= 12 words>
- **[B02 | 3.5s]**
  - **Visual Action:** <...>
  - **Caption:** <...>
```

## 5. Stop Gate
After saving `01_SCRIPT.md`, STOP and ask the user to confirm or tweak the script before loading `video-director-shotlist`. Never jump straight from `01_SCRIPT.md` to code.
