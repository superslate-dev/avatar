export type ShapeId = 'prism' | 'veil' | 'ember' | 'zenith' | 'beam' | 'horizon'

export type AvatarAppearance = 'light' | 'dark'

export type PaletteToken =
  | 'base'
  | 'lobe'
  | 'accent'
  | 'pale'
  | 'light'
  | 'warm'
  | 'cool'
  | 'dark'
  | 'beam'

export type PaletteColors = Record<PaletteToken, string>

export interface ShapePreset {
  id: ShapeId
  name: string
  description: string
}

export interface PalettePreset {
  id: string
  name: string
  colors: PaletteColors
}

export interface ToneOptions {
  hue?: number
  chroma?: number
  lightness?: number
}

export interface AvatarOptions {
  shape?: ShapeId
  palette?: string | PalettePreset | PaletteColors
  tone?: ToneOptions
  appearance?: AvatarAppearance
  variantId?: string
  drift?: number
  size?: number
  background?: string | null
  title?: string
  initials?: string
  initialsColor?: string
}

export interface AvatarResult {
  shape: ShapePreset
  palette: PalettePreset
  colors: PaletteColors
  usedColors: readonly string[]
  appearance: AvatarAppearance
  size: number
  svg: string
  toSvg(): string
  toDataUri(): string
}
