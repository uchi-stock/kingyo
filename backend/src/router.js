import { ValidationError } from './lib/errors.js'

function parseJsonBody(body) {
  if (!body) {
    throw new ValidationError('リクエストボディが必要です')
  }
  try {
    return JSON.parse(body)
  } catch {
    throw new ValidationError('リクエストボディが不正なJSONです')
  }
}

// マッチしたルートのhandlerを呼ぶ前段でエラー→HTTPステータス変換を一元化する
// （dev-standards docs/serverless-api-dynamodb-pattern.mdの構成を踏襲。ログイン不要
// のため認証ステップは無い。issue #112）
export function createRouter({ rankingService }) {
  return {
    async handleRequest({ method, path, body }) {
      try {
        if (method === 'GET' && path === '/ranking') {
          return { statusCode: 200, body: await rankingService.getRanking() }
        }
        if (method === 'POST' && path === '/ranking') {
          const entries = await rankingService.addRankingEntry(parseJsonBody(body))
          return { statusCode: 200, body: entries }
        }
        return { statusCode: 404, body: { message: 'Not Found' } }
      } catch (error) {
        if (error instanceof ValidationError) {
          return { statusCode: error.statusCode, body: { message: error.message } }
        }
        throw error
      }
    },
  }
}
