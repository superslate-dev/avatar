import {
  createAvatar,
  getPalette,
  getPaletteMainHue,
  getShape,
  palettes,
  shapes,
} from '../src/index'
import {createAvatarInternal, normalizeInitials} from '../src/core/svg'
import {randomFromString} from '../src/core/random'
import {darkShapeAnchors} from '../src/data/dark-appearance'
import {darkFlarePaletteOverrides} from '../src/data/dark-flare-palettes'
import type {AvatarAppearance, AvatarOptions, PalettePreset, ShapeId, ShapePreset, ToneOptions} from '../src/types'

export interface StudioState {
  shape: ShapeId
  palette: string
  hue: number
  chroma: number
  lightness: number
  drift: number
  variantId: string
  initials: string
}

export interface GradientLabHandle {
  renderIfOpen(): void
  onResize(): void
  overrideFor(shape: ShapeId, palette: string, appearance: AvatarAppearance): Record<string, string> | undefined
}

const darkShapeToneDefaults: Partial<Record<ShapeId, ToneOptions>> = {
  flare: {lightness: -0.04},
  bloom: {lightness: -0.1},
}

const THEME_STORAGE_KEY = 'ss-avatar-theme'
const PACKAGE_NAME = '@superslate/avatar'

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element #${id}`)
  return element as T
}

const root = document.documentElement
const compactLayout = matchMedia('(max-width: 860px)')
let gradientLab: GradientLabHandle | null = null

export function currentAppearance(): AvatarAppearance {
  return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

function avatarDisplaySize(slot: 'preview' | 'grid' | 'shape' | 'mark'): number {
  if (slot === 'preview') return compactLayout.matches ? 64 : 76
  if (slot === 'grid') return compactLayout.matches ? 56 : 60
  if (slot === 'shape') return 34
  return 19
}

function renderAvatar(options: AvatarOptions) {
  const shape = options.shape ?? 'bloom'
  const palette = typeof options.palette === 'string' ? options.palette : 'rose-milk'
  const appearance = options.appearance ?? currentAppearance()
  const override = gradientLab?.overrideFor(shape, palette, appearance)
  return override ? createAvatarInternal(options, override) : createAvatar(options)
}

let avatarRenderSerial = 0
function imgFor(opts: AvatarOptions): string {
  const isolated = opts.variantId == null ? {...opts, variantId: `ui-${avatarRenderSerial++}`} : opts
  return renderAvatar({...isolated, appearance: currentAppearance(), background: null}).svg
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
if (savedTheme === 'light' || savedTheme === 'dark') {
  root.setAttribute('data-theme', savedTheme)
} else if (matchMedia('(prefers-color-scheme: dark)').matches) {
  root.setAttribute('data-theme', 'dark')
}

const themeToggle = byId<HTMLButtonElement>('theme-toggle')
function syncThemeToggle(): void {
  const isDark = root.getAttribute('data-theme') === 'dark'
  themeToggle.setAttribute('aria-pressed', String(isDark))
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme')
}
syncThemeToggle()

function defaultTone(
  shape: ShapeId,
  palette: string,
  appearance: AvatarAppearance = currentAppearance(),
): {hue: number; chroma: number; lightness: number} {
  const main = getPaletteMainHue(getPalette(palette).colors)
  const reference = darkShapeAnchors[shape].lightReference
  const authoredFlare = appearance === 'dark' && shape === 'flare' && Boolean(darkFlarePaletteOverrides[palette])
  const bias =
    appearance === 'dark' && palette !== reference && !authoredFlare
      ? darkShapeToneDefaults[shape]
      : undefined
  return {
    hue: main,
    chroma: bias?.chroma ?? 1,
    lightness: bias?.lightness ?? 0,
  }
}

const initialTone = defaultTone('bloom', 'rose-milk')
export const state: StudioState = {
  shape: 'bloom',
  palette: 'rose-milk',
  ...initialTone,
  drift: 8,
  variantId: 'a1f3',
  initials: '',
}

const hueInput = byId<HTMLInputElement>('hue')
const hueValue = byId('hue-v')
const chromaInput = byId<HTMLInputElement>('chroma')
const chromaValue = byId('chroma-v')
const lightInput = byId<HTMLInputElement>('light')
const lightValue = byId('light-v')
const driftInput = byId<HTMLInputElement>('drift')
const driftValue = byId('drift-v')
const variantInput = byId<HTMLInputElement>('variant')
const initialsInput = byId<HTMLInputElement>('initials')

function syncTone(): void {
  hueInput.value = String(Math.round(state.hue))
  hueValue.textContent = `${Math.round(state.hue)}°`
  chromaInput.value = String(state.chroma)
  chromaValue.textContent = state.chroma.toFixed(2)
  lightInput.value = String(state.lightness)
  lightValue.textContent = state.lightness.toFixed(2)
}

function resetToneForSelection(): void {
  Object.assign(state, defaultTone(state.shape, state.palette))
  syncTone()
}

function curTone(): ToneOptions {
  const main = getPaletteMainHue(getPalette(state.palette).colors)
  const tone: ToneOptions = {}
  if (Math.round(state.hue) !== main) tone.hue = state.hue
  if (state.chroma !== 1) tone.chroma = state.chroma
  if (state.lightness !== 0) tone.lightness = state.lightness
  return tone
}

export function activeTone(): ToneOptions | undefined {
  const tone = curTone()
  return Object.keys(tone).length ? tone : undefined
}

function activePreviewOptions(
  shape: ShapeId,
  size: number,
  includeInitials = false,
): AvatarOptions {
  return {
    shape,
    palette: state.palette,
    tone: activeTone(),
    variantId: state.variantId,
    drift: state.drift,
    size,
    ...(includeInitials && state.initials ? {initials: state.initials} : {}),
  }
}

const chipDefs: Array<{id: 'all' | ShapeId; name: string}> = [
  {id: 'all', name: 'All'},
  ...shapes.map(s => ({id: s.id, name: s.name})),
]
let filter: 'all' | ShapeId = 'all'
const chipsEl = byId('chips')
const gridScroll = byId('grid-scroll')
const shuffleGridBtn = byId<HTMLButtonElement>('shuffle-grid')
const countEl = byId('count')
const mainEl = document.querySelector<HTMLElement>('.main')!
let gridAvatarObserver: IntersectionObserver | null = null

function newGridSeed(): string {
  const values = new Uint32Array(2)
  crypto.getRandomValues(values)
  return `${values[0]}-${values[1]}`
}

function shuffled<T>(list: readonly T[], seed: string): T[] {
  return list
    .map((item, index) => ({item, index, rank: randomFromString(`${seed}:${index}`)}))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(entry => entry.item)
}

function buildAllCombos(seed: string): Array<{shape: ShapePreset; pal: PalettePreset}> {
  const paletteQueues = new Map(
    shapes.map(shape => [shape.id, shuffled(palettes, `${seed}:palette:${shape.id}`)]),
  )
  const combos: Array<{shape: ShapePreset; pal: PalettePreset}> = []
  for (let round = 0; round < palettes.length; round += 1) {
    shuffled(shapes, `${seed}:shape:${round}`).forEach(shape => {
      const pal = paletteQueues.get(shape.id)?.[round]
      if (pal) combos.push({shape, pal})
    })
  }
  return combos
}

let allOrderSeed = newGridSeed()
let allCombos = buildAllCombos(allOrderSeed)

function syncFilterControls(): void {
  Array.from(chipsEl.children).forEach(child => {
    const button = child as HTMLButtonElement
    const active = button.dataset.f === filter
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  })
  shuffleGridBtn.hidden = filter !== 'all'
}

chipDefs.forEach(c => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `chip${c.id === 'all' ? ' active' : ''}`
  button.textContent = c.name
  button.dataset.f = c.id
  button.setAttribute('aria-pressed', String(c.id === 'all'))
  button.addEventListener('click', () => {
    if (filter === c.id) return
    filter = c.id
    renderGrid()
    mainEl.scrollTop = 0
  })
  chipsEl.appendChild(button)
})

function scrollToSelectedAvatar(): void {
  const selected = gridScroll.querySelector('.cell.sel')
  if (!selected) return
  selected.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center',
    inline: 'nearest',
  })
}

shuffleGridBtn.addEventListener('click', () => {
  allOrderSeed = newGridSeed()
  allCombos = buildAllCombos(allOrderSeed)
  renderGrid()
  requestAnimationFrame(scrollToSelectedAvatar)
})

function createGridCell(shape: ShapePreset, pal: PalettePreset, mixed: boolean): HTMLButtonElement {
  const cell = document.createElement('button')
  cell.type = 'button'
  cell.className = 'cell'
  cell.dataset.shape = shape.id
  cell.dataset.pal = pal.id
  cell.setAttribute('aria-label', `${shape.name}, ${pal.name}`)
  const caption = mixed
    ? `<span class="cap mixed"><span class="shape-name">${shape.name}</span><span class="palette-name">${pal.name}</span></span>`
    : `<span class="cap">${pal.name}</span>`
  cell.innerHTML = `<span class="av" aria-hidden="true"></span>${caption}`
  cell.addEventListener('click', () => selectCombo(shape.id, pal.id))
  return cell
}

function hydrateGridCell(cell: Element): void {
  const el = cell as HTMLElement
  if (el.dataset.hydrated) return
  const shape = el.dataset.shape as ShapeId
  const palette = el.dataset.pal!
  const av = el.querySelector('.av')
  if (av) {
    av.innerHTML = imgFor({
      shape,
      palette,
      size: avatarDisplaySize('grid'),
      variantId: `grid:${shape}:${palette}`,
    })
  }
  el.dataset.hydrated = 'true'
}

function observeGridAvatars(): void {
  gridAvatarObserver?.disconnect()
  const cells = Array.from(gridScroll.querySelectorAll('.cell'))
  if (!('IntersectionObserver' in window)) {
    cells.forEach(hydrateGridCell)
    return
  }
  gridAvatarObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        hydrateGridCell(entry.target)
        gridAvatarObserver?.unobserve(entry.target)
      })
    },
    {root: mainEl, rootMargin: '480px 0px'},
  )
  cells.forEach(cell => gridAvatarObserver?.observe(cell))
}

export function renderGrid(): void {
  gridAvatarObserver?.disconnect()
  gridScroll.innerHTML = ''
  let count = 0
  if (filter === 'all') {
    const group = document.createElement('div')
    group.className = 'group group-all'
    const grid = document.createElement('div')
    grid.className = 'grid'
    allCombos.forEach(({shape, pal}) => {
      count += 1
      grid.appendChild(createGridCell(shape, pal, true))
    })
    group.appendChild(grid)
    gridScroll.appendChild(group)
  } else {
    const shape = getShape(filter)
    const group = document.createElement('div')
    group.className = 'group'
    group.innerHTML = `<div class="group-head"><h3>${shape.name}</h3><p>${shape.description}</p></div>`
    const grid = document.createElement('div')
    grid.className = 'grid'
    palettes.forEach(pal => {
      count += 1
      grid.appendChild(createGridCell(shape, pal, false))
    })
    group.appendChild(grid)
    gridScroll.appendChild(group)
  }
  countEl.textContent = `${count} avatar${count > 1 ? 's' : ''}`
  syncFilterControls()
  markGrid()
  observeGridAvatars()
}

function markGrid(): void {
  Array.from(gridScroll.querySelectorAll<HTMLElement>('.cell')).forEach(cell => {
    const selected = cell.dataset.shape === state.shape && cell.dataset.pal === state.palette
    cell.classList.toggle('sel', selected)
    cell.setAttribute('aria-pressed', String(selected))
  })
}

const shapesEl = byId('shapes')
shapes.forEach(s => {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'shape-btn'
  button.dataset.shape = s.id
  button.setAttribute('aria-pressed', 'false')
  button.innerHTML = `<span class="av"></span><span>${s.name}</span>`
  button.addEventListener('click', () => {
    state.shape = s.id
    resetToneForSelection()
    markShapes()
    markGrid()
    render()
    gradientLab?.renderIfOpen()
  })
  shapesEl.appendChild(button)
})

export function refreshShapeButtons(): void {
  Array.from(shapesEl.children).forEach(child => {
    const button = child as HTMLElement
    const shape = button.dataset.shape as ShapeId
    const av = button.querySelector('.av')
    if (av) av.innerHTML = imgFor(activePreviewOptions(shape, avatarDisplaySize('shape')))
  })
}

function markShapes(): void {
  Array.from(shapesEl.children).forEach(child => {
    const button = child as HTMLElement
    const active = button.dataset.shape === state.shape
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
  })
}

function selectCombo(shape: ShapeId, pal: string): void {
  state.shape = shape
  state.palette = pal
  resetToneForSelection()
  markShapes()
  refreshShapeButtons()
  markGrid()
  render()
  gradientLab?.renderIfOpen()
}

byId('randomize').addEventListener('click', () => {
  const s = shapes[Math.floor(Math.random() * shapes.length)]!.id
  const p = palettes[Math.floor(Math.random() * palettes.length)]!.id
  state.variantId = Math.random().toString(36).slice(2, 6)
  variantInput.value = state.variantId
  selectCombo(s, p)
})

byId('randomize-palette').addEventListener('click', () => {
  const choices = palettes.filter(palette => palette.id !== state.palette)
  const p = choices[Math.floor(Math.random() * choices.length)]!.id
  selectCombo(state.shape, p)
})

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  root.setAttribute('data-theme', next)
  localStorage.setItem(THEME_STORAGE_KEY, next)
  syncThemeToggle()
  resetToneForSelection()
  renderGrid()
  refreshShapeButtons()
  render()
  gradientLab?.renderIfOpen()
})

hueInput.addEventListener('input', event => {
  state.hue = Number((event.target as HTMLInputElement).value)
  hueValue.textContent = `${Math.round(state.hue)}°`
  render()
  gradientLab?.renderIfOpen()
})

chromaInput.addEventListener('input', event => {
  state.chroma = Number((event.target as HTMLInputElement).value)
  chromaValue.textContent = state.chroma.toFixed(2)
  render()
  gradientLab?.renderIfOpen()
})

lightInput.addEventListener('input', event => {
  state.lightness = Number((event.target as HTMLInputElement).value)
  lightValue.textContent = state.lightness.toFixed(2)
  render()
  gradientLab?.renderIfOpen()
})

byId('reset-tone').addEventListener('click', () => {
  resetToneForSelection()
  render()
  gradientLab?.renderIfOpen()
})

driftInput.addEventListener('input', event => {
  state.drift = Number((event.target as HTMLInputElement).value)
  driftValue.textContent = String(state.drift)
  render()
  gradientLab?.renderIfOpen()
})

variantInput.addEventListener('input', event => {
  state.variantId = (event.target as HTMLInputElement).value || 'default'
  render()
  gradientLab?.renderIfOpen()
})

byId('reroll').addEventListener('click', () => {
  state.variantId = Math.random().toString(36).slice(2, 6)
  variantInput.value = state.variantId
  render()
  gradientLab?.renderIfOpen()
})

initialsInput.addEventListener('input', event => {
  state.initials = (event.target as HTMLInputElement).value
  render()
})

const outputPanel = byId<HTMLDetailsElement>('output-panel')
function syncOutputPanel(matches: boolean): void {
  outputPanel.open = !matches
}
syncOutputPanel(compactLayout.matches)
compactLayout.addEventListener('change', event => syncOutputPanel(event.matches))

let activeTab: 'react' | 'core' | 'svg' = 'react'
;(function wireSeg() {
  const seg = byId('tab-seg')
  const ind = byId('tab-ind')
  function move(btn: HTMLElement | null): void {
    if (!btn || !outputPanel.open) return
    const r = btn.getBoundingClientRect()
    const pr = seg.getBoundingClientRect()
    ind.style.width = `${r.width}px`
    ind.style.transform = `translateX(${r.left - pr.left - 3}px)`
  }
  function syncTabs(active: HTMLElement): void {
    seg.querySelectorAll<HTMLButtonElement>('.seg-btn').forEach(button => {
      const selected = button === active
      button.classList.toggle('active', selected)
      button.setAttribute('aria-pressed', String(selected))
    })
  }
  requestAnimationFrame(() => move(seg.querySelector<HTMLElement>('.seg-btn.active')))
  seg.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.seg-btn')
    if (!button) return
    syncTabs(button)
    move(button)
    activeTab = (button.dataset.tab as 'react' | 'core' | 'svg') ?? 'react'
    render()
  })
  outputPanel.addEventListener('toggle', () => {
    if (outputPanel.open) {
      requestAnimationFrame(() => move(seg.querySelector<HTMLElement>('.seg-btn.active')))
    }
  })
  window.addEventListener('resize', () => move(seg.querySelector<HTMLElement>('.seg-btn.active')))
})()

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function codeFor(tab: 'react' | 'core' | 'svg'): {plain: string; html: string} {
  const tone = curTone()
  const hasTone = Object.keys(tone).length > 0
  const shape = state.shape
  const pal = state.palette
  const appearance = currentAppearance()
  const initials = normalizeInitials(state.initials)
  const initialsJson = JSON.stringify(initials)

  if (tab === 'svg') {
    const svg = renderAvatar({
      shape,
      palette: pal,
      tone: activeTone(),
      appearance,
      variantId: state.variantId,
      drift: state.drift,
      size: 64,
      background: null,
      initials: initials || undefined,
    }).svg
    return {
      plain: svg,
      html: esc(svg).replace(/&lt;(\/?[a-zA-Z]+)/g, '<span class="tok-punc">&lt;$1</span>'),
    }
  }

  const appearanceStr = appearance === 'dark' ? ' appearance="dark"' : ''
  const appearanceStrH =
    appearance === 'dark'
      ? ' <span class="tok-punc">appearance</span>=<span class="tok-str">"dark"</span>'
      : ''
  const toneStr = hasTone
    ? ` tone={{ ${Object.entries(tone)
        .map(([k, v]) => `${k}: ${k === 'hue' ? Math.round(v) : v}`)
        .join(', ')} }}`
    : ''
  const toneStrH = hasTone
    ? ` <span class="tok-punc">tone</span>={{ ${Object.entries(tone)
        .map(([k, v]) => `${k}: <span class="tok-str">${k === 'hue' ? Math.round(v) : v}</span>`)
        .join(', ')} }}`
    : ''
  const drift = state.drift > 0 ? ` variantId="${state.variantId}" drift={${state.drift}}` : ''
  const driftH =
    state.drift > 0
      ? ` <span class="tok-punc">variantId</span>=<span class="tok-str">"${esc(state.variantId)}"</span> <span class="tok-punc">drift</span>={<span class="tok-str">${state.drift}</span>}`
      : ''
  const initialsReact = initials ? ` initials=${initialsJson}` : ''
  const initialsReactH = initials
    ? ` <span class="tok-punc">initials</span>=<span class="tok-str">${esc(initialsJson)}</span>`
    : ''

  if (tab === 'react') {
    return {
      plain: `import { Avatar } from "${PACKAGE_NAME}/react";\n\n<Avatar shape="${shape}" palette="${pal}"${toneStr}${appearanceStr}${drift}${initialsReact} size={64} />`,
      html: `<span class="tok-kw">import</span> { Avatar } <span class="tok-kw">from</span> <span class="tok-str">"${PACKAGE_NAME}/react"</span>;\n\n<span class="tok-punc">&lt;</span>Avatar <span class="tok-punc">shape</span>=<span class="tok-str">"${shape}"</span> <span class="tok-punc">palette</span>=<span class="tok-str">"${pal}"</span>${toneStrH}${appearanceStrH}${driftH}${initialsReactH} <span class="tok-punc">size</span>={<span class="tok-str">64</span>} <span class="tok-punc">/&gt;</span>`,
    }
  }

  const toneCore = hasTone
    ? `\n  tone: { ${Object.entries(tone)
        .map(([k, v]) => `${k}: ${k === 'hue' ? Math.round(v) : v}`)
        .join(', ')} },`
    : ''
  const toneCoreH = hasTone
    ? `\n  <span class="tok-punc">tone</span>: { ${Object.entries(tone)
        .map(([k, v]) => `${k}: <span class="tok-str">${k === 'hue' ? Math.round(v) : v}</span>`)
        .join(', ')} },`
    : ''
  const driftCore =
    state.drift > 0 ? `\n  variantId: "${state.variantId}",\n  drift: ${state.drift},` : ''
  const driftCoreH =
    state.drift > 0
      ? `\n  <span class="tok-punc">variantId</span>: <span class="tok-str">"${esc(state.variantId)}"</span>,\n  <span class="tok-punc">drift</span>: <span class="tok-str">${state.drift}</span>,`
      : ''
  const appearanceCore = appearance === 'dark' ? '\n  appearance: "dark",' : ''
  const appearanceCoreH =
    appearance === 'dark'
      ? '\n  <span class="tok-punc">appearance</span>: <span class="tok-str">"dark"</span>,'
      : ''
  const initialsCore = initials ? `\n  initials: ${initialsJson},` : ''
  const initialsCoreH = initials
    ? `\n  <span class="tok-punc">initials</span>: <span class="tok-str">${esc(initialsJson)}</span>,`
    : ''

  return {
    plain: `import { createAvatar } from "${PACKAGE_NAME}";\n\nconst { svg } = createAvatar({\n  shape: "${shape}",\n  palette: "${pal}",${toneCore}${appearanceCore}${driftCore}${initialsCore}\n  size: 64,\n});`,
    html: `<span class="tok-kw">import</span> { createAvatar } <span class="tok-kw">from</span> <span class="tok-str">"${PACKAGE_NAME}"</span>;\n\n<span class="tok-kw">const</span> { svg } <span class="tok-punc">=</span> <span class="tok-kw">createAvatar</span>({\n  <span class="tok-punc">shape</span>: <span class="tok-str">"${shape}"</span>,\n  <span class="tok-punc">palette</span>: <span class="tok-str">"${pal}"</span>,${toneCoreH}${appearanceCoreH}${driftCoreH}${initialsCoreH}\n  <span class="tok-punc">size</span>: <span class="tok-str">64</span>,\n});`,
  }
}

const previewAvEl = byId('preview-av')
const previewShapeEl = byId('preview-shape')
const previewPalEl = byId('preview-pal')
const previewIdEl = byId('preview-id')
const markDotEl = byId('mark-dot')
const stripEl = byId('strip')
const codeOutEl = byId('code-out')

export function render(): void {
  const opts = activePreviewOptions(state.shape, avatarDisplaySize('preview'), true)
  const previewAvatar = renderAvatar({...opts, appearance: currentAppearance(), background: null})
  previewAvEl.innerHTML = previewAvatar.svg
  previewShapeEl.textContent = getShape(state.shape).name
  previewPalEl.textContent = getPalette(state.palette).name
  previewIdEl.textContent = `variant ${state.variantId}`
  markDotEl.innerHTML = imgFor(activePreviewOptions(state.shape, avatarDisplaySize('mark')))
  const colors = previewAvatar.usedColors
  stripEl.style.gridTemplateColumns = `repeat(${colors.length}, 1fr)`
  stripEl.innerHTML = colors.map(color => `<i style="background:${color}"></i>`).join('')
  const out = codeFor(activeTab)
  codeOutEl.innerHTML = out.html
  codeOutEl.dataset.plain = out.plain
}

const CHECK =
  '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8.5 6.5 12 13 4.5"/></svg>'

function flash(button: HTMLButtonElement, html: string): void {
  const original = button.innerHTML
  button.classList.add('copied')
  button.innerHTML = html
  window.setTimeout(() => {
    button.classList.remove('copied')
    button.innerHTML = original
  }, 1300)
}

const codeCopyBtn = byId<HTMLButtonElement>('code-copy')
codeCopyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(codeOutEl.dataset.plain ?? '')
  flash(codeCopyBtn, `${CHECK}Copied`)
})

const cmdBtn = byId<HTMLButtonElement>('cmd')
cmdBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(`npm i ${PACKAGE_NAME}`)
  cmdBtn.classList.add('copied')
  window.setTimeout(() => cmdBtn.classList.remove('copied'), 1300)
})

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function rasterizeSvg(svg: string, size: number, format: 'png' | 'jpg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const source = new Blob([svg], {type: 'image/svg+xml'})
    const url = URL.createObjectURL(source)
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas is unavailable')
        if (format === 'jpg') {
          context.fillStyle = currentAppearance() === 'dark' ? '#0b0b0d' : '#ffffff'
          context.fillRect(0, 0, size, size)
        }
        context.drawImage(image, 0, 0, size, size)
        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(url)
            if (blob) resolve(blob)
            else reject(new Error('Raster export failed'))
          },
          format === 'jpg' ? 'image/jpeg' : 'image/png',
          format === 'jpg' ? 0.92 : undefined,
        )
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG could not be rasterized'))
    }
    image.src = url
  })
}

const exportFormatSelect = byId<HTMLSelectElement>('export-format')
const exportSizeSelect = byId<HTMLSelectElement>('export-size')
const downloadBtn = byId<HTMLButtonElement>('download')

downloadBtn.addEventListener('click', async () => {
  const format = exportFormatSelect.value as 'svg' | 'png' | 'jpg'
  const size = Number(exportSizeSelect.value)
  const appearance = currentAppearance()
  const background = format === 'jpg' ? (appearance === 'dark' ? '#0b0b0d' : '#ffffff') : null
  const svg = renderAvatar({
    ...activePreviewOptions(state.shape, size, true),
    appearance,
    background,
  }).svg
  const filename = `${state.shape}-${state.palette}.${format}`
  downloadBtn.disabled = true
  try {
    if (format === 'svg') {
      downloadBlob(new Blob([svg], {type: 'image/svg+xml'}), filename)
    } else {
      downloadBlob(await rasterizeSvg(svg, size, format), filename)
    }
    flash(downloadBtn, `${CHECK}Saved`)
  } catch (error) {
    console.error(error)
    flash(downloadBtn, 'Export failed')
  } finally {
    downloadBtn.disabled = false
  }
})

syncTone()
markShapes()
refreshShapeButtons()
renderGrid()
render()

compactLayout.addEventListener('change', () => {
  gradientLab?.onResize()
  refreshShapeButtons()
  renderGrid()
  render()
})

if (['localhost', '127.0.0.1', '::1'].includes(location.hostname)) {
  void import('./gradient-lab').then(({initGradientLab}) => {
    gradientLab = initGradientLab({
      state,
      compactLayout,
      currentAppearance,
      activeTone,
      render,
      refreshShapeButtons,
      renderGrid,
    })
  })
}
