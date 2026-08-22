import { formatElapsedTime, type RankingEntry } from '../ranking/ranking'

export interface RankingListProps {
  entries: RankingEntry[]
}

// ランキング（記録時間の降順）を表示する。並び替え自体はranking.ts側（addRankingEntry）の
// 責務であり、本コンポーネントは受け取った順序のまま表示するだけ
export function RankingList({ entries }: RankingListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-body-secondary small mb-0" data-testid="ranking-empty">
        まだ記録がありません
      </p>
    )
  }
  return (
    <ol className="mb-0 ps-4" data-testid="ranking-list">
      {entries.map((entry, index) => (
        <li key={`${entry.recordedAt}-${index}`} className="small">
          {formatElapsedTime(entry.timeMs)}
        </li>
      ))}
    </ol>
  )
}
