export interface RankingEntry {
  timeMs: number
  recordedAt: string
}

const STORAGE_KEY = 'kingyo-ranking'
const MAX_ENTRIES = 10 // 保持する記録の上限件数

function isLocalStorageAvailable(): boolean {
  return typeof localStorage !== 'undefined'
}

function isRankingEntry(value: unknown): value is RankingEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RankingEntry).timeMs === 'number' &&
    typeof (value as RankingEntry).recordedAt === 'string'
  )
}

// localStorageから記録一覧を読み込む。localStorageが使えない環境（テスト環境等）や、
// 保存内容が壊れている場合は空配列を返し、機能全体には影響させない
export function loadRanking(): RankingEntry[] {
  if (!isLocalStorageAvailable()) {
    return []
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(isRankingEntry)
  } catch {
    return []
  }
}

// 新しい記録を追加し、記録時間の降順（長く遊べたほど上位）に並べ替えた上で
// 上位MAX_ENTRIES件のみを保存する。ポイが破れてタイマーが停止した時点で呼ぶ想定
export function addRankingEntry(timeMs: number): RankingEntry[] {
  const entries = loadRanking()
  entries.push({ timeMs, recordedAt: new Date().toISOString() })
  entries.sort((a, b) => b.timeMs - a.timeMs)
  const trimmed = entries.slice(0, MAX_ENTRIES)

  if (isLocalStorageAvailable()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      // ストレージ容量超過等で保存に失敗しても、今回のプレイ自体には影響させない
    }
  }
  return trimmed
}

// 経過時間（ミリ秒）を"mm:ss.s"形式の文字列にする
export function formatElapsedTime(ms: number): string {
  const totalDeciseconds = Math.max(0, Math.floor(ms / 100))
  const minutes = Math.floor(totalDeciseconds / 600)
  const seconds = Math.floor((totalDeciseconds % 600) / 10)
  const deciseconds = totalDeciseconds % 10
  const pad2 = (value: number) => String(value).padStart(2, '0')
  return `${pad2(minutes)}:${pad2(seconds)}.${deciseconds}`
}
