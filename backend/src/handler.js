import { createRankingRepository } from './repositories/rankingRepository.js'
import { createRouter } from './router.js'
import { createRankingService } from './services/rankingService.js'

// DynamoDBクライアント・repository・serviceの組み立てをここに閉じ込め、他はAWS SDKに
// 依存させない（dev-standards docs/serverless-api-dynamodb-pattern.md）
const repository = createRankingRepository({ tableName: process.env.RANKING_TABLE_NAME })
const rankingService = createRankingService(repository)
const router = createRouter({ rankingService })

// API Gateway HTTP API（payload format 2.0）のeventを受け取り、routerへ委譲する
// 純粋な変換層。ANY /{proxy+}ルートはOPTIONSメソッドにも一致してしまい、HTTP APIの
// CORS自動プリフライト応答が働かないため、ここでOPTIONSを最初に判定し204を返す
// （dev-standards docs/serverless-api-dynamodb-pattern.md「CORSとOPTIONSプリフライト」）
export async function handler(event) {
  const method = event.requestContext?.http?.method
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: {}, body: '' }
  }

  const result = await router.handleRequest({
    method,
    path: event.requestContext?.http?.path,
    body: event.body,
  })

  return {
    statusCode: result.statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.body),
  }
}
