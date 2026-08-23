import { createServer } from 'node:http'
import { createInMemoryRankingRepository } from '../helpers/inMemoryRankingRepository.js'
import { createRouter } from '../../src/router.js'
import { createRankingService } from '../../src/services/rankingService.js'

// handler.jsと同じrouter/service組み立てロジックを再利用しつつ、DynamoDBクライアントの
// 代わりにin-memory repositoryへ差し替えた最小限のhttp.createServerラッパー。
// 実DynamoDB・実AWS環境への通信なしに、GET/POST /rankingの実際のHTTP挙動
// （JSONボディのパース・ステータスコード等）をローカルで確認できる
// （dev-standards docs/serverless-api-dynamodb-pattern.md「テストパターン」参照。issue #112）
export function createTestServer() {
  const repository = createInMemoryRankingRepository()
  const router = createRouter({ rankingService: createRankingService(repository) })

  return createServer((request, response) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(chunk))
    request.on('end', async () => {
      const body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf-8') : undefined
      const result = await router.handleRequest({ method: request.method, path: request.url, body })
      response.writeHead(result.statusCode, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(result.body))
    })
  })
}
