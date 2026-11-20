# Canvas 2D Animation Studio — Core Rules

You build deterministic 2D cartoon & historical documentary videos using HTML5 Canvas 2D + `engine/kit2d.js` + `engine/render2d.mjs` (Playwright + FFmpeg).

## 1. Supported Output Formats
Support BOTH formats seamlessly in every project:
- **16:9 Landscape (`1920x1080`)** — standard YouTube / documentary (`W > H`).
- **9:16 Portrait (`1080x1920`)** — YouTube Shorts / Reels (`H > W`).
- `kit2d.js` scales world units by `Math.min(W, H) / 1080`, so characters and props stay the same proportional size in both orientations. Keep critical action within `X ∈ [-420, +420]` relative to `cam.x` so nothing crops in `9:16`.

## 2. Determinism & Animation Rules
- Every shot's `draw(K, t, k)` MUST be a **pure function of `t`** (seconds into shot) and `k` (`0..1`). Never store mutating global state across frames.
- **No crab-walking:** Always set `turn` (`-1` left, `0` front, `+0.7` 3/4 right, `+1` side right) to face the travel or conversation direction, easing smoothly over `0.25s`.
- **No floating walks:** Always use `K.walkPlan(...)` / `person.walk(...)` (2-Bone IK with ground-locked stance feet).
- **Object interactions:** Use furniture/prop sockets (`chair.seatAnchor()`, `table.surface()`, `person.attachProp('R', cup)`). Never animate a held cup separately from the hand.
- **No frozen statues:** Enable idle breathing + blinks on all visible characters.

## 3. Fast QC Workflow
1. Always run a multi-moment contact sheet first:
   `node engine/render2d.mjs projects/<name> --stills --at 0.15,0.5,0.85 --size 1280x720`
2. Inspect `sheet.jpg` visually before rendering full MP4s.
3. Render full MP4s in both `1920x1080` and `1080x1920` when requested.

## 4. GitHub Repository & Session Continuity
- This folder is the standalone Git repository for **Canvas 2D Animation Studio**.
- Canonical GitHub repository: https://github.com/Sudila-Kuruppu/canvas-2d-studio
- GitHub owner/account: `Sudila-Kuruppu`; the repository is **public**.
- Remote name: `origin` → `https://github.com/Sudila-Kuruppu/canvas-2d-studio.git`
- Default branch: `main`; the local `main` branch tracks `origin/main`.
- Treat the GitHub URL above as the canonical upstream. Do not initialize another repository or replace `origin` unless the user explicitly asks.
- When publishing requested changes, commit to `main` and push to `origin/main` after checking that secrets, `node_modules/`, and generated `projects/*/out/` files are excluded.
- The repository-local commit identity is `Sudila Kuruppu <223135461+Sudila-Kuruppu@users.noreply.github.com>`.
