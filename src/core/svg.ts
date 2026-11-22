import {getPalette} from '../data/palettes'
import {getShape} from '../data/shapes'
import {darkShapeAnchors} from '../data/dark-appearance'
import {darkEmberPaletteOverrides} from '../data/dark-ember-palettes'
import {appearanceColorOverrides} from '../data/appearance-overrides'
import type {
  AvatarAppearance,
  AvatarOptions,
  AvatarResult,
  PaletteColors,
  ShapeId,
  ToneOptions,
} from '../types'
import {derivePalette, getPaletteMainHue} from '../color/tone'
import {
  deriveAppearancePalette,
  deriveDarkAnchorColor,
  deriveDarkEmberLayerColor,
  deriveDarkGlow,
} from '../color/appearance'
import {
  clamp,
  hexToOklch,
  maxSrgbChroma,
  normalizeHue,
  oklchToHexInGamut,
  relativeSrgbChroma,
} from '../color/oklch'
import {hashString, randomFromString} from './random'

type LayerPalette =
  | {bg: string; blob: string; hot: string; pale: string}
  | {dark: string; base: string; warm: string; cream: string; cool: string; cream1?: string; cream2?: string}
  | {dark: string; base: string; cream1: string; cream2: string; hot1: string; hot2: string}
  | {base: string; white: string; hot: string; cool: string}
  | {base: string; blue: string; green: string; glow: string}
  | {base: string; milk: string; grad1: string; grad2: string; glow: string; base1?: string; base2?: string}

interface GlowPalette {
  white: string
  glow1: string
  glow2: string
}

interface Study {
  type: ShapeId
  appearance: AvatarAppearance
  name: string
  shapeName: string
  paletteName: string
  geometryKey: string
  p: LayerPalette
  glow: GlowPalette
  innerGlow?: GlowPalette
}

interface RectOptions {
  rotate?: number
  fixed?: boolean
  blur?: string
  filterId?: string
  opacity?: number
  blend?: string
}

interface Tweak {
  dx: number
  dy: number
  sx: number
  sy: number
  rotate: number
  opacity: number
}

interface ShadowMetric {
  blur: number
  spread?: number
  dx?: number
  dy?: number
  alpha?: number
}

interface DarkEffectProfile {
  frame: [ShadowMetric, ShadowMetric, ShadowMetric]
  surface?: [ShadowMetric, ShadowMetric, ShadowMetric]
  layerBlurs: [number, number]
}

const darkShapeToneDefaults: Partial<Record<ShapeId, ToneOptions>> = {
  ember: {lightness: -0.04},
  prism: {lightness: -0.1},
}

const baseGlows = {
  prism: {white: '#ffffff', glow1: '#fee9f5', glow2: '#fee9f5'},
  veil: {white: '#ffffff', glow1: '#aec6cf', glow2: '#aec6cf'},
  ember: {white: '#ffffff', glow1: '#ffdfda', glow2: '#ffbe74'},
  zenith: {white: '#ffffff', glow1: '#88b9ff', glow2: '#7cb2ff'},
  beam: {white: '#ffffff', glow1: '#71abff', glow2: '#71abff'},
  horizon: {white: '#ffffff', glow1: '#42cba9', glow2: '#42cba9'},
} as const

const darkEffectProfiles: Record<ShapeId, DarkEffectProfile> = {
  zenith: {
    frame: [
      {blur: 5.052632, dy: -1.122807},
      {blur: 1.122807, spread: 1.016887},
      {blur: 1.122807, spread: 1.015873},
    ],
    layerBlurs: [5.614035, 8.421053],
  },
  beam: {
    frame: [
      {blur: 5.614035},
      {blur: 2.245614, spread: 1.015873},
      {blur: 1.122807, spread: 1.015873},
    ],
    layerBlurs: [13.714285, 5.079366],
  },
  horizon: {
    frame: [
      {blur: 5.614035},
      {blur: 1.684211, spread: 1.016887},
      {blur: 1.122807, spread: 1.015873},
    ],
    layerBlurs: [13.727973, 5.084435],
  },
  prism: {
    frame: [
      {blur: 5.614035, alpha: 1},
      {blur: 2.245614, spread: 1.016887, alpha: 1},
      {blur: 1.122807, spread: 1.015873, alpha: 1},
    ],
    layerBlurs: [3.224692, 1.074898],
  },
  veil: {
    frame: [
      {blur: 5.925926},
      {blur: 1.481482, spread: 1.015873},
      {blur: 1.122807, spread: 1.015873},
    ],
    surface: [
      {blur: 12.698412, spread: 2.539683, alpha: 0.5},
      {blur: 5.079365},
      {blur: 1.269841, spread: 1.015873},
    ],
    layerBlurs: [10.370371, 7.626652],
  },
  ember: {
    frame: [
      {blur: 5.614035, alpha: 0.72},
      {blur: 2.245614, spread: 1.016887, alpha: 0.58},
      {blur: 1.122807, spread: 1.015873, alpha: 0.32},
    ],
    surface: [
      {blur: 12.711087, spread: 2.542217, alpha: 0.5},
      {blur: 5.084435},
      {blur: 1.271109, spread: 1.016887},
    ],
    layerBlurs: [4.830213, 7.626652],
  },
}

function glowForAppearance(
  key: keyof typeof baseGlows,
  appearance: AvatarAppearance,
  palette: PaletteColors,
  referencePalette: PaletteColors,
  chromaFloorScale: number,
): GlowPalette {
  const glow = baseGlows[key]
  if (appearance === 'light') return glow
  return deriveDarkGlow(darkShapeAnchors[key].frameGlow, palette, referencePalette, chromaFloorScale)
}

function innerGlowForAppearance(
  key: ShapeId,
  appearance: AvatarAppearance,
  palette: PaletteColors,
  referencePalette: PaletteColors,
  chromaFloorScale: number,
): GlowPalette | undefined {
  if (appearance === 'light') return undefined
  const anchors = darkShapeAnchors[key].innerGlow
  return anchors ? deriveDarkGlow(anchors, palette, referencePalette, chromaFloorScale) : undefined
}

function makeTweaker(seed: string, drift: number): (key: string) => Tweak {
  const v = clamp(drift, 0, 24) / 100
  return function tweak(key: string): Tweak {
    const r = (suffix: string) => randomFromString(`${seed}:${key}:${suffix}`) * 2 - 1
    return {
      dx: r('dx') * 2.8 * v,
      dy: r('dy') * 2.8 * v,
      sx: 1 + r('sx') * 0.035 * v,
      sy: 1 + r('sy') * 0.035 * v,
      rotate: r('rot') * 2.8 * v,
      opacity: 1 + r('op') * 0.05 * v,
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function normalizeInitials(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) return ''
  const segmenter = new Intl.Segmenter(undefined, {granularity: 'grapheme'})
  return [...segmenter.segment(trimmed.toLocaleUpperCase())]
    .slice(0, 2)
    .map(segment => segment.segment)
    .join('')
}

function paletteForType(
  type: ShapeId,
  palette: PaletteColors,
  appearance: AvatarAppearance,
  referencePalette: PaletteColors,
  chromaFloorScale: number,
  manualEmberPalette?: PaletteColors,
): LayerPalette {
  if (appearance === 'dark') {
    const anchors = darkShapeAnchors[type].layers
    const color = (name: string): string =>
      deriveDarkAnchorColor(anchors[name]!, palette, referencePalette, chromaFloorScale)
    if (type === 'prism') {
      return {bg: color('base'), blob: color('blob'), hot: color('hot'), pale: color('base')}
    }
    if (type === 'veil') {
      return {
        dark: color('dark'),
        base: color('base'),
        warm: color('warm'),
        cream: '',
        cream1: color('cream1'),
        cream2: color('cream2'),
        cool: color('cream2'),
      }
    }
    if (type === 'ember') {
      if (manualEmberPalette) {
        return {
          dark: manualEmberPalette.dark,
          base: manualEmberPalette.lobe,
          cream1: manualEmberPalette.pale,
          cream2: manualEmberPalette.light,
          hot1: manualEmberPalette.warm,
          hot2: manualEmberPalette.accent,
        }
      }
      const emberColor = (name: string): string =>
        deriveDarkEmberLayerColor(anchors[name]!, palette, referencePalette, chromaFloorScale)
      return {
        dark: emberColor('dark'),
        base: emberColor('base'),
        cream1: emberColor('cream1'),
        cream2: emberColor('cream2'),
        hot1: emberColor('hot1'),
        hot2: emberColor('hot2'),
      }
    }
    if (type === 'zenith') {
      return {base: color('base'), white: color('light'), hot: color('hot'), cool: color('base')}
    }
    if (type === 'beam') {
      return {base: color('base'), blue: color('core'), green: color('beam'), glow: color('beam')}
    }
    return {
      base: '',
      base1: color('base1'),
      base2: color('base2'),
      milk: color('milk'),
      grad1: color('glow1'),
      grad2: color('glow2'),
      glow: color('glow1'),
    }
  }
  if (type === 'prism') {
    return {bg: palette.base, blob: palette.lobe, hot: palette.accent, pale: palette.pale}
  }
  if (type === 'veil') {
    return {
      dark: palette.dark,
      base: palette.base,
      warm: palette.warm,
      cream: palette.light,
      cool: palette.cool,
    }
  }
  if (type === 'ember') {
    return {
      dark: palette.dark,
      base: palette.lobe,
      cream1: palette.pale,
      cream2: palette.light,
      hot1: palette.warm,
      hot2: palette.accent,
    }
  }
  if (type === 'zenith') {
    return {base: palette.cool, white: palette.light, hot: palette.accent, cool: palette.beam}
  }
  if (type === 'beam') {
    return {base: palette.dark, blue: palette.cool, green: palette.beam, glow: palette.accent}
  }
  return {
    base: palette.lobe,
    milk: palette.pale,
    grad1: palette.light,
    grad2: palette.base,
    glow: palette.beam,
  }
}

function sharedDefs(): string {
  return `
    <filter id="blur-1" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1"/></filter>
    <filter id="blur-3" x="-55%" y="-55%" width="210%" height="210%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <filter id="blur-5" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="5.1"/></filter>
    <filter id="blur-6" x="-75%" y="-75%" width="250%" height="250%"><feGaussianBlur stdDeviation="5.7"/></filter>
    <filter id="blur-8" x="-85%" y="-85%" width="270%" height="270%"><feGaussianBlur stdDeviation="8.4"/></filter>
    <filter id="blur-10" x="-95%" y="-95%" width="290%" height="290%"><feGaussianBlur stdDeviation="10.4"/></filter>
    <filter id="blur-14" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="13.8"/></filter>`
}

function innerShadowFilter(
  id: string,
  metrics: [ShadowMetric, ShadowMetric, ShadowMetric],
  colors: [string, string, string],
): string {
  let previous = 'shape'
  const shadows = metrics
    .map((metric, index) => {
      const step = index + 1
      const hardAlpha = `hard-alpha-${step}-${id}`
      const source = metric.spread
        ? `<feMorphology in="SourceAlpha" operator="erode" radius="${metric.spread}" result="spread-${step}-${id}"/>`
        : `<feComposite in="SourceAlpha" in2="SourceAlpha" operator="in" result="spread-${step}-${id}"/>`
      const offset =
        metric.dx || metric.dy
          ? `<feOffset in="spread-${step}-${id}" dx="${metric.dx ?? 0}" dy="${metric.dy ?? 0}" result="offset-${step}-${id}"/>`
          : `<feOffset in="spread-${step}-${id}" result="offset-${step}-${id}"/>`
      const current = `shadow-${step}-${id}`
      const result = `
      <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="${hardAlpha}"/>
      ${source}
      ${offset}
      <feGaussianBlur in="offset-${step}-${id}" stdDeviation="${metric.blur}" result="blur-${step}-${id}"/>
      <feComposite in="blur-${step}-${id}" in2="${hardAlpha}" operator="arithmetic" k2="-1" k3="1" result="alpha-${step}-${id}"/>
      <feFlood flood-color="${colors[index]}" flood-opacity="${metric.alpha ?? 1}" result="flood-${step}-${id}"/>
      <feComposite in="flood-${step}-${id}" in2="alpha-${step}-${id}" operator="in" result="color-${step}-${id}"/>
      <feBlend mode="normal" in="color-${step}-${id}" in2="${previous}" result="${current}"/>`
      previous = current
      return result
    })
    .join('')

  return `<filter id="${id}" x="0" y="0" width="64" height="64" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feFlood flood-opacity="0" result="BackgroundImageFix"/>
      <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
      ${shadows}
    </filter>`
}

function darkEffectDefs(id: string, study: Study): string {
  if (study.appearance !== 'dark') return ''
  const profile = darkEffectProfiles[study.type]
  // Chromium resolves the 1.12px inner highlight directly at final SVG size
  // rather than downsampling from 64px; 0.45 alpha matches Figma coverage.
  const frameMetrics = profile.frame.map((metric, index) =>
    index === 2 ? {...metric, alpha: metric.alpha ?? 0.45} : metric,
  ) as [ShadowMetric, ShadowMetric, ShadowMetric]
  const frameColors: [string, string, string] = [
    study.glow.glow2,
    study.glow.glow1,
    study.glow.white,
  ]
  const surface =
    profile.surface && study.innerGlow
      ? innerShadowFilter(`dark-surface-${id}`, profile.surface, [
          study.innerGlow.glow2,
          study.innerGlow.glow1,
          study.innerGlow.white,
        ])
      : ''
  const layerBlurs = profile.layerBlurs
    .map(
      (blur, index) => `
    <filter id="dark-layer-${index + 1}-${id}" x="-120%" y="-120%" width="340%" height="340%" color-interpolation-filters="sRGB">
      <feGaussianBlur stdDeviation="${blur}"/>
    </filter>`,
    )
    .join('')
  return `${innerShadowFilter(`dark-frame-${id}`, frameMetrics, frameColors)}${surface}${layerBlurs}`
}

function layerColorSlots(study: Study): [string, string, string, string, string, string] {
  const p = study.p
  if ('bg' in p) return [p.bg, p.blob, p.hot, p.bg, p.blob, p.hot]
  if ('hot1' in p) return [p.dark, p.base, p.cream1, p.cream2, p.hot1, p.hot2]
  if ('warm' in p) {
    const cream1 = p.cream1 || p.cream
    const cream2 = p.cream2 || p.cream
    return [p.dark, p.base, p.warm, cream1, cream2, p.cool]
  }
  if ('white' in p) return [p.base, p.white, p.hot, p.base, p.white, p.hot]
  if ('blue' in p) return [p.base, p.blue, p.green, p.base, p.blue, p.green]
  const base1 = p.base1 || p.base
  const base2 = p.base2 || p.base
  return [base1, base2, p.milk, p.grad1, p.grad2, p.glow]
}

function usedColors(study: Study): string[] {
  return [...layerColorSlots(study), study.glow.glow2, study.glow.glow1, study.glow.white]
}

function studyColorSlots(study: Study): Record<string, string> {
  const layers = layerColorSlots(study)
  const slots: Record<string, string> = {}
  layers.forEach((color, index) => {
    slots[`layer.${index + 1}`] = color
  })
  slots['frame.wide'] = study.glow.glow2
  slots['frame.medium'] = study.glow.glow1
  slots['frame.narrow'] = study.glow.white
  if (study.innerGlow) {
    slots['inner.wide'] = study.innerGlow.glow2
    slots['inner.medium'] = study.innerGlow.glow1
    slots['inner.narrow'] = study.innerGlow.white
  }
  return slots
}

function applyBuiltInAppearanceOverride(
  study: Study,
  colors: Record<string, string> | undefined,
): void {
  if (!colors) return
  if (study.type === 'prism' && 'bg' in study.p) {
    study.p.bg = colors['layer.1'] ?? study.p.bg
    study.p.blob = colors['layer.2'] ?? study.p.blob
    study.p.hot = colors['layer.3'] ?? study.p.hot
  } else if (study.type === 'ember' && 'hot1' in study.p) {
    study.p.dark = colors['layer.1'] ?? study.p.dark
    study.p.base = colors['layer.2'] ?? study.p.base
    study.p.cream1 = colors['layer.3'] ?? study.p.cream1
    study.p.cream2 = colors['layer.4'] ?? study.p.cream2
    study.p.hot1 = colors['layer.5'] ?? study.p.hot1
    study.p.hot2 = colors['layer.6'] ?? study.p.hot2
  } else if (study.type === 'horizon' && 'grad1' in study.p) {
    study.p.base1 = colors['layer.1'] ?? study.p.base1
    study.p.base2 = colors['layer.2'] ?? study.p.base2
    study.p.milk = colors['layer.3'] ?? study.p.milk
    study.p.grad1 = colors['layer.4'] ?? study.p.grad1
    study.p.grad2 = colors['layer.5'] ?? study.p.grad2
    study.p.glow = colors['layer.6'] ?? study.p.glow
  }
  study.glow = {
    glow2: colors['frame.wide'] ?? study.glow.glow2,
    glow1: colors['frame.medium'] ?? study.glow.glow1,
    white: colors['frame.narrow'] ?? study.glow.white,
  }
  if (study.innerGlow) {
    study.innerGlow = {
      glow2: colors['inner.wide'] ?? study.innerGlow.glow2,
      glow1: colors['inner.medium'] ?? study.innerGlow.glow1,
      white: colors['inner.narrow'] ?? study.innerGlow.white,
    }
  }
}

function applyAllStudyColorSlots(study: Study, slots: Record<string, string> | undefined): void {
  if (!slots) return
  const p = study.p
  const c = (index: number) => slots[`layer.${index}`]
  if ('bg' in p) {
    p.bg = c(1) ?? p.bg
    p.blob = c(2) ?? p.blob
    p.hot = c(3) ?? p.hot
  } else if ('hot1' in p) {
    p.dark = c(1) ?? p.dark
    p.base = c(2) ?? p.base
    p.cream1 = c(3) ?? p.cream1
    p.cream2 = c(4) ?? p.cream2
    p.hot1 = c(5) ?? p.hot1
    p.hot2 = c(6) ?? p.hot2
  } else if ('warm' in p) {
    p.dark = c(1) ?? p.dark
    p.base = c(2) ?? p.base
    p.warm = c(3) ?? p.warm
    if (p.cream1) {
      p.cream1 = c(4) ?? p.cream1
      p.cream2 = c(5) ?? p.cream2
    } else {
      p.cream = c(4) ?? p.cream
    }
    p.cool = c(6) ?? p.cool
  } else if ('white' in p) {
    p.base = c(1) ?? p.base
    p.white = c(2) ?? p.white
    p.hot = c(3) ?? p.hot
  } else if ('blue' in p) {
    p.base = c(1) ?? p.base
    p.blue = c(2) ?? p.blue
    p.green = c(3) ?? p.green
  } else {
    if (p.base1) {
      p.base1 = c(1) ?? p.base1
      p.base2 = c(2) ?? p.base2
    } else {
      p.base = c(1) ?? p.base
    }
    p.milk = c(3) ?? p.milk
    p.grad1 = c(4) ?? p.grad1
    p.grad2 = c(5) ?? p.grad2
    p.glow = c(6) ?? p.glow
  }
  study.glow = {
    glow2: slots['frame.wide'] ?? study.glow.glow2,
    glow1: slots['frame.medium'] ?? study.glow.glow1,
    white: slots['frame.narrow'] ?? study.glow.white,
  }
  if (study.innerGlow) {
    study.innerGlow = {
      glow2: slots['inner.wide'] ?? study.innerGlow.glow2,
      glow1: slots['inner.medium'] ?? study.innerGlow.glow1,
      white: slots['inner.narrow'] ?? study.innerGlow.white,
    }
  }
}

function toneAppearanceOverride(
  colors: Record<string, string> | undefined,
  tone: ToneOptions | undefined,
  baseHue: number,
): Record<string, string> | undefined {
  if (!colors || !tone) return colors
  const targetHue = tone.hue == null ? baseHue : normalizeHue(tone.hue)
  const hueShift = normalizeHue(targetHue - baseHue)
  const chromaScale = clamp(tone.chroma ?? 1, 0, 1)
  const lightShift = tone.lightness ?? 0
  if (hueShift === 0 && chromaScale === 1 && lightShift === 0) return colors
  return Object.fromEntries(
    Object.entries(colors).map(([key, hex]) => {
      const color = hexToOklch(hex)
      const hue = color.c < 0.006 ? targetHue : normalizeHue(color.h + hueShift)
      const lightness = clamp(color.l + lightShift, 0.04, 0.98)
      const relativeChroma = color.c < 0.006 ? 0 : relativeSrgbChroma(color) * chromaScale
      return [
        key,
        oklchToHexInGamut({l: lightness, c: relativeChroma * maxSrgbChroma(lightness, hue), h: hue}),
      ]
    }),
  )
}

function frame(id: string, cx: number, cy: number, size: number): string {
  const radius = size / 2
  const featherStart = ((radius - 0.5) / radius) * 100
  return `<clipPath id="clip-${id}"><rect width="${size}" height="${size}" rx="${radius}" fill="#ffffff"/></clipPath>
    <radialGradient id="edge-${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${radius}">
      <stop offset="${featherStart}%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <mask id="edge-mask-${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}" style="mask-type:alpha">
      <rect width="${size}" height="${size}" fill="url(#edge-${id})"/>
    </mask>`
}

function defsFor(id: string, study: Study): string {
  const p = study.p
  const gradients: string[] = []
  if (study.type === 'ember' && 'hot1' in p) {
    gradients.push(`
      <linearGradient id="cream-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.cream1}"/><stop offset="100%" stop-color="${p.cream2}"/>
      </linearGradient>
      <linearGradient id="hot-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.hot1}"/><stop offset="100%" stop-color="${p.hot2}"/>
      </linearGradient>`)
  }
  if (study.type === 'veil' && 'cream1' in p && p.cream1 && p.cream2) {
    gradients.push(`
      <radialGradient id="veil-${id}" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(-0.03 -15.355) rotate(89.9503) scale(36.7093 41.0794)">
        <stop offset="0%" stop-color="${p.cream1}"/><stop offset="100%" stop-color="${p.cream2}"/>
      </radialGradient>`)
  }
  if (study.type === 'horizon' && 'grad1' in p) {
    const x1 = study.appearance === 'dark' ? '1' : '0'
    const x2 = study.appearance === 'dark' ? '0' : '1'
    gradients.push(`
      <linearGradient id="horizon-${id}" x1="${x1}" y1="0" x2="${x2}" y2="0">
        <stop offset="0%" stop-color="${p.grad1}"/><stop offset="100%" stop-color="${p.grad2}"/>
      </linearGradient>`)
    if (p.base1 && p.base2) {
      gradients.push(`
        <linearGradient id="horizon-base-${id}" x1="${x1}" y1="0" x2="${x2}" y2="0">
          <stop offset="0%" stop-color="${p.base1}"/><stop offset="100%" stop-color="${p.base2}"/>
        </linearGradient>`)
    }
  }
  if (study.type === 'prism' && 'hot' in p) {
    gradients.push(`
      <radialGradient id="hot-${id}" cx="102%" cy="50%" r="58%">
        <stop offset="0%" stop-color="${p.hot}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${p.hot}" stop-opacity="0"/>
      </radialGradient>`)
  }
  return `${gradients.join('')}${darkEffectDefs(id, study)}`
}

function rect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  rx: number,
  fill: string,
  options: RectOptions,
  scale: number,
  tweak: (key: string) => Tweak,
  key: string,
): string {
  const t = options.fixed ? {dx: 0, dy: 0, sx: 1, sy: 1, rotate: 0, opacity: 1} : tweak(key)
  const x = cx + t.dx * scale
  const y = cy + t.dy * scale
  const width = w * t.sx * scale
  const height = h * t.sy * scale
  const radius = rx * Math.min(t.sx, t.sy) * scale
  const rotate = (options.rotate ?? 0) + t.rotate
  const opacity = clamp(
    (options.opacity ?? 1) * (options.opacity === 1 ? 1 : t.opacity),
    0.05,
    1,
  )
  const filter = options.filterId
    ? ` filter="url(#${options.filterId})"`
    : options.blur
      ? ` filter="url(#${options.blur})"`
      : ''
  const blend = options.blend ? ` style="mix-blend-mode:${options.blend}"` : ''
  return `<g transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) rotate(${rotate.toFixed(3)})"><rect x="${(-width / 2).toFixed(3)}" y="${(-height / 2).toFixed(3)}" width="${width.toFixed(3)}" height="${height.toFixed(3)}" rx="${radius.toFixed(3)}" fill="${fill}" opacity="${opacity.toFixed(3)}"${filter}${blend}/></g>`
}

function softInset(
  cx: number,
  cy: number,
  w: number,
  h: number,
  rx: number,
  glow: GlowPalette,
  options: RectOptions,
  scale: number,
): string {
  const rotate = options.rotate ?? 0
  const opacity = options.opacity ?? 0.6
  const width = w * scale
  const height = h * scale
  const radius = rx * scale
  const inset1 = 1.2 * scale
  const inset2 = 2 * scale
  const inset4 = 4 * scale
  return `
    <g transform="translate(${cx} ${cy}) rotate(${rotate})" opacity="${opacity}">
      <rect x="${(-width / 2 + inset1).toFixed(3)}" y="${(-height / 2 + inset1).toFixed(3)}" width="${(width - inset1 * 2).toFixed(3)}" height="${(height - inset1 * 2).toFixed(3)}" rx="${Math.max(0, radius - inset1).toFixed(3)}" fill="none" stroke="${glow.white}" stroke-width="${(1.4 * scale).toFixed(3)}" opacity="0.38" filter="url(#blur-1)"/>
      <rect x="${(-width / 2 + inset2).toFixed(3)}" y="${(-height / 2 + inset2).toFixed(3)}" width="${(width - inset2 * 2).toFixed(3)}" height="${(height - inset2 * 2).toFixed(3)}" rx="${Math.max(0, radius - inset2).toFixed(3)}" fill="none" stroke="${glow.glow1}" stroke-width="${(2.4 * scale).toFixed(3)}" opacity="0.24" filter="url(#blur-3)"/>
      <rect x="${(-width / 2 + inset4).toFixed(3)}" y="${(-height / 2 + inset4).toFixed(3)}" width="${(width - inset4 * 2).toFixed(3)}" height="${(height - inset4 * 2).toFixed(3)}" rx="${Math.max(0, radius - inset4).toFixed(3)}" fill="none" stroke="${glow.glow2}" stroke-width="${(4 * scale).toFixed(3)}" opacity="0.18" filter="url(#blur-5)"/>
    </g>`
}

function r(
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  w: number,
  h: number,
  rx: number,
  fill: string,
  options: RectOptions,
  scale: number,
  tweak: (key: string) => Tweak,
  key: string,
): string {
  return rect(cx + dx * scale, cy + dy * scale, w, h, rx, fill, options, scale, tweak, key)
}

function renderPrism(
  id: string,
  p: Extract<LayerPalette, {bg: string}>,
  glow: GlowPalette,
  dark: boolean,
  cx: number,
  cy: number,
  scale: number,
  tweak: (key: string) => Tweak,
): string {
  return `
    ${r(cx, cy, 0, 0, 75.25, 75.25, 16.27, p.bg, {rotate: -90, fixed: true}, scale, tweak, 'base')}
    ${dark ? '' : softInset(cx, cy, 75.25, 75.25, 16.27, glow, {rotate: -90, opacity: 0.48}, scale)}
    ${r(cx, cy, 33.13, 33.19, 91.37, 91.15, 46, p.blob, {rotate: 45, blur: dark ? undefined : 'blur-3', filterId: dark ? `dark-layer-1-${id}` : undefined, opacity: dark ? 1 : 0.86}, scale, tweak, 'blob-a')}
    ${r(cx, cy, -33.07, -33.02, 91.37, 91.15, 46, p.blob, {rotate: 45, blur: dark ? undefined : 'blur-3', filterId: dark ? `dark-layer-1-${id}` : undefined, opacity: dark ? 1 : 0.86}, scale, tweak, 'blob-b')}
    ${r(cx, cy, 31.16, 31.21, 76.1, 76.53, 38, `url(#hot-${id})`, {rotate: -135, blur: dark ? undefined : 'blur-1', filterId: dark ? `dark-layer-2-${id}` : undefined, opacity: dark ? 1 : 0.9}, scale, tweak, 'hot-a')}
    ${r(cx, cy, -31.47, -31.42, 76.53, 76.53, 38, `url(#hot-${id})`, {rotate: 45, blur: dark ? undefined : 'blur-1', filterId: dark ? `dark-layer-2-${id}` : undefined, opacity: dark ? 1 : 0.9}, scale, tweak, 'hot-b')}`
}

function renderVeil(
  id: string,
  p: Extract<LayerPalette, {warm: string}>,
  glow: GlowPalette,
  innerGlow: GlowPalette | undefined,
  dark: boolean,
  cx: number,
  cy: number,
  scale: number,
  tweak: (key: string) => Tweak,
): string {
  const cream = p.cream1 && p.cream2 ? `url(#veil-${id})` : p.cream
  return `
    ${r(cx, cy, 0, 0, 64, 64, 16.25, p.dark, {fixed: true, filterId: dark ? `dark-surface-${id}` : undefined}, scale, tweak, 'dark')}
    ${dark ? '' : softInset(cx, cy, 64, 64, 16.25, innerGlow ?? glow, {opacity: 0.58}, scale)}
    ${r(cx, cy, 0, 2.29, 70.1, 74.67, 16.25, p.base, {fixed: true}, scale, tweak, 'base')}
    ${dark ? '' : softInset(cx, cy + 2.29 * scale, 70.1, 74.67, 16.25, glow, {opacity: 0.42}, scale)}
    ${r(cx, cy, 0, -25.75, 93.63, 79.59, 50.79, p.warm, {blur: dark ? undefined : 'blur-10', filterId: dark ? `dark-layer-1-${id}` : undefined, opacity: dark ? 1 : 0.9}, scale, tweak, 'warm')}
    ${r(cx, cy, 0.03, -13.65, 47.79, 42.71, 50.84, cream, {blur: dark ? undefined : 'blur-8', filterId: dark ? `dark-layer-2-${id}` : undefined, opacity: dark ? 1 : 0.92}, scale, tweak, 'cream')}`
}

function renderEmber(
  id: string,
  p: Extract<LayerPalette, {cream1: string}>,
  glow: GlowPalette,
  innerGlow: GlowPalette | undefined,
  dark: boolean,
  cx: number,
  cy: number,
  scale: number,
  tweak: (key: string) => Tweak,
): string {
  return `
    ${r(cx, cy, 0.03, 0.03, 64.06, 64.06, 16.27, p.dark, {fixed: true, filterId: dark ? `dark-surface-${id}` : undefined}, scale, tweak, 'dark')}
    ${dark ? '' : softInset(cx, cy, 64.06, 64.06, 16.27, innerGlow ?? glow, {opacity: 0.42}, scale)}
    ${r(cx, cy, 0.03, 2.32, 70.17, 74.74, 16.27, p.base, {fixed: true}, scale, tweak, 'base')}
    ${dark ? '' : softInset(cx, cy + 2.32 * scale, 70.17, 74.74, 16.27, glow, {opacity: 0.36}, scale)}
    ${r(cx, cy, 0, -0.5, 70, 65, 120, `url(#cream-${id})`, {blur: dark ? undefined : 'blur-5', filterId: dark ? `dark-layer-1-${id}` : undefined, opacity: dark ? 1 : 0.92}, scale, tweak, 'cream')}
    ${r(cx, cy, 7, 10, 44, 44, 120, `url(#hot-${id})`, {blur: dark ? undefined : 'blur-8', filterId: dark ? `dark-layer-2-${id}` : undefined, opacity: dark ? 1 : 0.84}, scale, tweak, 'hot')}`
}

function renderZenith(
  id: string,
  p: Extract<LayerPalette, {white: string}>,
  glow: GlowPalette,
  dark: boolean,
  cx: number,
  cy: number,
  scale: number,
  tweak: (key: string) => Tweak,
): string {
  return `
    ${r(cx, cy, 0.03, 0.03, 75.25, 75.25, 16.27, p.base, {rotate: -90, fixed: true}, scale, tweak, 'base')}
    ${dark ? '' : softInset(cx, cy, 75.25, 75.25, 16.27, glow, {rotate: -90, opacity: 0.42}, scale)}
    ${r(cx, cy, 0, -17.12, 71.3, 83.65, 33.68, p.white, {rotate: 180, blur: dark ? undefined : 'blur-6', filterId: dark ? `dark-layer-1-${id}` : undefined, opacity: dark ? 1 : 0.92}, scale, tweak, 'white')}
    ${r(cx, cy, 0, -28.35, 58.39, 64, 25.26, p.hot, {rotate: 180, blur: dark ? undefined : 'blur-8', filterId: dark ? `dark-layer-2-${id}` : undefined, opacity: dark ? 1 : 0.86}, scale, tweak, 'hot')}`
}

function renderBeam(
  id: string,
  p: Extract<LayerPalette, {blue: string}>,
  glow: GlowPalette,
  dark: boolean,
  cx: number,
  cy: number,
  scale: number,
  tweak: (key: string) => Tweak,
): string {
  return `
    ${r(cx, cy, 0, 0, 75.18, 75.18, 16.25, p.base, {rotate: -90, fixed: true}, scale, tweak, 'base')}
    ${dark ? '' : softInset(cx, cy, 75.18, 75.18, 16.25, glow, {rotate: -90, opacity: 0.36}, scale)}
    ${r(cx, cy, 0, 0.11, 64, 37.58, 10.16, p.blue, {rotate: 180, blur: dark ? undefined : 'blur-14', filterId: dark ? `dark-layer-1-${id}` : undefined, opacity: dark ? 1 : 0.98}, scale, tweak, 'blue')}
    ${r(cx, cy, -0.11, -0.11, 44.89, 18.26, 5.08, p.green, {rotate: 180, blur: dark ? undefined : 'blur-5', filterId: dark ? `dark-layer-2-${id}` : undefined, opacity: dark ? 1 : 0.9, blend: 'plus-lighter'}, scale, tweak, 'green')}`
}

function renderHorizon(
  id: string,
  p: Extract<LayerPalette, {milk: string}>,
  glow: GlowPalette,
  dark: boolean,
  cx: number,
  cy: number,
  scale: number,
  tweak: (key: string) => Tweak,
): string {
  const base = p.base1 && p.base2 ? `url(#horizon-base-${id})` : p.base
  return `
    ${r(cx, cy, 0.03, 0.03, 75.25, 75.25, 16.27, base, {rotate: -90, fixed: true}, scale, tweak, 'base')}
    ${dark ? '' : softInset(cx, cy, 75.25, 75.25, 16.27, glow, {rotate: -90, opacity: 0.36}, scale)}
    ${r(cx, cy, 0.03, 28.5, 56.95, 54.91, 10.17, p.milk, {rotate: -90, blur: dark ? undefined : 'blur-14', filterId: dark ? `dark-layer-1-${id}` : undefined, opacity: dark ? 1 : 0.9}, scale, tweak, 'milk')}
    ${r(cx, cy, 1, 26, 52, 52, 120, `url(#horizon-${id})`, {rotate: -90, blur: dark ? undefined : 'blur-5', filterId: dark ? `dark-layer-2-${id}` : undefined, opacity: dark ? 1 : 0.92}, scale, tweak, 'glow')}`
}

function renderBody(
  study: Study,
  id: string,
  cx: number,
  cy: number,
  scale: number,
  tweak: (key: string) => Tweak,
): string {
  const dark = study.appearance === 'dark'
  if (study.type === 'prism') {
    return renderPrism(id, study.p as Extract<LayerPalette, {bg: string}>, study.glow, dark, cx, cy, scale, tweak)
  }
  if (study.type === 'veil') {
    return renderVeil(id, study.p as Extract<LayerPalette, {warm: string}>, study.glow, study.innerGlow, dark, cx, cy, scale, tweak)
  }
  if (study.type === 'ember') {
    return renderEmber(id, study.p as Extract<LayerPalette, {cream1: string}>, study.glow, study.innerGlow, dark, cx, cy, scale, tweak)
  }
  if (study.type === 'zenith') {
    return renderZenith(id, study.p as Extract<LayerPalette, {white: string}>, study.glow, dark, cx, cy, scale, tweak)
  }
  if (study.type === 'beam') {
    return renderBeam(id, study.p as Extract<LayerPalette, {blue: string}>, study.glow, dark, cx, cy, scale, tweak)
  }
  return renderHorizon(id, study.p as Extract<LayerPalette, {milk: string}>, study.glow, dark, cx, cy, scale, tweak)
}

function renderSvg(
  study: Study,
  options: Required<Pick<AvatarOptions, 'variantId' | 'drift' | 'size'>> &
    Pick<AvatarOptions, 'background' | 'title' | 'initials' | 'initialsColor'>,
): string {
  const displaySize = options.size
  const coordinateSize = 64
  const cx = coordinateSize / 2
  const cy = coordinateSize / 2
  const scale = 1
  const idSeed = `${study.type}:${study.paletteName}:${study.appearance}:${options.variantId}:${JSON.stringify(study.p)}`
  const id = `av-${hashString(idSeed).toString(36)}`
  const tweak = makeTweaker(`${options.variantId}:${study.geometryKey}:${study.type}`, options.drift)
  const body = renderBody(study, id, cx, cy, scale, tweak)
  const title = options.title ? `<title>${escapeHtml(options.title)}</title>` : ''
  const background =
    options.background === null
      ? ''
      : `<rect width="100%" height="100%" fill="${options.background ?? '#ffffff'}"/>`
  const initials = normalizeInitials(options.initials)
  const initialsMarkup = initials
    ? `<text x="32" y="32" text-anchor="middle" dominant-baseline="central" fill="${escapeHtml(options.initialsColor ?? (study.appearance === 'dark' ? '#ffffff' : '#1c1c1c'))}" fill-opacity="${study.appearance === 'dark' ? '0.92' : '0.78'}" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${[...initials].length === 1 ? 23 : 19}" font-weight="600" letter-spacing="-0.6">${escapeHtml(initials)}</text>`
    : ''

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${displaySize}" height="${displaySize}" viewBox="0 0 ${coordinateSize} ${coordinateSize}" role="img">
    ${title}
    <defs>${sharedDefs()}${frame(id, cx, cy, coordinateSize)}${defsFor(id, study)}</defs>
    ${background}
    <g mask="url(#edge-mask-${id})">
      ${study.appearance === 'dark' ? `<g filter="url(#dark-frame-${id})"><g clip-path="url(#clip-${id})">${body}</g></g>` : `<g clip-path="url(#clip-${id})">${body}</g>`}${initialsMarkup ? `\n      ${initialsMarkup}` : ''}
    </g>
  </svg>`

  // Suffix shared blur filter ids per avatar so multiple inline SVGs in one document never collide.
  return svg.replace(/(id="|url\(#)blur-(\d+)/g, `$1blur-$2-${id}`)
}

export interface AvatarResultWithSlots extends AvatarResult {
  colorSlots: Record<string, string>
}

export function createAvatarInternal(
  options: AvatarOptions = {},
  slotOverride?: Record<string, string>,
): AvatarResultWithSlots {
  const shape = getShape(options.shape ?? 'prism')
  const palette = getPalette(options.palette)
  const appearance = options.appearance ?? 'light'
  const darkReference = getPalette(darkShapeAnchors[shape.id].lightReference)
  const shapeToneDefault =
    appearance === 'dark' && palette.id !== darkReference.id
      ? darkShapeToneDefaults[shape.id]
      : undefined
  const darkShapeTone =
    shapeToneDefault == null
      ? undefined
      : {
          chroma: shapeToneDefault.chroma,
          lightness: shapeToneDefault.lightness,
        }
  const effectiveTone =
    darkShapeTone == null && options.tone == null
      ? undefined
      : {...darkShapeTone, ...options.tone}
  const hasDarkToneAdjustment =
    effectiveTone != null &&
    ((effectiveTone.hue != null && Math.round(effectiveTone.hue) !== getPaletteMainHue(palette)) ||
      (effectiveTone.chroma != null && effectiveTone.chroma !== 1) ||
      (effectiveTone.lightness != null && effectiveTone.lightness !== 0))
  const sourceColors =
    appearance === 'dark' && !hasDarkToneAdjustment
      ? {...palette.colors}
      : derivePalette(palette, effectiveTone)
  const manualEmberOverride =
    appearance === 'dark' && shape.id === 'ember'
      ? darkEmberPaletteOverrides[palette.id]
      : undefined
  const manualEmberPalette = manualEmberOverride
    ? options.tone
      ? derivePalette({...palette, colors: {...palette.colors, ...manualEmberOverride}}, options.tone)
      : {...palette.colors, ...manualEmberOverride}
    : undefined
  const chromaFloorScale = clamp(effectiveTone?.chroma ?? 1, 0, 1)
  const colors = deriveAppearancePalette(sourceColors, appearance, darkReference, chromaFloorScale)
  const size = options.size ?? 64
  const study: Study = {
    type: shape.id,
    appearance,
    name: `${shape.name} / ${palette.name}`,
    shapeName: shape.name,
    paletteName: palette.name,
    geometryKey: shape.name,
    p: paletteForType(
      shape.id,
      sourceColors,
      appearance,
      darkReference.colors,
      chromaFloorScale,
      manualEmberPalette,
    ),
    glow: glowForAppearance(
      shape.id,
      appearance,
      sourceColors,
      darkReference.colors,
      chromaFloorScale,
    ),
    innerGlow: innerGlowForAppearance(
      shape.id,
      appearance,
      sourceColors,
      darkReference.colors,
      chromaFloorScale,
    ),
  }

  if (slotOverride) {
    applyAllStudyColorSlots(study, slotOverride)
  } else {
    const appearanceOverride =
      appearanceColorOverrides[`${shape.id}:${palette.id}:${appearance}`]?.colors
    applyBuiltInAppearanceOverride(
      study,
      toneAppearanceOverride(appearanceOverride, options.tone, getPaletteMainHue(palette)),
    )
  }

  const svg = renderSvg(study, {
    variantId: options.variantId ?? 'default',
    drift: options.drift ?? 0,
    size,
    background:
      options.background === undefined && appearance === 'dark' ? '#0b0b0d' : options.background,
    title: options.title ?? `${shape.name} avatar`,
    initials: options.initials,
    initialsColor: options.initialsColor,
  })

  return {
    shape,
    palette,
    colors,
    usedColors: usedColors(study),
    colorSlots: studyColorSlots(study),
    appearance,
    size,
    svg,
    toSvg: () => svg,
    toDataUri: () => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  }
}

export function createAvatar(options: AvatarOptions = {}): AvatarResult {
  const {colorSlots: _colorSlots, ...result} = createAvatarInternal(options)
  return result
}
