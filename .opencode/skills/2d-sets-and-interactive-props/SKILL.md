---
name: 2d-sets-and-interactive-props
description: Build multi-layer 2D documentary sets (sets.js), optional painted PNG backdrops, split-Z interactive furniture (Chair, Table), grippable props (Cup, Scroll, Coin, Sword), animated map/chart cutaways, and 04_SETS_MANIFEST.json. Load after 02_DIRECTOR_PLAN.md and before scene animation.
compatibility: opencode
---

# 2D Sets, Furniture & Interactive Props

Build rich, non-empty 2D environments and socketed props in `projects/<project_slug>/sets.js` so characters always stand in grounded spaces and interact cleanly with objects.

## 1. Inputs to Read First
1. `projects/<project_slug>/02_DIRECTOR_PLAN.md` (every required `Set_ID` and interactive prop)
2. `AGENTS.md` (safe zone rules for `16:9` and `9:16`)

## 2. Multi-Layer Set Construction Rules (No Blank Walls!)
Every location function `drawSet_<Name>(api, groundY = 0)` MUST layer elements by `z` depth:
1. **Sky / Far Backdrop (`z: -80` to `-60`):** Gradient sky (`api.setSky(...)`), distant mountains/cityscape, or a pre-loaded painted PNG backdrop (`assets/<bg>.png`).
2. **Midground Architecture & Details (`z: -50` to `-20`):** Walls with wainscoting/trim, pillars, arched windows, framed portraits, bookshelves, street buildings, or trees. Add subtle **ambient life** (drifting clouds, flickering candle glow, floating dust motes).
3. **Ground Plane (`z: -10`):** Floorboards, stone tiles, grass/cobblestone road aligned strictly with top surface at `groundY = 0`.
   - Extend walls & floors across `X ∈ [-1600, +1600]` so wide `1920x1080` camera pans never show empty canvas edges.
4. **9:16 Safe Zone:** Place key chairs, tables, podiums, and doorways within `X ∈ [-360, +360]` around the shot's `cam.x` so `1080x1920` portrait frames never crop them out.

## 3. Interactive Furniture & Grippable Prop Standard
- **Furniture:** Use `K2D.Chair` (backrest `z = baseZ - 12`, cushion `z = baseZ - 3`) and `K2D.Table` (`z = 115`). Always expose anchor helpers (`chair.seatAnchor(groundY)`, `table.surface(groundY, offsetX)`).
- **Custom Grippable Props (`ScrollProp`, `CoinBagProp`, `QuillProp`, `SwordProp`):**
  Every grippable prop class MUST implement the exact `K2D.CupProp` socket interface so `char.attachedProps.R = prop` works seamlessly:
  - `gripPoint()` -> `{ x, y }` in world space when resting on table/ground.
  - `drawAt(ctx, handX, handY, tilt, dir)` -> draws prop locked to `handX, handY`, rotated by `tilt`, mirrored by `dir`.
  - `pushToQueue(queue, z)` -> draws prop when resting in the world (unheld).

## 4. Optional Painted PNG Backdrops (`assets/*.png`)
If using painted PNG backgrounds stored in `projects/<project_slug>/assets/`:
- Preload `new Image()` and register a promise with `window.K2D.registerAsset(promise)` before `STUDIO_READY` completes, OR load once inside `sets.js` via `K2D.loadImage('/assets/bg_palace.png')`.
- Draw characters with `K2D`'s dark `#18141c` outline + ground shadow ellipse so vector characters sit cleanly on top of painted backgrounds.

## 5. Historical Documentary Maps & Cutaways
For `CUTAWAY` map/chart shots in `02_DIRECTOR_PLAN.md`:
- Draw parchment base (`#eadab8`) with subtle grid/border and compass rose.
- Animate route arrows progressively using `K2D.ramp(t, t0, dur)` along polyline points (`setLineDash` or clipped path length).
- Animate pulsing location pins (`1 + 0.15 * Math.sin(t * 6)`) and crisp vector title/date stamps.

## 6. Mandatory Set Preview & `04_SETS_MANIFEST.json`
1. Render a 1-still-per-set preview (`--stills`) showing every set & furniture layout (without characters) to verify bright colors, clear `groundY = 0` floor line, and zero cropping in **both `1920x1080` and `1080x1920`**.
2. Save `projects/<project_slug>/04_SETS_MANIFEST.json` listing:
   - Each set function name, `groundY`, safe `camX` range, and exact `X` positions of every `Chair` (`entryX`, `seatX`, `facing`), `Table` (`surfaceY`), and `Prop` (`gripPoint`).
