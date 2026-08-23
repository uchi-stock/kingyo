import { ValidationError } from '../lib/errors.js'

// 保持する記録の上限件数。frontend/src/ranking/ranking.tsの既存ロジック（issue #89, #99）
// と同じ値・同じ並び替え規則（記録時間の降順）をサーバー側へ移した
const MAX_ENTRIES = 10

function sortAndTrim(entries) {
  return [...entries].sort((a, b) => b.timeMs - a.timeMs).slice(0, MAX_ENTRIES)
}

function toPublicEntry({ timeMs, catchCount, recordedAt }) {
  return { timeMs, catchCount, recordedAt }
}

function assertNonNegativeNumber(value, fieldName) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${fieldName}は0以上の数値である必要があります`)
  }
}

// repositoryのインターフェース（list/put/deleteById）にのみ依存し、AWS SDKを
// 直接importしない。単体テストではtest/helpers/inMemoryRankingRepository.jsに
// 差し替えて、実DynamoDBへ一切アクセスせずに検証する
export function createRankingService(repository) {
  return {
    async getRanking() {
      const entries = await repository.list()
      return sortAndTrim(entries).map(toPublicEntry)
    },

    async addRankingEntry({ timeMs, catchCount }) {
      assertNonNegativeNumber(timeMs, 'timeMs')
      assertNonNegativeNumber(catchCount, 'catchCount')

      const entry = {
        id: crypto.randomUUID(),
        timeMs,
        catchCount,
        recordedAt: new Date().toISOString(),
      }
      await repository.put(entry)

      // 上位MAX_ENTRIES件のみを保持し、それ以外は削除する（無制限にレコードが
      // 増え続けるのを防ぐ）
      const all = await repository.list()
      const top = sortAndTrim(all)
      const topIds = new Set(top.map((item) => item.id))
      await Promise.all(all.filter((item) => !topIds.has(item.id)).map((item) => repository.deleteById(item.id)))

      return top.map(toPublicEntry)
    },
  }
}
