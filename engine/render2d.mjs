import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

if (!args.length || args[0].startsWith('-')) {
  console.error('Usage: node render2d.mjs <projectDir> [--stills] [--at 0.15,0.5,0.85] [--size WxH] [--fps N] [--shots 0,1] [--resume] [--out file.mp4]');
  process.exit(1);
}

const projectDir = path.resolve(args[0]);
const shotsPath = path.join(projectDir, 'shots.js');
if (!fs.existsSync(shotsPath)) throw new Error(`Missing ${shotsPath}`);

const getFlag = (name, def = null) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};
const hasFlag = (name) => args.includes(name);

const isStills = hasFlag('--stills');
const doResume = hasFlag('--resume');
const atList = getFlag('--at', '0.5').split(',').map((s) => Math.max(0, Math.min(1, parseFloat(s.trim()) || 0.5)));
const sizeFlag = getFlag('--size', null);
const fpsFlag = getFlag('--fps', null);
const shotsFlag = getFlag('--shots', null);
const outDir = path.join(projectDir, 'out');
fs.mkdirSync(outDir, { recursive: true });

// Check ffmpeg
const ffCheck = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
if (ffCheck.status !== 0) throw new Error('ffmpeg not found on PATH');

// Serve engine files + shots.js securely over localhost
const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/kit2d.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    fs.createReadStream(path.join(__dirname, 'kit2d.js')).pipe(res);
  } else if (url === '/shots.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    fs.createReadStream(shotsPath).pipe(res);
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
      const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(f).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  } else if (url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    fs.createReadStream(path.join(__dirname, 'page.html')).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.STUDIO_READY === true);

  const info = await page.evaluate(() => window.K2D.getInfo());
  const fps = fpsFlag ? parseInt(fpsFlag, 10) : info.fps;
  let W = info.w, H = info.h;
  if (sizeFlag) {
    const [sw, sh] = sizeFlag.toLowerCase().split('x').map((n) => parseInt(n, 10));
    if (!sw || !sh || sw % 2 || sh % 2) throw new Error(`Invalid even --size: ${sizeFlag}`);
    W = sw; H = sh;
  }
  await page.setViewportSize({ width: W, height: H });

  const indices = shotsFlag
    ? shotsFlag.split(',').map((s) => parseInt(s.trim(), 10))
    : info.durs.map((_, i) => i);

  if (isStills) {
    const stillsDir = path.join(outDir, 'stills');
    fs.rmSync(stillsDir, { recursive: true, force: true });
    fs.mkdirSync(stillsDir, { recursive: true });

    const files = [];
    for (const si of indices) {
      const nFrames = Math.max(1, Math.round(info.durs[si] * fps));
      for (let ai = 0; ai < atList.length; ai++) {
        const f = Math.min(nFrames - 1, Math.round((nFrames - 1) * atList[ai]));
        const dataUrl = await page.evaluate(([s, fr, w, h]) => window.K2D.drawShotFrame(s, fr, w, h), [si, f, W, H]);
        const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
        const fname = path.join(stillsDir, `s${String(si).padStart(2, '0')}_m${ai}.jpg`);
        fs.writeFileSync(fname, buf);
        files.push(fname);
      }
    }
    if (pageErrors.length) throw new Error(`Page errors during stills: ${pageErrors.join(' | ')}`);

    const cols = atList.length > 1 ? atList.length : Math.min(4, files.length);
    const rows = Math.ceil(files.length / cols);
    const sheetPath = path.join(outDir, 'sheet.jpg');
    const tileRes = spawnSync('ffmpeg', [
      '-y', '-pattern_type', 'glob', '-i', path.join(stillsDir, '*.jpg'),
      '-vf', `scale=480:-1,tile=${cols}x${rows}`, sheetPath
    ], { stdio: 'inherit' });
    if (tileRes.status !== 0) throw new Error('ffmpeg tile failed');
    console.log(`Saved contact sheet: ${sheetPath}`);
  } else {
    const partsDir = path.join(outDir, 'parts');
    fs.mkdirSync(partsDir, { recursive: true });
    const partFiles = [];

    for (const si of indices) {
      const partPath = path.join(partsDir, `shot_${String(si).padStart(3, '0')}_${W}x${H}.mp4`);
      partFiles.push(partPath);
      if (doResume && fs.existsSync(partPath)) {
        console.log(`Skipping completed shot ${si}`);
        continue;
      }
      const nFrames = Math.max(1, Math.round(info.durs[si] * fps));
      const tmpPath = partPath + '.tmp.mp4';
      const ff = spawn('ffmpeg', [
        '-y', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-r', String(fps), '-i', '-',
        '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', tmpPath
      ], { stdio: ['pipe', 'inherit', 'inherit'] });

      const tStart = Date.now();
      for (let f = 0; f < nFrames; f++) {
        const dataUrl = await page.evaluate(([s, fr, w, h]) => window.K2D.drawShotFrame(s, fr, w, h), [si, f, W, H]);
        const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
        if (!ff.stdin.write(buf)) {
          await new Promise((r) => ff.stdin.once('drain', r));
        }
      }
      ff.stdin.end();
      await new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
      fs.renameSync(tmpPath, partPath);
      const sec = ((Date.now() - tStart) / 1000).toFixed(1);
      console.log(`Rendered shot ${si} (${nFrames} frames) in ${sec}s`);
    }

    if (pageErrors.length) throw new Error(`Page errors during render: ${pageErrors.join(' | ')}`);

    const concatTxt = path.join(outDir, 'concat.txt');
    fs.writeFileSync(concatTxt, partFiles.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
    const outFile = path.resolve(getFlag('--out', path.join(outDir, `video_${W}x${H}.mp4`)));
    const catRes = spawnSync('ffmpeg', [
      '-y', '-f', 'concat', '-safe', '0', '-i', concatTxt, '-c', 'copy', '-movflags', '+faststart', outFile
    ], { stdio: 'inherit' });
    if (catRes.status !== 0) throw new Error('ffmpeg concat failed');
    console.log(`Final silent video saved: ${outFile}`);
  }
} finally {
  if (browser) await browser.close();
  server.close();
}