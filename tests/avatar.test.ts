import {describe, expect, it} from 'bun:test'
import {
  createAvatar,
  darkReferencePalette,
  deriveAppearancePalette,
  derivePalette,
  hexToOklch,
  palettes,
  relativeSrgbChroma,
  shapes,
} from '../src'
import {darkShapeAnchors} from '../src/data/dark-appearance'
import {darkEmberPaletteOverrides} from '../src/data/dark-ember-palettes'
import {appearanceColorOverrides} from '../src/data/appearance-overrides'
import {deriveDarkAnchorColor} from '../src/color/appearance'

function layerGeometry(svg: string): string[] {
  return [
    ...svg.matchAll(
      /<g transform="([^"]+)"><rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" rx="([^"]+)"/g,
    ),
  ].map(match => match.slice(1).join('|'))
}

function hueDistance(a: number, b: number): number {
  const distance = Math.abs(a - b) % 360
  return Math.min(distance, 360 - distance)
}

describe('@superslate/avatar', () => {
  it('ships six shape families and forty palette presets', () => {
    expect(shapes).toHaveLength(6)
    expect(palettes).toHaveLength(40)
  })

  it('creates a fixed 64x64 SVG by default', () => {
    const avatar = createAvatar({shape: 'prism', palette: 'blush-quartz'})
    expect(avatar.svg).toContain('width="64"')
    expect(avatar.svg).toContain('height="64"')
    expect(avatar.svg).toContain('<clipPath')
    expect(avatar.svg).not.toContain('drop-shadow')
  })

  it('renders escaped initials above the filtered artwork', () => {
    const avatar = createAvatar({
      shape: 'ember',
      appearance: 'dark',
      background: null,
      initials: '<&Z',
    })
    const textIndex = avatar.svg.indexOf('<text')
    const filteredArtworkEnd = avatar.svg.indexOf('</g></g>')

    expect(avatar.svg).toContain('>&lt;&amp;</text>')
    expect(avatar.svg).toContain('fill="#ffffff" fill-opacity="0.92"')
    expect(textIndex).toBeGreaterThan(filteredArtworkEnd)
  })

  it('keeps initials defaults appearance-aware and supports a color override', () => {
    const light = createAvatar({initials: 'ss', background: null}).svg
    const custom = createAvatar({initials: '🫶🏽a', initialsColor: '#abcdef', background: null}).svg

    expect(light).toContain('>SS</text>')
    expect(light).toContain('fill="#1c1c1c" fill-opacity="0.78"')
    expect(custom).toContain('fill="#abcdef"')
    expect(custom).toContain('>🫶🏽A</text>')
  })

  it('uses size as display scale without recalculating internal geometry', () => {
    const options = {
      shape: 'ember' as const,
      palette: 'blush-quartz',
      appearance: 'dark' as const,
      variantId: 'scale',
      drift: 8,
      background: null,
    }
    const small = createAvatar({...options, size: 64}).svg
    const large = createAvatar({...options, size: 192}).svg
    const normalizeOuterSize = (svg: string): string =>
      svg.replace(/<svg([^>]*?)width="\d+" height="\d+"/, '<svg$1width="SIZE" height="SIZE"')

    expect(large).toContain('width="192" height="192" viewBox="0 0 64 64"')
    expect(normalizeOuterSize(large)).toBe(normalizeOuterSize(small))
  })

  it('derives the whole palette through OKLCH tone controls', () => {
    const original = palettes[0]
    const shifted = derivePalette(original, {hue: 180, chroma: 0.8, lightness: 0.04})
    expect(shifted.accent).toMatch(/^#[0-9a-f]{6}$/)
    expect(shifted.accent).not.toBe(original.colors.accent)
    expect(shifted.base).not.toBe(original.colors.base)
  })

  it('applies zero relative chroma to every painted dark color', () => {
    const avatar = createAvatar({
      shape: 'ember',
      palette: 'citron-dew',
      appearance: 'dark',
      tone: {chroma: 0},
      background: null,
    })
    for (const color of avatar.usedColors) {
      expect(relativeSrgbChroma(hexToOklch(color))).toBeLessThan(0.01)
    }
  })

  it('keeps variant output deterministic', () => {
    const first = createAvatar({shape: 'beam', palette: 'abyssal-teal', variantId: 'same', drift: 12}).svg
    const second = createAvatar({shape: 'beam', palette: 'abyssal-teal', variantId: 'same', drift: 12}).svg
    const third = createAvatar({shape: 'beam', palette: 'abyssal-teal', variantId: 'other', drift: 12}).svg
    expect(first).toBe(second)
    expect(first).not.toBe(third)
  })

  it('uses the dark reference palette as the zero-offset dark appearance', () => {
    expect(deriveAppearancePalette(palettes[0], 'dark')).toEqual(darkReferencePalette)
  })

  it('renders the configured dark anchors for the reference palette', () => {
    const references: Record<string, string> = {
      prism: 'blush-quartz',
      veil: 'blush-quartz',
      ember: 'solar-amber',
      zenith: 'electric-iris',
      beam: 'blush-quartz',
      horizon: 'verdigris',
    }
    const expected: Record<string, string[]> = {
      prism: ['#ffeaeb', '#ffa0a0', '#eb00a9', '#e22775', '#ff25a1', '#ffb58e'],
      veil: ['#0047c3', '#b4a3ff', '#9086ff', '#1400ae', '#6d56ff', '#4430ff'],
      ember: ['#9d3a00', '#e87d00', '#ffdc78', '#ffe842', '#e9af00', '#e92b00', '#fa9e00', '#ffc2b9', '#ededed'],
      zenith: ['#6550b9', '#ffffff', '#ff0084', '#6aa7ff'],
      beam: ['#031a05', '#4229ff', '#57b565', '#000000'],
      horizon: ['#00a181', '#ceff71', '#fcf500', '#26ca9d', '#004536', '#fefefe'],
    }
    for (const shape of shapes) {
      const svg = createAvatar({
        shape: shape.id,
        palette: references[shape.id]!,
        appearance: 'dark',
        background: null,
      }).svg
      for (const color of expected[shape.id]!) expect(svg).toContain(color)
    }
  })

  it('derives dark saturation from relative sRGB chroma', () => {
    const muted = relativeSrgbChroma(hexToOklch('#fff2ce'))
    const vivid = relativeSrgbChroma(hexToOklch('#ff6044'))
    expect(muted).toBeGreaterThanOrEqual(0)
    expect(vivid).toBeLessThanOrEqual(1)
    expect(vivid).toBeGreaterThan(muted)

    const reference = createAvatar({
      shape: 'ember',
      palette: 'solar-amber',
      appearance: 'dark',
      background: null,
    }).svg
    expect(reference).toContain('#e87d00')
    expect(reference).toContain('#ffdc78')
    expect(reference).toContain('#ffe842')
    expect(reference).toContain('#e9af00')
  })

  it('preserves every shape layer geometry between light and dark appearances', () => {
    for (const shape of shapes) {
      const light = createAvatar({shape: shape.id, palette: 'scarlet-ember', variantId: 'theme', drift: 0}).svg
      const dark = createAvatar({
        shape: shape.id,
        palette: 'scarlet-ember',
        variantId: 'theme',
        drift: 0,
        appearance: 'dark',
      }).svg
      expect(layerGeometry(dark)).toEqual(layerGeometry(light))
      expect(dark).not.toBe(light)
    }
  })

  it('keeps browser-faithful dark effect structure and full layer opacity', () => {
    const prism = createAvatar({shape: 'prism', palette: 'blush-quartz', appearance: 'dark', background: null, drift: 0}).svg
    const veil = createAvatar({shape: 'veil', palette: 'blush-quartz', appearance: 'dark', background: null, drift: 0}).svg
    const ember = createAvatar({shape: 'ember', palette: 'solar-amber', appearance: 'dark', background: null, drift: 0}).svg

    expect(prism).toMatch(/filter="url\(#dark-frame-av-[a-z0-9]+\)"/)
    expect(prism).not.toContain('feTurbulence')
    expect(prism).toContain('stdDeviation="3.224692"')
    expect(prism).toContain('flood-color="#ffb58e" flood-opacity="1"')
    expect(prism).toContain('flood-color="#ff25a1" flood-opacity="1"')
    expect(prism).toContain('flood-color="#e22775" flood-opacity="1"')
    expect(prism).not.toContain('opacity="0.860"')
    expect(prism).toContain('<rect width="64" height="64" rx="32" fill="#ffffff"/>')
    expect(prism).toContain('mask="url(#edge-mask-')
    expect(prism).toContain('stop-opacity="0"')
    expect(prism).not.toContain('shape-rendering="geometricPrecision"')
    expect(ember).toContain('flood-color="#fa9e00" flood-opacity="0.72"')
    expect(ember).toContain('flood-color="#ffc2b9" flood-opacity="0.58"')
    expect(ember).toContain('flood-color="#ededed" flood-opacity="0.32"')
    expect(ember).toContain('stdDeviation="5.614035"')
    expect(ember).toContain('stdDeviation="2.245614"')
    expect(ember).toContain('stdDeviation="1.122807"')
    expect(ember).not.toContain('feTurbulence')
    expect(veil).toContain('gradientTransform="translate(-0.03 -15.355) rotate(89.9503) scale(36.7093 41.0794)"')
    expect(veil).toContain('stdDeviation="12.698412"')
  })

  it('reports the colors actually painted by the selected dark shape', () => {
    const ember = createAvatar({shape: 'ember', palette: 'garnet-velvet', appearance: 'dark', background: null})
    const light = createAvatar({shape: 'ember', palette: 'garnet-velvet', appearance: 'light', background: null})
    expect(ember.usedColors).toHaveLength(9)
    expect(light.usedColors).toHaveLength(9)
    for (const color of ember.usedColors) expect(ember.svg).toContain(color)
    for (const color of light.usedColors) expect(light.svg).toContain(color)
    expect(ember.usedColors).not.toContain(ember.colors.beam)
  })

  it('keeps derived middle colors above their relative-chroma floors', () => {
    const garnetVelvet = palettes.find(palette => palette.id === 'garnet-velvet')!
    const derived = deriveAppearancePalette(garnetVelvet, 'dark')
    expect(relativeSrgbChroma(hexToOklch(derived.lobe))).toBeGreaterThanOrEqual(0.98)
    expect(relativeSrgbChroma(hexToOklch(derived.accent))).toBeGreaterThanOrEqual(0.98)
    expect(relativeSrgbChroma(hexToOklch(derived.beam))).toBeGreaterThanOrEqual(0.98)
  })

  it('keeps Ember derivative layers semantically separated', () => {
    const ember = createAvatar({shape: 'ember', palette: 'acid-lilac', appearance: 'dark', background: null})
    expect(new Set(ember.usedColors.slice(0, 6)).size).toBeGreaterThanOrEqual(5)
  })

  it('derives every visible dark Ember layer from its matching light layer', () => {
    for (const palette of palettes) {
      if (appearanceColorOverrides[`ember:${palette.id}:dark`]) continue
      const light = createAvatar({shape: 'ember', palette, appearance: 'light', background: null, drift: 0})
      const dark = createAvatar({shape: 'ember', palette, appearance: 'dark', background: null, drift: 0})

      for (const index of [1, 2, 4, 5]) {
        const lightColor = hexToOklch(light.usedColors[index]!)
        const darkColor = hexToOklch(dark.usedColors[index]!)
        expect(darkColor.l).toBeLessThan(lightColor.l)
        if (
          palette.id !== 'solar-amber' &&
          !darkEmberPaletteOverrides[palette.id] &&
          lightColor.c >= 0.006 &&
          darkColor.c >= 0.03 &&
          darkColor.l > 0.06
        ) {
          expect(hueDistance(darkColor.h, lightColor.h)).toBeLessThan(4)
        }
      }
    }
  })

  it('uses hand-authored dark Ember palettes for all forty palettes', () => {
    expect(Object.keys(darkEmberPaletteOverrides)).toHaveLength(40)
    expect(Object.keys(darkEmberPaletteOverrides).sort()).toEqual(palettes.map(palette => palette.id).sort())
    for (const [palette, colors] of Object.entries(darkEmberPaletteOverrides)) {
      const ember = createAvatar({shape: 'ember', palette, appearance: 'dark', background: null, drift: 0})
      const override = appearanceColorOverrides[`ember:${palette}:dark`]?.colors
      expect(ember.usedColors.slice(0, 6)).toEqual(
        override
          ? [1, 2, 3, 4, 5, 6].map(index => override[`layer.${index}`]!)
          : [colors!.dark, colors!.lobe, colors!.pale, colors!.light, colors!.warm, colors!.accent],
      )
    }
  })

  it('applies promoted appearance overrides to their exact painted slots', () => {
    expect(Object.keys(appearanceColorOverrides)).toHaveLength(76)
    for (const [key, override] of Object.entries(appearanceColorOverrides)) {
      const [shape, palette, appearance] = key.split(':')
      const avatar = createAvatar({
        shape: shape as 'prism' | 'ember' | 'horizon',
        palette,
        appearance: appearance as 'dark',
        background: null,
        drift: 0,
      })
      const colors = override.colors
      const expectedLayers =
        shape === 'prism'
          ? [
              colors['layer.1'],
              colors['layer.2'],
              colors['layer.3'],
              colors['layer.1'],
              colors['layer.2'],
              colors['layer.3'],
            ]
          : [1, 2, 3, 4, 5, 6].map(index => colors[`layer.${index}`])
      expect(avatar.usedColors).toEqual([
        ...(expectedLayers as string[]),
        colors['frame.wide']!,
        colors['frame.medium']!,
        colors['frame.narrow']!,
      ])
      for (const slotKey of ['inner.wide', 'inner.medium', 'inner.narrow']) {
        if (colors[slotKey]) expect(avatar.svg).toContain(colors[slotKey]!)
      }
    }
  })

  it('maps dark Ember layers to their matching light roles', () => {
    const ember = darkShapeAnchors.ember
    expect(
      Object.fromEntries(Object.entries(ember.layers).map(([name, anchor]) => [name, anchor.token])),
    ).toEqual({
      dark: 'dark',
      base: 'lobe',
      cream1: 'pale',
      cream2: 'light',
      hot1: 'warm',
      hot2: 'accent',
    })
    expect([ember.frameGlow.narrow.token, ember.frameGlow.medium.token, ember.frameGlow.wide.token]).toEqual([
      'light',
      'pale',
      'beam',
    ])
  })

  it('keeps a derived palette token hues consistent across dark shapes', () => {
    const citronDew = palettes.find(palette => palette.id === 'citron-dew')!
    const samples = [
      {shape: 'ember' as const, layer: 'cream1'},
      {shape: 'veil' as const, layer: 'warm'},
      {shape: 'prism' as const, layer: 'blob'},
    ]

    for (const sample of samples) {
      const shape = darkShapeAnchors[sample.shape]
      const anchor = shape.layers[sample.layer]!
      const reference = palettes.find(palette => palette.id === shape.lightReference)!
      const derived = hexToOklch(deriveDarkAnchorColor(anchor, citronDew.colors, reference.colors))
      const target = hexToOklch(citronDew.colors[anchor.token])
      expect(hueDistance(derived.h, target.h)).toBeLessThan(4)
    }
  })

  it('preserves light palette contrast in matching dark layers', () => {
    const cobaltFrost = palettes.find(palette => palette.id === 'cobalt-frost')!
    const pastelPrism = palettes.find(palette => palette.id === 'pastel-prism')!
    const lightDelta = Math.abs(hexToOklch(cobaltFrost.colors.lobe).l - hexToOklch(pastelPrism.colors.lobe).l)
    const cobaltFrostDark = createAvatar({shape: 'ember', palette: cobaltFrost, appearance: 'dark', background: null})
    const pastelPrismDark = createAvatar({shape: 'ember', palette: pastelPrism, appearance: 'dark', background: null})
    const darkDelta = Math.abs(
      hexToOklch(cobaltFrostDark.usedColors[1]!).l - hexToOklch(pastelPrismDark.usedColors[1]!).l,
    )

    expect(darkDelta / lightDelta).toBeGreaterThan(0.8)
  })

  it('uses the authored dark Ember preset as its default', () => {
    const ember = createAvatar({shape: 'ember', palette: 'cobalt-frost', appearance: 'dark', background: null})
    const colors = darkEmberPaletteOverrides['cobalt-frost']!
    expect(ember.usedColors.slice(0, 6)).toEqual([
      colors.dark,
      colors.lobe,
      colors.pale,
      colors.light,
      colors.warm,
      colors.accent,
    ])
  })

  it('uses the tuned dark Prism derivative as its default', () => {
    const defaultPrism = createAvatar({shape: 'prism', palette: 'acid-lilac', appearance: 'dark', background: null})
    const tunedPrism = createAvatar({
      shape: 'prism',
      palette: 'acid-lilac',
      appearance: 'dark',
      tone: {chroma: 1, lightness: -0.1},
      background: null,
    })
    expect(defaultPrism.usedColors).toEqual(tunedPrism.usedColors)
  })

  it('uses a dark default canvas while preserving explicit transparency', () => {
    const opaque = createAvatar({appearance: 'dark'}).svg
    const transparent = createAvatar({appearance: 'dark', background: null}).svg
    expect(opaque).toContain('fill="#0b0b0d"')
    expect(transparent).not.toContain('fill="#0b0b0d"')
  })
})
