import { afterEach, describe, expect, it, vi } from 'vitest'
import { addRankingEntry, formatElapsedTime, loadRanking } from './ranking'

// fetchをモックし、実際のバックエンドAPIへは一切通信しない
function mockFetch(handler: (input: string, init?: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(handler)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(body: unknown, init?: { ok?: boolean }): Response {
  return {
    ok: init?.ok ?? true,
    json: () => Promise.resolve(body),
  } as Response
}

describe('loadRanking', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('GET /rankingの結果をそのまま返す', async () => {
    const entries = [{ timeMs: 12345, catchCount: 3, recordedAt: '2026-01-01T00:00:00.000Z' }]
    const fetchMock = mockFetch(() => jsonResponse(entries))

    expect(await loadRanking()).toEqual(entries)
    expect(fetchMock).toHaveBeenCalledWith('/ranking')
  })

  it('レスポンスが配列でない場合は空配列を返す', async () => {
    mockFetch(() => jsonResponse({ not: 'an array' }))
    expect(await loadRanking()).toEqual([])
  })

  it('配列内に不正な要素が混ざっている場合、その要素だけ除外する', async () => {
    mockFetch(() =>
      jsonResponse([
        { timeMs: 100, catchCount: 2, recordedAt: '2026-01-01T00:00:00.000Z' },
        { invalid: true },
        // catchCountが欠けている旧形式のデータ（issue #99以前）も不正な要素として除外する
        { timeMs: 200, recordedAt: '2026-01-01T00:00:00.000Z' },
        null,
        42,
      ]),
    )
    expect(await loadRanking()).toEqual([{ timeMs: 100, catchCount: 2, recordedAt: '2026-01-01T00:00:00.000Z' }])
  })

  it('レスポンスがエラー（okでない）場合は空配列を返す', async () => {
    mockFetch(() => jsonResponse([], { ok: false }))
    expect(await loadRanking()).toEqual([])
  })

  it('ネットワークエラー等でfetch自体が失敗しても例外を投げず、空配列を返す', async () => {
    mockFetch(() => Promise.reject(new Error('network error')))
    await expect(loadRanking()).resolves.toEqual([])
  })
})

describe('addRankingEntry', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POST /rankingへtimeMs・catchCountを送信し、レスポンスの一覧をそのまま返す', async () => {
    const entries = [{ timeMs: 12345, catchCount: 3, recordedAt: '2026-01-01T00:00:00.000Z' }]
    const fetchMock = mockFetch(() => jsonResponse(entries))

    expect(await addRankingEntry(12345, 3)).toEqual(entries)
    expect(fetchMock).toHaveBeenCalledWith('/ranking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMs: 12345, catchCount: 3 }),
    })
  })

  it('レスポンスがエラー（okでない）場合はnullを返す', async () => {
    mockFetch(() => jsonResponse([], { ok: false }))
    expect(await addRankingEntry(100, 1)).toBeNull()
  })

  it('レスポンスが配列でない場合はnullを返す', async () => {
    mockFetch(() => jsonResponse({ message: 'エラー' }))
    expect(await addRankingEntry(100, 1)).toBeNull()
  })

  it('ネットワークエラー等でfetch自体が失敗しても例外を投げず、nullを返す（ゲームの進行は妨げない）', async () => {
    mockFetch(() => Promise.reject(new Error('network error')))
    await expect(addRankingEntry(100, 1)).resolves.toBeNull()
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
