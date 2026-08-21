import { describe, expect, it } from 'vitest'
import { orientationToPoiPosition } from './poiPosition'

describe('orientationToPoiPosition', () => {
  it('傾きがない場合は中央になる', () => {
    expect(orientationToPoiPosition({ beta: 0, gamma: 0 })).toEqual({
      xPercent: 50,
      yPercent: 50,
      angleDeg: 0,
    })
  })

  it('値がnullの場合は傾きなしとして扱う', () => {
    expect(orientationToPoiPosition({ beta: null, gamma: null })).toEqual({
      xPercent: 50,
      yPercent: 50,
      angleDeg: 0,
    })
  })

  it('可動域の上限を超える傾きは45度にクランプされる', () => {
    expect(orientationToPoiPosition({ beta: 90, gamma: 90 })).toEqual({
      xPercent: 100,
      yPercent: 100,
      angleDeg: 45,
    })
  })

  it('可動域の下限を超える傾きは-45度にクランプされる', () => {
    expect(orientationToPoiPosition({ beta: -90, gamma: -90 })).toEqual({
      xPercent: 0,
      yPercent: 0,
      angleDeg: -45,
    })
  })

  it('betaとgammaが独立してxPercent・yPercentに反映される', () => {
    expect(orientationToPoiPosition({ beta: -45, gamma: 45 })).toEqual({
      xPercent: 100,
      yPercent: 0,
      angleDeg: 45,
    })
  })
})
