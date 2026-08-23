// rankingRepository.jsと同じインターフェース（list/put/deleteById）を持つ
// Mapベースのin-memory実装。単体テストで実DynamoDBの代わりに使う（issue #112）
export function createInMemoryRankingRepository() {
  const store = new Map()
  return {
    async list() {
      return [...store.values()]
    },
    async put(entry) {
      store.set(entry.id, entry)
    },
    async deleteById(id) {
      store.delete(id)
    },
  }
}
