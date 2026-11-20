I rechecked **Steps 1 through 5** (especially Step 4 and Step 5, plus how they connect to `engine/kit2d.js` and `engine/render2d.mjs`). Almost everything is solid, and I caught **3 small bugs/edge cases** you should tell your coding AI to apply when saving those files:

---

### Recheck Findings (3 Fixes to Include)

#### 1. Jump Anticipation → Airborne Discontinuity (in `2d-character-locomotion`)
In Step 4's `2d-character-locomotion/SKILL.md` Section 5, at `dt = 0.14`, the crouch ended at `hips.y = -77.6` (`-91.6 + 14`), and the airborne phase started at `hips.y = -91.6` (`arc = 0`), which would cause a **1-frame 14px upward pop**.

**Fix:** Replace the Jump code block in `2d-character-locomotion/SKILL.md` Section 5 with this smooth continuous version (and use `groundY` explicitly):

```js
// Smooth 0.70s jump starting at t0 (0.14s crouch -> 0.38s arc -> 0.18s land)
const groundY = 0;
if (t >= t0 && t <= t0 + 0.70) {
  const dt = t - t0;
  if (dt < 0.14) {
    const p = K2D.smooth01(dt / 0.14);
    char.hips.y = groundY - 91.6 + 14 * p; // knees bend, feet stay on floor
    char.torsoLean = 0.12 * fSign * p;
  } else if (dt < 0.52) {
    const u = (dt - 0.14) / 0.38;
    const arc = 4 * u * (1 - u) * 58;
    const pushOut = 14 * Math.pow(1 - u, 3); // smoothly leaves crouch without snapping!
    char.hips.y = groundY - 91.6 + pushOut - arc;
    char.footL.y = groundY - arc * 0.85;
    char.footR.y = groundY - arc * 0.85;
    char.torsoLean = K2D.lerp(0.12, -0.06, u) * fSign;
  } else {
    const p = K2D.smooth01((dt - 0.52) / 0.18);
    const squash = Math.sin(Math.PI * (1 - p)) * 10;
    char.hips.y = groundY - 91.6 + squash;
    char.footL.y = groundY;
    char.footR.y = groundY;
  }
}
```

---

#### 2. Keep the Final `404` Branch in `engine/render2d.mjs` (from Step 3's Patch)
In Step 3, when adding `/cast.js`, `/sets.js`, and `/assets/*` routes to `engine/render2d.mjs`, make sure the outer `else` for unknown paths (like `/favicon.ico`) is kept at the end so requests don't hang:

```javascript
  } else if (url === '/cast.js' || url === '/sets.js') {
    const f = path.join(projectDir, url.slice(1));
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    if (fs.existsSync(f)) fs.createReadStream(f).pipe(res);
    else res.end('// optional module');
  } else if (url.startsWith('/assets/')) {
    const safeRel = path.normalize(url).replace(/^(\.\.[/\\])+/, '');
    const f = path.join(projectDir, safeRel);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) {
      const ext = path.extname(f).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(f).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  } else {
    res.writeHead(404);
    res.end();
  }
```

---

#### 3. Keep `sessions/session_NN.js` Synced with `shots.js` During QA (Step 5)
In Step 5's `animation-director-qa` + `scene-session-assembler`:
- Remember `render2d.mjs` always reads `projects/<slug>/shots.js`.
- So during Step 5 QA fixes, always **edit `sessions/session_NN.js` first and copy it to `shots.js`** (`cp projects/<slug>/sessions/session_NN.js projects/<slug>/shots.js`), rather than editing `shots.js` directly—otherwise moving to `session_02.js` would overwrite your QA fix in `session_01`!

---

### Everything Else Verified Clean
I also verified these details across Step 4 and Step 5 against `engine/kit2d.js` and `engine/render2d.mjs`:
- **Symmetrical Cup Sipping (`fSign = +1` and `-1`):** `headTilt = -0.16 * fSign` and `tilt = -0.52 * fSign` in `2d-acting-interactions-and-camera` match `CupProp.drawAt` (`handX + dir * 10`) for both right-facing and left-facing characters. *(Just note: if a character approaches a table from the right side facing left `fSign = -1`, use `{ x: cup.x + 10, y: cup.y - 12 }` for the right-side handle grip.)*
- **`autoBreathe` vs. `applyWalk`:** `autoBreathe()` adjusts `this.chestBob` (not `hips.y`), so it layers cleanly with `applyWalk()` and upright standing (`hips.y = -91.6`) without causing bent knees.
- **`--shots <k> --stills` in QA:** `render2d.mjs` deletes `out/stills/` before each `--stills` run and builds the exact `3x1` tile contact sheet cleanly.
- **`ffmpeg concat` in `scene-session-assembler`:** Relative `file 'scene_01_16x9.mp4'` inside `out/master_concat_16x9.txt` resolves cleanly relative to `out/`.

---

### Quick Instruction to Paste to Your Coding AI
If you paste my previous reply together with this reply into OpenCode, add this note at the top:
> *"Save the 4 skills (`2d-character-locomotion`, `2d-acting-interactions-and-camera`, `animation-director-qa`, `scene-session-assembler`) into `.opencode/skills/<name>/SKILL.md`, apply the 3 recheck fixes from the second message (the continuous jump code in `2d-character-locomotion`, the outer `else { 404 }` in `engine/render2d.mjs`, and always editing `sessions/session_NN.js` before copying to `shots.js`), and confirm all 9 skills exist."*