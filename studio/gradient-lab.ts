import {
  getPalette,
  getShape,
  hexToOklch,
  maxSrgbChroma,
  oklchToHexInGamut,
  relativeSrgbChroma,
} from '../src/index'
import {clamp, normalizeHue} from '../src/color/oklch'
import {createAvatarInternal} from '../src/core/svg'
import type {AvatarAppearance, ShapeId, ToneOptions} from '../src/types'
import type {GradientLabHandle, StudioState} from './main'

interface GradientLabHost {
  state: StudioState
  compactLayout: MediaQueryList
  currentAppearance(): AvatarAppearance
  activeTone(): ToneOptions | undefined
  render(): void
  refreshShapeButtons(): void
  renderGrid(): void
}

interface EditorParams {
  hueShift: number
  lightnessShift: number
  chromaScale: number
  hueDelta: number
  lightnessDelta: number
  chromaDelta: number
}

interface SavedOverrideRecord {
  shape: ShapeId
  palette: string
  sourceAppearance: AvatarAppearance
  targetAppearance: AvatarAppearance
  params: EditorParams | null
  slotOverrides: Record<string, string>
  colors: Record<string, string>
}

interface EditorData {
  key: string
  sourceAppearance: AvatarAppearance
  targetAppearance: AvatarAppearance
  source: Record<string, string>
  current: Record<string, string>
  result: Record<string, string>
  sourceSvg: string
  currentSvg: string
  resultSvg: string
}

const GRADIENT_OVERRIDES_KEY = 'ss-avatar-gradient-overrides-v1'
const GRADIENT_EDITOR_POSITION_KEY = 'ss-avatar-gradient-editor-position-v1'
const GRADIENT_LAB_OPEN_KEY = 'ss-avatar-dark-lab-open'

const gradientEditorDefaults: EditorParams = {
  hueShift: 0,
  lightnessShift: 0,
  chromaScale: 1,
  hueDelta: 1,
  lightnessDelta: 1,
  chromaDelta: 1,
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing element #${id}`)
  return element as T
}

function gradientOverrideKey(shape: ShapeId, palette: string, appearance: AvatarAppearance): string {
  return `${shape}:${palette}:${appearance}`
}

function normalizedRecord(
  key: string,
  value: SavedOverrideRecord | Record<string, string>,
): SavedOverrideRecord {
  if ('colors' in value && typeof value.colors === 'object') {
    return value as SavedOverrideRecord
  }
  const [shape, palette, targetAppearance] = key.split(':') as [ShapeId, string, AvatarAppearance]
  const sourceAppearance: AvatarAppearance = targetAppearance === 'dark' ? 'light' : 'dark'
  return {
    shape,
    palette,
    sourceAppearance,
    targetAppearance,
    params: null,
    slotOverrides: {},
    colors: value as Record<string, string>,
  }
}

function editorColorInfo(color: string): string {
  const value = hexToOklch(color)
  const relative = relativeSrgbChroma(value)
  return `${color} · L ${value.l.toFixed(3)} · Cr ${relative.toFixed(3)} · H ${value.h.toFixed(1)}°`
}

function editorCenter(colors: string[]): {l: number; cr: number; h: number} {
  const values = colors.map(hexToOklch)
  const count = Math.max(1, values.length)
  const l = values.reduce((sum, value) => sum + value.l, 0) / count
  const cr = values.reduce((sum, value) => sum + relativeSrgbChroma(value), 0) / count
  let x = 0
  let y = 0
  let weight = 0
  for (const value of values) {
    const w = Math.max(value.c, 0.005)
    x += Math.cos((value.h * Math.PI) / 180) * w
    y += Math.sin((value.h * Math.PI) / 180) * w
    weight += w
  }
  return {l, cr, h: weight ? normalizeHue((Math.atan2(y, x) * 180) / Math.PI) : 0}
}

export function initGradientLab(host: GradientLabHost): GradientLabHandle {
  const toggleBtn = byId<HTMLButtonElement>('dark-lab-toggle')
  const labEl = byId<HTMLElement>('dark-lab')
  const shapeEl = byId('dark-lab-shape')
  const bodyEl = byId('dark-lab-body')
  const exportBtn = byId<HTMLButtonElement>('dark-lab-export')

  toggleBtn.hidden = false

  let overrides: Record<string, SavedOverrideRecord | Record<string, string>> = {}
  try {
    overrides = JSON.parse(localStorage.getItem(GRADIENT_OVERRIDES_KEY) || '{}') || {}
  } catch {
    overrides = {}
  }

  let previewOverride: {key: string; colors: Record<string, string>} | null = null
  let params: EditorParams = {...gradientEditorDefaults}
  let selection = ''
  let latestData: EditorData | null = null
  let slotOverrides: Record<string, string> = {}

  function savedColorsFor(key: string): Record<string, string> | undefined {
    const entry = overrides[key]
    if (!entry) return undefined
    return 'colors' in entry && typeof entry.colors === 'object'
      ? (entry as SavedOverrideRecord).colors
      : (entry as Record<string, string>)
  }

  function overrideFor(
    shape: ShapeId,
    palette: string,
    appearance: AvatarAppearance,
  ): Record<string, string> | undefined {
    const key = gradientOverrideKey(shape, palette, appearance)
    if (previewOverride?.key === key) return previewOverride.colors
    return savedColorsFor(key)
  }

  function editorRange(key: keyof EditorParams, label: string, min: number, max: number, step: number): string {
    const value = params[key]
    return `<div class="dark-lab-range"><label><span>${label}<output>${Number(value).toFixed(2)}</output></span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-editor-range="${key}"></label><input class="dark-lab-number" type="number" min="${min}" max="${max}" step="${step}" value="${Number(value).toFixed(2)}" data-editor-number="${key}"></div>`
  }

  function transformColors(
    sourceSlots: Record<string, string>,
    targetSlots: Record<string, string>,
  ): Record<string, string> {
    const keys = [...new Set([...Object.keys(targetSlots), ...Object.keys(sourceSlots)])]
    const source: Record<string, string> = {}
    for (const key of keys) {
      const frameKey = key.startsWith('inner.') ? key.replace('inner.', 'frame.') : key
      source[key] = sourceSlots[key] ?? sourceSlots[frameKey] ?? targetSlots[key]!
    }
    const center = editorCenter(Object.values(source))
    const result: Record<string, string> = {}
    for (const key of keys) {
      const value = hexToOklch(source[key]!)
      const relative = relativeSrgbChroma(value)
      const hueDistance = ((value.h - center.h + 540) % 360) - 180
      const l = clamp(
        center.l + (value.l - center.l) * params.lightnessDelta + params.lightnessShift,
        0,
        1,
      )
      const h = normalizeHue(center.h + hueDistance * params.hueDelta + params.hueShift)
      const cr = clamp(
        (center.cr + (relative - center.cr) * params.chromaDelta) * params.chromaScale,
        0,
        1,
      )
      result[key] = oklchToHexInGamut({l, c: value.c < 0.006 ? 0 : cr * maxSrgbChroma(l, h), h})
    }
    return result
  }

  function computeData(): EditorData {
    const targetAppearance = host.currentAppearance()
    const sourceAppearance: AvatarAppearance = targetAppearance === 'dark' ? 'light' : 'dark'
    const baseOpts = {
      shape: host.state.shape,
      palette: host.state.palette,
      tone: host.activeTone(),
      variantId: host.state.variantId,
      drift: host.state.drift,
      size: 56,
      background: null,
    }
    const sourceKey = gradientOverrideKey(host.state.shape, host.state.palette, sourceAppearance)
    const targetKey = gradientOverrideKey(host.state.shape, host.state.palette, targetAppearance)
    const sourceAvatar = createAvatarInternal({...baseOpts, appearance: sourceAppearance}, savedColorsFor(sourceKey))
    const currentAvatar = createAvatarInternal({...baseOpts, appearance: targetAppearance}, savedColorsFor(targetKey))
    const result = {...transformColors(sourceAvatar.colorSlots, currentAvatar.colorSlots), ...slotOverrides}
    previewOverride = {key: targetKey, colors: result}
    const resultAvatar = createAvatarInternal({...baseOpts, appearance: targetAppearance}, result)
    latestData = {
      key: targetKey,
      sourceAppearance,
      targetAppearance,
      source: sourceAvatar.colorSlots,
      current: currentAvatar.colorSlots,
      result,
      sourceSvg: sourceAvatar.svg,
      currentSvg: currentAvatar.svg,
      resultSvg: resultAvatar.svg,
    }
    return latestData
  }

  function renderColorRows(data: EditorData): string {
    const keys = [
      ...new Set([...Object.keys(data.current), ...Object.keys(data.source), ...Object.keys(data.result)]),
    ]
    return `<div class="gradient-lab-color-head"><span>Slot</span><span>Source</span><span>Current</span><span>Result</span></div><div class="gradient-lab-colors">${keys
      .map(key => {
        const frameKey = key.startsWith('inner.') ? key.replace('inner.', 'frame.') : key
        const source = data.source[key] ?? data.source[frameKey] ?? data.current[key]!
        const current = data.current[key] ?? source
        const result = data.result[key] ?? current
        const pinned = key in slotOverrides
        return `<div class="gradient-lab-color-row"><span class="slot" title="${key}">${key}</span><i class="gradient-lab-swatch" style="background:${source}" title="${editorColorInfo(source)}"></i><button class="gradient-lab-swatch" type="button" style="background:${current}" data-use-current="${key}" aria-label="Use current color for ${key} result" title="Use Current for Result · ${editorColorInfo(current)}"></button><input class="gradient-lab-swatch${pinned ? ' pinned' : ''}" type="color" value="${result}" data-result-picker="${key}" aria-label="Pick result color for ${key}" title="Pick Result color · ${editorColorInfo(result)}"></div>`
      })
      .join('')}</div>`
  }

  function wireColorRows(container: HTMLElement): void {
    container.querySelectorAll<HTMLButtonElement>('[data-use-current]').forEach(button => {
      button.addEventListener('click', event => {
        const key = (event.currentTarget as HTMLElement).dataset.useCurrent!
        const current = latestData?.current[key]
        if (current) {
          slotOverrides[key] = current
          refreshResult()
        }
      })
    })
    container.querySelectorAll<HTMLInputElement>('[data-result-picker]').forEach(input => {
      input.addEventListener('input', event => {
        const target = event.currentTarget as HTMLInputElement
        slotOverrides[target.dataset.resultPicker!] = target.value.toLowerCase()
        refreshResult()
      })
    })
  }

  function refreshResult(): void {
    const data = computeData()
    const resultPreview = bodyEl.querySelector<HTMLElement>('[data-gradient-result-preview]')
    const colorsEl = bodyEl.querySelector<HTMLElement>('[data-gradient-color-rows]')
    if (resultPreview) resultPreview.innerHTML = data.resultSvg
    if (colorsEl) {
      colorsEl.innerHTML = renderColorRows(data)
      wireColorRows(colorsEl)
    }
    host.render()
    host.refreshShapeButtons()
  }

  function setParam(key: keyof EditorParams, value: number): void {
    if (!Number.isFinite(value)) return
    params[key] = value
    const range = bodyEl.querySelector<HTMLInputElement>(`[data-editor-range="${key}"]`)
    const number = bodyEl.querySelector<HTMLInputElement>(`[data-editor-number="${key}"]`)
    const output = range?.closest('label')?.querySelector('output')
    if (range && range.value !== String(value)) range.value = String(value)
    if (number && number.value !== Number(value).toFixed(2)) number.value = Number(value).toFixed(2)
    if (output) output.textContent = Number(value).toFixed(2)
    refreshResult()
  }

  function renderLab(): void {
    const currentSelection = `${host.state.shape}:${host.state.palette}:${host.currentAppearance()}`
    if (currentSelection !== selection) {
      selection = currentSelection
      params = {...gradientEditorDefaults}
      slotOverrides = {}
      previewOverride = null
    }
    const data = computeData()
    const shape = getShape(host.state.shape)
    const palette = getPalette(host.state.palette)
    shapeEl.textContent = `${shape.name} · ${palette.name} · ${data.sourceAppearance} → ${data.targetAppearance}`
    exportBtn.textContent = `Export all (${Object.keys(overrides).length})`
    bodyEl.innerHTML = `<section class="dark-lab-section"><div class="gradient-lab-previews"><div class="gradient-lab-preview"><div class="av">${data.sourceSvg}</div><span>Source · ${data.sourceAppearance}</span></div><div class="gradient-lab-preview"><div class="av">${data.currentSvg}</div><span>Current · ${data.targetAppearance}</span></div><div class="gradient-lab-preview"><div class="av" data-gradient-result-preview>${data.resultSvg}</div><span>Result</span></div></div><div class="gradient-lab-direction">${data.sourceAppearance} → ${data.targetAppearance} · body + frame + inner</div></section>
      <section class="dark-lab-section"><h3>Common OKLCH transform</h3>${editorRange('hueShift', 'Hue shift', -360, 360, 1)}${editorRange('lightnessShift', 'Lightness shift', -1, 1, 0.01)}${editorRange('chromaScale', 'Relative chroma scale', 0, 3, 0.01)}</section>
      <section class="dark-lab-section"><h3>Palette difference scale</h3>${editorRange('hueDelta', 'Hue difference', 0, 3, 0.01)}${editorRange('lightnessDelta', 'Lightness difference', 0, 3, 0.01)}${editorRange('chromaDelta', 'Relative chroma difference', 0, 3, 0.01)}</section>
      <section class="dark-lab-section"><h3>Actual painted colors</h3><div data-gradient-color-rows>${renderColorRows(data)}</div></section>`
    bodyEl.querySelectorAll<HTMLInputElement>('[data-editor-range]').forEach(input => {
      input.addEventListener('input', event => {
        const el = event.target as HTMLInputElement
        setParam(el.dataset.editorRange as keyof EditorParams, Number(el.value))
      })
    })
    bodyEl.querySelectorAll<HTMLInputElement>('[data-editor-number]').forEach(input => {
      input.addEventListener('input', event => {
        const el = event.target as HTMLInputElement
        setParam(el.dataset.editorNumber as keyof EditorParams, Number(el.value))
      })
    })
    wireColorRows(bodyEl)
    host.render()
    host.refreshShapeButtons()
  }

  function clampPosition(x: number, y: number): {x: number; y: number} {
    const rect = labEl.getBoundingClientRect()
    const margin = 8
    return {
      x: clamp(x, margin, Math.max(margin, innerWidth - rect.width - margin)),
      y: clamp(y, margin, Math.max(margin, innerHeight - rect.height - margin)),
    }
  }

  function setPosition(x: number, y: number, persist = true): void {
    if (host.compactLayout.matches) return
    const next = clampPosition(x, y)
    labEl.style.left = `${next.x}px`
    labEl.style.top = `${next.y}px`
    labEl.style.right = 'auto'
    labEl.style.bottom = 'auto'
    if (persist) localStorage.setItem(GRADIENT_EDITOR_POSITION_KEY, JSON.stringify(next))
  }

  function restorePosition(): void {
    if (host.compactLayout.matches) {
      for (const prop of ['left', 'top', 'right', 'bottom']) labEl.style.removeProperty(prop)
      return
    }
    try {
      const saved = JSON.parse(localStorage.getItem(GRADIENT_EDITOR_POSITION_KEY) || 'null') as
        | {x: number; y: number}
        | null
      if (saved) setPosition(Number(saved.x), Number(saved.y), false)
    } catch {
      return
    }
  }

  function setOpen(open: boolean): void {
    labEl.hidden = !open
    localStorage.setItem(GRADIENT_LAB_OPEN_KEY, open ? '1' : '0')
    if (open) {
      restorePosition()
      renderLab()
    } else {
      previewOverride = null
      host.render()
      host.refreshShapeButtons()
    }
  }

  toggleBtn.addEventListener('click', () => setOpen(true))
  byId('dark-lab-close').addEventListener('click', () => setOpen(false))

  byId('dark-lab-reset').addEventListener('click', () => {
    params = {...gradientEditorDefaults}
    slotOverrides = {}
    renderLab()
  })

  byId('dark-lab-revert').addEventListener('click', () => {
    const key = gradientOverrideKey(host.state.shape, host.state.palette, host.currentAppearance())
    delete overrides[key]
    localStorage.setItem(GRADIENT_OVERRIDES_KEY, JSON.stringify(overrides))
    params = {...gradientEditorDefaults}
    slotOverrides = {}
    previewOverride = null
    renderLab()
    host.renderGrid()
  })

  byId<HTMLButtonElement>('dark-lab-apply').addEventListener('click', event => {
    if (!latestData) return
    overrides[latestData.key] = {
      shape: host.state.shape,
      palette: host.state.palette,
      sourceAppearance: latestData.sourceAppearance,
      targetAppearance: latestData.targetAppearance,
      params: {...params},
      slotOverrides: {...slotOverrides},
      colors: {...latestData.result},
    }
    localStorage.setItem(GRADIENT_OVERRIDES_KEY, JSON.stringify(overrides))
    previewOverride = null
    const button = event.currentTarget as HTMLButtonElement
    const old = button.textContent
    button.textContent = 'Applied'
    window.setTimeout(() => {
      button.textContent = old
    }, 1000)
    renderLab()
    host.renderGrid()
  })

  byId<HTMLButtonElement>('dark-lab-copy').addEventListener('click', async event => {
    if (!latestData) return
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          shape: host.state.shape,
          palette: host.state.palette,
          sourceAppearance: latestData.sourceAppearance,
          targetAppearance: latestData.targetAppearance,
          params,
          slotOverrides,
          colors: latestData.result,
        },
        null,
        2,
      ),
    )
    const button = event.currentTarget as HTMLButtonElement
    const old = button.textContent
    button.textContent = 'Copied'
    window.setTimeout(() => {
      button.textContent = old
    }, 1200)
  })

  exportBtn.addEventListener('click', event => {
    const records = Object.entries(overrides).map(([key, value]) => normalizedRecord(key, value))
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: records.length,
      overrides: records,
    }
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], {type: 'application/json'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    navigator.clipboard.writeText(json).catch(() => {})
    link.href = url
    link.download = 'superslate-avatar-gradient-overrides.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    const button = event.currentTarget as HTMLButtonElement
    const old = button.textContent
    button.textContent = `Exported ${records.length}`
    window.setTimeout(() => {
      button.textContent = old
    }, 1200)
  })

  const headEl = labEl.querySelector<HTMLElement>('.dark-lab-head')!
  headEl.addEventListener('pointerdown', event => {
    if (host.compactLayout.matches || (event.target as HTMLElement).closest('button')) return
    const rect = labEl.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const originX = rect.left
    const originY = rect.top
    headEl.setPointerCapture(event.pointerId)
    const move = (moveEvent: PointerEvent) => {
      setPosition(originX + moveEvent.clientX - startX, originY + moveEvent.clientY - startY, false)
    }
    const up = (upEvent: PointerEvent) => {
      headEl.releasePointerCapture(upEvent.pointerId)
      headEl.removeEventListener('pointermove', move)
      headEl.removeEventListener('pointerup', up)
      headEl.removeEventListener('pointercancel', up)
      const finalRect = labEl.getBoundingClientRect()
      setPosition(finalRect.left, finalRect.top, true)
    }
    headEl.addEventListener('pointermove', move)
    headEl.addEventListener('pointerup', up)
    headEl.addEventListener('pointercancel', up)
  })

  window.addEventListener('resize', () => {
    if (!labEl.hidden && !host.compactLayout.matches) {
      const rect = labEl.getBoundingClientRect()
      setPosition(rect.left, rect.top, false)
    }
  })

  if (localStorage.getItem(GRADIENT_LAB_OPEN_KEY) === '1') setOpen(true)

  return {
    renderIfOpen() {
      if (!labEl.hidden) renderLab()
    },
    onResize() {
      restorePosition()
    },
    overrideFor,
  }
}
