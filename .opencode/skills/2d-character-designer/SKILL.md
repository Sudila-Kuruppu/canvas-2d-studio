---
name: 2d-character-designer
description: Create a consistent visual Character Bible (03_CHARACTER_BIBLE.md) from 01_SCRIPT.md and 02_DIRECTOR_PLAN.md, locking proportions, color palettes, historical costumes, accessories, and facial expression rules. Load before rigging or drawing characters.
compatibility: opencode
---

# 2D Character Designer (Visual Bible)

You design **recognizable, high-contrast 2D cartoon characters** tailored to `engine/kit2d.js`. Do NOT write animation shot code here.

## 1. Inputs to Read First
1. `projects/<project_slug>/01_SCRIPT.md`
2. `projects/<project_slug>/02_DIRECTOR_PLAN.md`

## 2. Visual Design Rules (Make Characters Distinct & Readable)
1. **Silhouette First:** Every named character MUST be recognizable by silhouette + color at small mobile sizes (`9:16`):
   - Vary **hats/hair** (`crown`, `tricorne`, `helmet`, `cap`, `tophat`, bald, curly hair), **facial hair** (`beard`, `mustache`, clean), and **garments** (`sash`, `cape`, `apron`, `collar`).
2. **Ink-Friendly Color Palette:**
   - Outlines are `#18141c` (`lineW: 4.5`).
   - Avoid pure `#000000` clothing (outlines disappear!) or pure `#ffffff` shirts (eyes blend in). Use rich mid-tones (`#5b349a`, `#2b6cb0`, `#2e7d5b`, `#b84339`, `#c98b2c`, `#6e4e37`).
   - Check contrast against the locations in `02_DIRECTOR_PLAN.md` (e.g., don't dress a character in `#e7dcc8` tan inside a `#e7dcc8` tan palace room).
3. **Crowd / Background Extras Rule:** If the script needs crowds (soldiers, townsfolk), define 1–2 simple reusable **Archetype Palettes** with muted tones so hero characters pop in front.
4. **Expression Mapping:** Define each character's default `mood` (`neutral`, `happy`, `angry`, `sad`, `surprised`, `sip`) and signature body habit (e.g., *"King stands tall with stern brows; Advisor leans slightly forward and gestures"*).

## 3. Output File (`projects/<project_slug>/03_CHARACTER_BIBLE.md`)

```markdown
# Character Bible — <Project Title>

## Global Art Spec
- **Outline:** `#18141c`, `lineW: 4.5`
- **Base Rig:** `K2D.Character` (`headR: 33`, `torsoH: 66`, `thighLen: 46`, `shinLen: 46`)
- **Default Views:** `turn = ±0.74` (3/4 dialogue & walk), `turn = 0` (direct camera address)

## Cast Profiles
### 1. `<Char_ID>` — <Display Name / Role>
- **Palette:** skin `#...` | shirt `#...` | pants `#...` | hair `#...` | shoe `#...` | sash/trim `#...`
- **Costume & Silhouette:** `hat: <type>`, `beard: <true/false>`, custom overlays: <e.g., gold buttons, cape, glasses>
- **Personality & Default Mood:** <e.g., stern -> `angry` / `neutral`; reacts with raised brows>
- **Props Held in Story:** <e.g., `Cup_Tea`, `Scroll_Decree`>
```

## 4. Stop Gate
Present `03_CHARACTER_BIBLE.md` for quick review before loading `2d-rig-and-ik-engine`.
