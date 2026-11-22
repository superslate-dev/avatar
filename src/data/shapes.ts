import type {ShapeId, ShapePreset} from '../types'

export const shapes = [
  {
    id: 'prism',
    name: 'Prism',
    description: 'Diagonal paired band with concentrated edge glows.',
  },
  {
    id: 'veil',
    name: 'Veil',
    description: 'Luminous haze with a soft upper cloud and cool base.',
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Soft full wash anchored by an off-center radiant core.',
  },
  {
    id: 'zenith',
    name: 'Zenith',
    description: 'Saturated upper arc, luminous band, and cool lower field.',
  },
  {
    id: 'beam',
    name: 'Beam',
    description: 'Deep field split by a focused horizontal light core.',
  },
  {
    id: 'horizon',
    name: 'Horizon',
    description: 'Even field lifted by a rising lower-edge aura.',
  },
] as const satisfies readonly ShapePreset[]

export function getShape(id: ShapeId = 'prism'): ShapePreset {
  return shapes.find(shape => shape.id === id) ?? shapes[0]
}
