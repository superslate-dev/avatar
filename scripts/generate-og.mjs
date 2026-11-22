import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {homedir, tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {createAvatar} from '../dist/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const rootDir = join(here, '..')

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

function loadFontFace(family, relativePaths) {
  for (const rel of relativePaths) {
    const full = join(rootDir, rel)
    if (existsSync(full)) {
      const data = readFileSync(full).toString('base64')
      return `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${data}) format("woff2");font-weight:100 900;font-style:normal;}`
    }
  }
  return ''
}

const fontStyles = [
  loadFontFace('Geist', [
    'node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
  ]),
  loadFontFace('Geist Mono', [
    'node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2',
  ]),
].join('\n')

const showcase = [
  {shape: 'prism', palette: 'blush-quartz'},
  {shape: 'ember', palette: 'solar-amber'},
  {shape: 'zenith', palette: 'electric-iris'},
  {shape: 'horizon', palette: 'glacier-mint'},
  {shape: 'veil', palette: 'cobalt-iris'},
  {shape: 'beam', palette: 'ultraviolet'},
  {shape: 'ember', palette: 'scarlet-ember'},
  {shape: 'prism', palette: 'cobalt-frost'},
  {shape: 'horizon', palette: 'citron-dew'},
  {shape: 'zenith', palette: 'cyan-magenta'},
  {shape: 'veil', palette: 'azure-rose'},
  {shape: 'beam', palette: 'abyssal-teal'},
]

const avatarsHtml = showcase
  .map(
    ({shape, palette}) =>
      `<div class="av-cell"><div class="av">${
        createAvatar({
          shape,
          palette,
          appearance: 'dark',
          variantId: 'og',
          drift: 8,
          size: 98,
          background: null,
        }).svg
      }</div></div>`,
  )
  .join('')

const contractMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32">
  <defs>
    <linearGradient id="og-slate" x1="9" y1="5" x2="55" y2="59" gradientUnits="userSpaceOnUse">
      <stop stop-color="#102b57" />
      <stop offset=".42" stop-color="#07152b" />
      <stop offset="1" stop-color="#020508" />
    </linearGradient>
    <linearGradient id="og-edge" x1="11" y1="3" x2="54" y2="61" gradientUnits="userSpaceOnUse">
      <stop stop-color="#9bc3ff" />
      <stop offset=".24" stop-color="#5d96ef" />
      <stop offset=".7" stop-color="#21477f" />
      <stop offset="1" stop-color="#10213d" />
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="#020508" />
  <rect x="2.5" y="2.5" width="59" height="59" rx="12.5" fill="url(#og-slate)" stroke="url(#og-edge)" />
  <rect x="7.5" y="7.5" width="49" height="49" rx="9.5" fill="none" stroke="#9bc3ff" stroke-opacity=".16" />
  <path d="M47 16.5H26C19.5 16.5 15.5 19.5 15.5 24C15.5 28 18.5 30 24 31.8L28.5 33.3" fill="none" stroke="#edf4ff" stroke-width="8.5" stroke-linecap="square" stroke-linejoin="round" />
  <path d="M35.5 30.7L40 32.2C45.5 34 48.5 36.5 48.5 41C48.5 45.5 44.5 48.5 38 48.5H17" fill="none" stroke="#edf4ff" stroke-width="8.5" stroke-linecap="square" stroke-linejoin="round" />
  <rect x="29.75" y="29.75" width="4.5" height="4.5" rx=".75" fill="#6fa8ff" />
</svg>`

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  ${fontStyles}
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body {
    position: relative;
    background: #020508;
    color: #edf4ff;
    font-family: "Geist", -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .glow {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 68% 72% at 76% 48%, rgba(28, 78, 166, 0.34), rgba(7, 21, 43, 0.16) 46%, rgba(2, 5, 8, 0) 76%),
      radial-gradient(ellipse 46% 52% at 16% 14%, rgba(16, 43, 87, 0.24), rgba(2, 5, 8, 0) 68%);
  }
  .dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(155, 195, 255, 0.09) 1px, transparent 1.2px);
    background-size: 22px 22px;
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.22) 60%, rgba(0, 0, 0, 0.5));
  }
  .frame {
    position: absolute;
    inset: 34px 40px;
    border: 1px solid rgba(155, 195, 255, 0.16);
    background: rgba(5, 11, 20, 0.68);
    display: grid;
    grid-template-columns: 1fr 524px;
    align-items: stretch;
  }
  .tick {
    position: absolute;
    width: 13px;
    height: 13px;
    background:
      linear-gradient(rgba(155, 195, 255, 0.55), rgba(155, 195, 255, 0.55)) center / 13px 1px no-repeat,
      linear-gradient(rgba(155, 195, 255, 0.55), rgba(155, 195, 255, 0.55)) center / 1px 13px no-repeat;
  }
  .tick.tl { top: -7px; left: -7px; }
  .tick.tr { top: -7px; right: -7px; }
  .tick.bl { bottom: -7px; left: -7px; }
  .tick.br { bottom: -7px; right: -7px; }
  .left {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 44px 48px 36px;
    border-right: 1px solid rgba(155, 195, 255, 0.14);
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 16px;
    letter-spacing: 0.01em;
    color: #93a4b3;
  }
  .brand strong {
    color: #edf4ff;
    font-weight: 600;
  }
  .brand .slash {
    color: rgba(155, 195, 255, 0.42);
    margin-inline: -4px;
  }
  .hero {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .spec {
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    letter-spacing: 0.06em;
    color: #6fa8ff;
  }
  h1 {
    font-size: 54px;
    line-height: 1.04;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: #edf4ff;
  }
  .desc {
    font-size: 20px;
    line-height: 1.42;
    letter-spacing: -0.015em;
    color: #a9bac9;
    max-width: 470px;
  }
  .tags {
    display: flex;
    gap: 10px;
    margin-top: 6px;
  }
  .tag {
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
    letter-spacing: 0.04em;
    color: #d6e4f5;
    border: 1px solid rgba(155, 195, 255, 0.22);
    background: rgba(13, 27, 52, 0.65);
    padding: 6px 12px;
    border-radius: 6px;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 20px;
    border-top: 1px solid rgba(155, 195, 255, 0.14);
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 14px;
    color: #93a4b3;
  }
  .foot-cmd {
    color: #d6e4f5;
  }
  .foot-cmd span {
    color: #6fa8ff;
    margin-right: 6px;
  }
  .right {
    display: flex;
    flex-direction: column;
    background: rgba(7, 16, 31, 0.56);
  }
  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 22px;
    border-bottom: 1px solid rgba(155, 195, 255, 0.14);
    background: rgba(4, 9, 18, 0.72);
    font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    letter-spacing: 0.07em;
    color: #93a4b3;
  }
  .panel-head .live {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #d6e4f5;
  }
  .panel-head .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #6fa8ff;
  }
  .grid {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 1px;
    background: rgba(155, 195, 255, 0.11);
  }
  .av-cell {
    display: grid;
    place-items: center;
    background: rgba(6, 13, 25, 0.92);
  }
  .av {
    width: 98px;
    height: 98px;
    border-radius: 50%;
    overflow: hidden;
  }
  .av svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
</head>
<body>
  <div class="glow"></div>
  <div class="dots"></div>
  <div class="frame">
    <span class="tick tl"></span>
    <span class="tick tr"></span>
    <span class="tick bl"></span>
    <span class="tick br"></span>
    <div class="left">
      <div class="brand">${contractMarkSvg}<strong>superslate</strong><span class="slash">/</span><span>avatar</span></div>
      <div class="hero">
        <div class="spec">@SUPERSLATE/AVATAR · OPEN SOURCE</div>
        <h1>Soft gradient<br />SVG avatars.</h1>
        <p class="desc">6 optical shapes, 40 palettes, OKLCH tone controls, and light &amp; dark grammars.</p>
        <div class="tags">
          <span class="tag">0 deps</span>
          <span class="tag">React + CLI</span>
          <span class="tag">MIT</span>
        </div>
      </div>
      <div class="foot">
        <span>superslate.dev/avatars</span>
        <span class="foot-cmd"><span>$</span>npm i @superslate/avatar</span>
      </div>
    </div>
    <div class="right">
      <div class="panel-head">
        <span>SPECIMENS · DARK</span>
        <span class="live"><span class="dot"></span>12 / 240</span>
      </div>
      <div class="grid">${avatarsHtml}</div>
    </div>
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
