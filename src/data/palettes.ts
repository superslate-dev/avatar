import type {PaletteColors, PalettePreset} from '../types'

const p = (id: string, name: string, colors: PaletteColors): PalettePreset => ({id, name, colors})

export const palettes = [
  p('blush-quartz', 'Blush Quartz', {base: '#ffdedf', lobe: '#ffaaaa', accent: '#fb4fbc', pale: '#fee9f5', light: '#ffffff', warm: '#ffd9b8', cool: '#7cb2ff', dark: '#031a05', beam: '#57b565'}),
  p('solar-amber', 'Solar Amber', {base: '#ffe1bd', lobe: '#ff9a44', accent: '#ff6044', pale: '#fff2ce', light: '#fffce2', warm: '#ffc744', cool: '#aec6cf', dark: '#cc4e00', beam: '#ffbe74'}),
  p('glacier-mint', 'Glacier Mint', {base: '#d7f5e9', lobe: '#8be8cb', accent: '#49cda9', pale: '#f5ffe9', light: '#ffffff', warm: '#ffe1bd', cool: '#42cba9', dark: '#063a3b', beam: '#93ffd2'}),
  p('electric-iris', 'Electric Iris', {base: '#bdd5ff', lobe: '#ff7ac1', accent: '#ff0084', pale: '#75ecff', light: '#fff8ff', warm: '#ffd6f1', cool: '#7fb1ff', dark: '#16052f', beam: '#71abff'}),
  p('cobalt-iris', 'Cobalt Iris', {base: '#d8c8ff', lobe: '#b7cfff', accent: '#7258ff', pale: '#fffce2', light: '#fff8ff', warm: '#ffd6f1', cool: '#8b72ff', dark: '#6c55b8', beam: '#b077ff'}),
  p('cobalt-frost', 'Cobalt Frost', {base: '#c5d9ff', lobe: '#7fcfff', accent: '#3158b8', pale: '#f7ffe4', light: '#fff1c8', warm: '#fff1c8', cool: '#7fb1ff', dark: '#17356f', beam: '#72dff8'}),
  p('verdigris', 'Verdigris', {base: '#c8eadc', lobe: '#8be8cb', accent: '#39d2a8', pale: '#efffd8', light: '#ffffdf', warm: '#ffe1bd', cool: '#3c8f7f', dark: '#03534f', beam: '#b4f1a9'}),
  p('crimson-coral', 'Crimson Coral', {base: '#ffd7cb', lobe: '#ff79a6', accent: '#ff2f91', pale: '#ffe7d0', light: '#fff5ea', warm: '#ff8fba', cool: '#b7cfff', dark: '#9d0051', beam: '#ffb0d0'}),
  p('citron-dew', 'Citron Dew', {base: '#fff9b8', lobe: '#b4f1a9', accent: '#39d2a8', pale: '#efffd8', light: '#ffffdf', warm: '#ffd95a', cool: '#8be8cb', dark: '#31886d', beam: '#9cffd4'}),
  p('dusk-terracotta', 'Dusk Terracotta', {base: '#ffe0c8', lobe: '#ff9a72', accent: '#8b72ff', pale: '#fff2de', light: '#fff8ff', warm: '#ff7b68', cool: '#b7a8ff', dark: '#5c3aa5', beam: '#d7b1ff'}),
  p('ultraviolet', 'Ultraviolet', {base: '#5531d8', lobe: '#ff43b8', accent: '#ff43b8', pale: '#f3d7ff', light: '#fff8ff', warm: '#ff8ad6', cool: '#5531d8', dark: '#16052f', beam: '#b077ff'}),
  p('abyssal-teal', 'Abyssal Teal', {base: '#118f84', lobe: '#5ed9c3', accent: '#93ffd2', pale: '#d8fff1', light: '#f8fffb', warm: '#ffd29d', cool: '#118f84', dark: '#063a3b', beam: '#93ffd2'}),
  p('ochre-twilight', 'Ochre Twilight', {base: '#ffd29d', lobe: '#ffb75d', accent: '#ffcf87', pale: '#fff2c8', light: '#fff8e8', warm: '#ff8f47', cool: '#70478f', dark: '#70478f', beam: '#ffd071'}),
  p('alpine-coral', 'Alpine Coral', {base: '#c6e7ff', lobe: '#9ce7ad', accent: '#ff7a72', pale: '#f5ffe9', light: '#ffffff', warm: '#ffd5a6', cool: '#65b7ff', dark: '#234c7a', beam: '#93ffd2'}),
  p('cinnabar', 'Cinnabar', {base: '#ffd1c7', lobe: '#ff8971', accent: '#ff3c75', pale: '#fff0d9', light: '#fffaf4', warm: '#ffbb61', cool: '#9fd9ff', dark: '#8c2450', beam: '#ffb4c8'}),
  p('acid-lilac', 'Acid Lilac', {base: '#e3d3ff', lobe: '#c8f67c', accent: '#9b72ff', pale: '#f6ffd1', light: '#ffffff', warm: '#fff191', cool: '#9ed6ff', dark: '#50408f', beam: '#c8ff90'}),
  p('cyan-magenta', 'Cyan Magenta', {base: '#c7f8ff', lobe: '#9c8cff', accent: '#ff64c8', pale: '#eaffff', light: '#ffffff', warm: '#ffcfe8', cool: '#57d5ff', dark: '#26327a', beam: '#9cf5ff'}),
  p('moss-light', 'Moss Light', {base: '#f7ffd8', lobe: '#a5e6a3', accent: '#58c983', pale: '#ffffdf', light: '#ffffff', warm: '#ffe7a6', cool: '#b7d9ff', dark: '#3b7a55', beam: '#c7ff9d'}),
  p('amethyst-gold', 'Amethyst Gold', {base: '#d7b7e8', lobe: '#ffc86b', accent: '#8e54ff', pale: '#fff0c8', light: '#fff8ef', warm: '#ffc65a', cool: '#9b72ff', dark: '#47245f', beam: '#ffdf88'}),
  p('frost-orchid', 'Frost Orchid', {base: '#d5f0ff', lobe: '#ff8ab8', accent: '#dd4bff', pale: '#f2f9ff', light: '#ffffff', warm: '#ffd7e7', cool: '#7fd7ff', dark: '#2a376e', beam: '#bcecff'}),
  p('copper-sage', 'Copper Sage', {base: '#ffe0bd', lobe: '#8fe5c0', accent: '#ff8a3d', pale: '#f6ffe4', light: '#ffffff', warm: '#ffc26e', cool: '#6fd8bf', dark: '#4d715c', beam: '#bfffe2'}),
  p('azure-rose', 'Azure Rose', {base: '#d8e0ff', lobe: '#ff97d7', accent: '#4879ff', pale: '#fff1fb', light: '#ffffff', warm: '#ffd7ee', cool: '#71abff', dark: '#223584', beam: '#85e6ff'}),
  p('ruby-silk', 'Ruby Silk', {base: '#ffd9e8', lobe: '#ff5ea8', accent: '#e90075', pale: '#fff4d8', light: '#fffdf0', warm: '#ffb877', cool: '#d9c8ff', dark: '#7d1349', beam: '#ffaad0'}),
  p('meadow-gold', 'Meadow Gold', {base: '#ddffd8', lobe: '#7ee7a5', accent: '#ffcf4d', pale: '#ffffd7', light: '#ffffff', warm: '#ffd76a', cool: '#86d7ff', dark: '#23734d', beam: '#c8ff72'}),
  p('scarlet-ember', 'Scarlet Ember', {base: '#ffd2a6', lobe: '#ff6d5c', accent: '#ff2f91', pale: '#ffeec9', light: '#fff8e8', warm: '#ffb13d', cool: '#8d98ff', dark: '#813047', beam: '#ffc469'}),
  p('silver-slate', 'Silver Slate', {base: '#edf0ff', lobe: '#d8c8ff', accent: '#93b4ff', pale: '#fffbe7', light: '#ffffff', warm: '#ffe7c6', cool: '#b6cfff', dark: '#4d5a7f', beam: '#d4e8ff'}),
  p('mineral-rose', 'Mineral Rose', {base: '#d7fff0', lobe: '#ff99ba', accent: '#40c7a5', pale: '#f7ffe8', light: '#ffffff', warm: '#ffd7d0', cool: '#79e1d2', dark: '#1f6f67', beam: '#a4ffe8'}),
  p('midnight-cobalt', 'Midnight Cobalt', {base: '#d4d9ff', lobe: '#927bff', accent: '#4d2dce', pale: '#edf5ff', light: '#ffffff', warm: '#ffd6f1', cool: '#74b8ff', dark: '#231857', beam: '#95d7ff'}),
  p('saffron-violet', 'Saffron Violet', {base: '#ffe4a8', lobe: '#ff9d4d', accent: '#855fff', pale: '#fff4d0', light: '#fff8ef', warm: '#ffbd56', cool: '#ad9cff', dark: '#5f3f87', beam: '#ffd87d'}),
  p('phosphor-pine', 'Phosphor Pine', {base: '#9edfc9', lobe: '#54c7a8', accent: '#83ffb5', pale: '#e6fff1', light: '#ffffff', warm: '#ffd08a', cool: '#2fae98', dark: '#073830', beam: '#83ffb5'}),
  p('pastel-prism', 'Pastel Prism', {base: '#ffd5f0', lobe: '#a7d8ff', accent: '#ff5fc7', pale: '#f8edff', light: '#ffffff', warm: '#ffd4e7', cool: '#8cc8ff', dark: '#763069', beam: '#bdefff'}),
  p('chartreuse-wave', 'Chartreuse Wave', {base: '#ecffd0', lobe: '#a7ef63', accent: '#36cdb2', pale: '#ffffd9', light: '#ffffff', warm: '#ffe889', cool: '#80ddff', dark: '#3e7c3a', beam: '#c6ff7e'}),
  p('garnet-velvet', 'Garnet Velvet', {base: '#ffcad6', lobe: '#b54475', accent: '#ff3f7f', pale: '#ffe5c8', light: '#fff2e7', warm: '#ffae5e', cool: '#7b62d9', dark: '#2a0714', beam: '#ff86aa'}),
  p('opal-ice', 'Opal Ice', {base: '#e6fff8', lobe: '#b8f4df', accent: '#82d8ff', pale: '#fffce7', light: '#ffffff', warm: '#ffe8c2', cool: '#97e2ff', dark: '#4b7c78', beam: '#d0fff0'}),
  p('rosewood-mist', 'Rosewood Mist', {base: '#ffe0d6', lobe: '#d7b5ff', accent: '#ff7f95', pale: '#fff1e5', light: '#ffffff', warm: '#ffbf8c', cool: '#bca8ff', dark: '#74568f', beam: '#ffc6dd'}),
  p('plasma-cyan', 'Plasma Cyan', {base: '#ccf4ff', lobe: '#62d9ff', accent: '#ff7a32', pale: '#fff0d8', light: '#ffffff', warm: '#ffad58', cool: '#3ccfff', dark: '#135078', beam: '#9ff7ff'}),
  p('velvet-orchid', 'Velvet Orchid', {base: '#8b72ff', lobe: '#ff6fcb', accent: '#ff3fb4', pale: '#ead7ff', light: '#fff8ff', warm: '#ff9ccf', cool: '#6e55d9', dark: '#12072c', beam: '#c38bff'}),
  p('sage-blush', 'Sage Blush', {base: '#e7ffd7', lobe: '#a4e7a0', accent: '#ff8eb0', pale: '#fff7d6', light: '#ffffff', warm: '#ffd0b1', cool: '#98d9c2', dark: '#4a7a51', beam: '#ccffa2'}),
  p('tropic-brass', 'Tropic Brass', {base: '#bff2e8', lobe: '#45c1b2', accent: '#ffc14d', pale: '#fff4c8', light: '#ffffff', warm: '#ffd66b', cool: '#3ab7e4', dark: '#07545a', beam: '#93ffd2'}),
  p('horizon-sand', 'Horizon Sand', {base: '#fff2c8', lobe: '#b9d9ff', accent: '#ff9d5c', pale: '#ffffe8', light: '#ffffff', warm: '#ffd68f', cool: '#8fc8ff', dark: '#4b638c', beam: '#d4ebff'}),
] as const satisfies readonly PalettePreset[]

export function getPalette(
  palette: string | PalettePreset | PaletteColors = 'blush-quartz',
): PalettePreset {
  if (typeof palette === 'string') {
    return palettes.find(item => item.id === palette || item.name === palette) ?? palettes[0]
  }

  if ('colors' in palette) {
    return palette
  }

  return {
    id: 'custom',
    name: 'Custom',
    colors: palette,
  }
}
