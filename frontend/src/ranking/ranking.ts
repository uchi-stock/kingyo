export interface RankingEntry {
  timeMs: number
  // 記録達成までに捕獲できた金魚の数（issue #99）
  catchCount: number
  recordedAt: string
}

// 全員共通のランキングをバックエンドAPI（issue #110, #112）で永続化する。
// localStorageのみで永続化していた旧実装（issue #89, #99）は、iOSでホーム画面の
// アイコンを削除→再追加すると保存領域が作り直され記録が失われる問題があった（issue #110）
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

function isRankingEntry(value: unknown): value is RankingEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RankingEntry).timeMs === 'number' &&
    typeof (value as RankingEntry).catchCount === 'number' &&
    typeof (value as RankingEntry).recordedAt === 'string'
  )
}

// バックエンドAPI（GET /ranking）から記録一覧を読み込む。ネットワーク障害・APIの
// 不調・不正なレスポンス形式の場合は空配列を返し、ゲーム自体はプレイできるようにする
export async function loadRanking(): Promise<RankingEntry[]> {
  try {
    const response = await fetch(apiUrl('/ranking'))
    if (!response.ok) {
      return []
    }
    const data: unknown = await response.json()
    return Array.isArray(data) ? data.filter(isRankingEntry) : []
  } catch {
    return []
  }
}

// 新しい記録をバックエンドAPI（POST /ranking）へ追加し、更新後のランキング
// （記録時間の降順・上位10件、並び替え・切り詰めはサーバー側で行う）を返す。
// ポイが破れてタイマーが停止した時点で呼ぶ想定。catchCountはそれまでに捕獲できた
// 金魚の数（issue #99）。API呼び出しに失敗した場合はnullを返す。呼び出し側
// （App.tsx）はこの場合、直前の表示済みランキングをそのまま保持する（ゲームの
// 進行自体は妨げない。issue #110）
export async function addRankingEntry(timeMs: number, catchCount: number): Promise<RankingEntry[] | null> {
  try {
    const response = await fetch(apiUrl('/ranking'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMs, catchCount }),
    })
    if (!response.ok) {
      return null
    }
    const data: unknown = await response.json()
    return Array.isArray(data) && data.every(isRankingEntry) ? data : null
  } catch {
    return null
  }
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
