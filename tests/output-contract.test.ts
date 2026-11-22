import {describe, expect, it} from 'bun:test'
import {createAvatar} from '../src/index'
import type {AvatarAppearance, ShapeId} from '../src/types'

function extractIds(svg: string): string[] {
  return [...svg.matchAll(/ id="([^"]+)"/g)].map(match => match[1] ?? '')
}

describe('inline SVG id safety', () => {
  it('keeps every def id unique inside a single avatar', () => {
    for (const appearance of ['light', 'dark'] as const) {
      const avatar = createAvatar({shape: 'ember', palette: 'electric-iris', appearance})
      const ids = extractIds(avatar.svg)
      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('never shares ids between different avatars rendered into the same document', () => {
    const a = createAvatar({shape: 'prism', palette: 'blush-quartz'})
    const b = createAvatar({shape: 'prism', palette: 'glacier-mint'})
    const c = createAvatar({shape: 'zenith', palette: 'blush-quartz', appearance: 'dark'})
    const idsA = new Set(extractIds(a.svg))
    for (const other of [b, c]) {
      const shared = extractIds(other.svg).filter(id => idsA.has(id))
      expect(shared).toEqual([])
    }
  })

  it('resolves every internal url(#...) reference against its own defs', () => {
    const avatar = createAvatar({
      shape: 'beam',
      palette: 'ultraviolet',
      appearance: 'dark',
      variantId: 'ref-check',
    })
    const ids = new Set(extractIds(avatar.svg))
    const references = [...avatar.svg.matchAll(/url\(#([^)]+)\)/g)].map(match => match[1] ?? '')
    expect(references.length).toBeGreaterThan(0)
    for (const reference of references) {
      expect(ids).toContain(reference)
    }
  })

  it('uses neutral brand-free def ids', () => {
    const avatar = createAvatar({shape: 'prism', palette: 'blush-quartz', appearance: 'dark'})
    expect(avatar.svg).not.toMatch(/superslate|oreo/i)
  })
})

describe('golden output', () => {
  const cases: Array<[ShapeId, string, AvatarAppearance]> = [
    ['prism', 'blush-quartz', 'light'],
    ['veil', 'cobalt-iris', 'light'],
    ['ember', 'electric-iris', 'dark'],
    ['zenith', 'alpine-coral', 'light'],
    ['beam', 'ultraviolet', 'dark'],
    ['horizon', 'verdigris', 'dark'],
  ]

  it.each(cases)('locks %s / %s / %s', (shape, palette, appearance) => {
    const avatar = createAvatar({shape, palette, appearance, variantId: 'golden', drift: 8})
    expect(avatar.svg).toMatchSnapshot()
  })
})
