import {existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {homedir, tmpdir} from 'node:os'
import {join} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createAvatar} from '../dist/index.js'

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ]
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate
  }
  const cacheDir = join(homedir(), 'Library/Caches/ms-playwright')
  if (existsSync(cacheDir)) {
    const dirs = readdirSync(cacheDir)
      .filter(name => name.startsWith('chromium-'))
      .sort()
      .reverse()
    for (const dir of dirs) {
      const bin = join(
        cacheDir,
        dir,
        'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      )
      if (existsSync(bin)) return bin
    }
  }
  throw new Error('No Chromium binary found. Set CHROME_BIN to generate og.png.')
}

const showcase = [
  {shape: 'bloom', palette: 'rose-milk'},
  {shape: 'flare', palette: 'peach-cream'},
  {shape: 'nova', palette: 'aurora-pink'},
  {shape: 'jade', palette: 'mint-milk'},
  {shape: 'silk', palette: 'lilac-silk'},
  {shape: 'void', palette: 'magenta-void'},
  {shape: 'flare', palette: 'sunset-punch'},
  {shape: 'bloom', palette: 'blue-cream'},
  {shape: 'jade', palette: 'lemon-mint'},
  {shape: 'nova', palette: 'aqua-orchid'},
  {shape: 'silk', palette: 'candy-blue'},
  {shape: 'void', palette: 'teal-void'},
]

const avatarsHtml = showcase
  .map(
    ({shape, palette}) =>
      `<div class="av">${
        createAvatar({
          shape,
          palette,
          appearance: 'dark',
          variantId: 'og',
          drift: 8,
          size: 112,
          background: null,
        }).svg
      }</div>`,
  )
  .join('')

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body {
    background: #0b0b0b;
    color: #f1f1f1;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    position: relative;
  }
  .frame {
    position: absolute;
    inset: 34px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 20px;
    background: #101010;
    display: grid;
    grid-template-columns: 1fr 520px;
    align-items: center;
    padding: 52px 56px;
    gap: 44px;
  }
  .left {
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: space-between;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 15px;
    color: #a8a8a8;
    letter-spacing: 0.01em;
  }
  .badge .slash { color: #666; }
  .badge strong { color: #f1f1f1; font-weight: 500; }
  .hero { display: flex; flex-direction: column; gap: 18px; }
  h1 {
    margin: 0;
    font-size: 52px;
    line-height: 1.06;
    font-weight: 600;
    letter-spacing: -0.035em;
  }
  p {
    margin: 0;
    font-size: 21px;
    line-height: 1.45;
    color: #a8a8a8;
    max-width: 460px;
  }
  .pills {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }
  .pill {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    color: #d4d4d4;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: #161616;
    padding: 6px 12px;
    border-radius: 999px;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 15px;
    color: #8f8f8f;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 112px);
    gap: 20px;
    justify-content: center;
  }
  .av {
    width: 112px;
    height: 112px;
    border-radius: 50%;
    overflow: hidden;
  }
  .av svg { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
  <div class="frame">
    <div class="left">
      <div class="badge"><strong>superslate</strong><span class="slash">/</span><span>avatar</span></div>
      <div class="hero">
        <h1>Soft gradient SVG avatars.</h1>
        <p>6 shape families, 40 palettes, OKLCH tone controls, and light &amp; dark appearances.</p>
        <div class="pills">
          <span class="pill">0 deps</span>
          <span class="pill">React + CLI</span>
          <span class="pill">MIT</span>
        </div>
      </div>
      <div class="foot">
        <span>avatars.superslate.dev</span>
        <span>npm i @superslate/avatar</span>
      </div>
    </div>
    <div class="grid">${avatarsHtml}</div>
  </div>
</body>
</html>`

const chrome = findChrome()
const tempDir = mkdtempSync(join(tmpdir(), 'superslate-avatar-og-'))
const htmlFile = join(tempDir, 'og.html')
const outFile = new URL('../studio/public/og.png', import.meta.url).pathname

try {
  writeFileSync(htmlFile, html)
  const result = spawnSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-crash-reporter',
      '--disable-breakpad',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      `--screenshot=${outFile}`,
      pathToFileURL(htmlFile).href,
    ],
    {encoding: 'utf8', timeout: 15000},
  )
  if (!existsSync(outFile) || statSync(outFile).size === 0) {
    throw new Error(result.stderr || 'Chrome failed to render og.png')
  }
  console.log(`wrote ${outFile}`)
} finally {
  rmSync(tempDir, {recursive: true, force: true})
}
