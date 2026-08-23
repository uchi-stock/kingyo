import { afterEach, describe, expect, it, vi } from 'vitest'
import { addRankingEntry, formatElapsedTime, loadRanking } from './ranking'

const STORAGE_KEY = 'kingyo-ranking'

describe('loadRanking / addRankingEntry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('記録が無い場合は空配列を返す', () => {
    expect(loadRanking()).toEqual([])
  })

  it('記録を追加すると、localStorageに保存されて読み込める', () => {
    addRankingEntry(12345, 3)
    const entries = loadRanking()
    expect(entries).toHaveLength(1)
    expect(entries[0].timeMs).toBe(12345)
    expect(entries[0].catchCount).toBe(3)
    expect(typeof entries[0].recordedAt).toBe('string')
  })

  it('記録時間が長い順（降順）に並べ替えられる', () => {
    addRankingEntry(1000, 1)
    addRankingEntry(3000, 3)
    addRankingEntry(2000, 2)
    const entries = loadRanking()
    expect(entries.map((entry) => entry.timeMs)).toEqual([3000, 2000, 1000])
    expect(entries.map((entry) => entry.catchCount)).toEqual([3, 2, 1])
  })

  it('上位10件を超える記録は切り捨てられる', () => {
    for (let i = 0; i < 12; i += 1) {
      addRankingEntry(i, i)
    }
    const entries = loadRanking()
    expect(entries).toHaveLength(10)
    // 上位10件は11, 10, 9, ..., 2（降順）のはず
    expect(entries.map((entry) => entry.timeMs)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  })

  it('保存内容が壊れている（JSONとして不正）場合は空配列を返す', () => {
    localStorage.setItem(STORAGE_KEY, '不正なJSON')
    expect(loadRanking()).toEqual([])
  })

  it('保存内容が配列でない場合は空配列を返す', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: 'an array' }))
    expect(loadRanking()).toEqual([])
  })

  it('配列内に不正な要素が混ざっている場合、その要素だけ除外する', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { timeMs: 100, catchCount: 2, recordedAt: '2026-01-01T00:00:00.000Z' },
        { invalid: true },
        // catchCountが欠けている旧形式のデータ（issue #99以前）も不正な要素として除外する
        { timeMs: 200, recordedAt: '2026-01-01T00:00:00.000Z' },
        null,
        42,
      ]),
    )
    const entries = loadRanking()
    expect(entries).toEqual([{ timeMs: 100, catchCount: 2, recordedAt: '2026-01-01T00:00:00.000Z' }])
  })

  it('localStorageが利用できない環境でも例外を投げない', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => loadRanking()).not.toThrow()
    expect(loadRanking()).toEqual([])
    expect(() => addRankingEntry(100, 1)).not.toThrow()
  })
})

describe('formatElapsedTime', () => {
  it('1分未満は00:ss.d形式になる', () => {
    expect(formatElapsedTime(5432)).toBe('00:05.4')
  })

  it('1分以上はmm:ss.d形式になる', () => {
    expect(formatElapsedTime(65432)).toBe('01:05.4')
  })

  it('0ミリ秒は00:00.0になる', () => {
    expect(formatElapsedTime(0)).toBe('00:00.0')
  })

  it('負の値でも例外を投げず00:00.0扱いになる', () => {
    expect(formatElapsedTime(-100)).toBe('00:00.0')
  })
})
