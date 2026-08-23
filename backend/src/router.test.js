import { beforeEach, describe, expect, it } from 'vitest'
import { createInMemoryRankingRepository } from '../test/helpers/inMemoryRankingRepository.js'
import { createRouter } from './router.js'
import { createRankingService } from './services/rankingService.js'

describe('router', () => {
  let router

  beforeEach(() => {
    const repository = createInMemoryRankingRepository()
    router = createRouter({ rankingService: createRankingService(repository) })
  })

  it('GET /rankingは200で記録一覧（初期状態は空配列）を返す', async () => {
    const response = await router.handleRequest({ method: 'GET', path: '/ranking' })
    expect(response).toEqual({ statusCode: 200, body: [] })
  })

  it('POST /rankingは記録を追加し、更新後の一覧を200で返す', async () => {
    const response = await router.handleRequest({
      method: 'POST',
      path: '/ranking',
      body: JSON.stringify({ timeMs: 12345, catchCount: 3 }),
    })
    expect(response.statusCode).toBe(200)
    expect(response.body).toHaveLength(1)
    expect(response.body[0]).toMatchObject({ timeMs: 12345, catchCount: 3 })

    const getResponse = await router.handleRequest({ method: 'GET', path: '/ranking' })
    expect(getResponse.body).toHaveLength(1)
  })

  it('POST /rankingでボディが無い場合は400を返す', async () => {
    const response = await router.handleRequest({ method: 'POST', path: '/ranking', body: undefined })
    expect(response.statusCode).toBe(400)
  })

  it('POST /rankingでボディが不正なJSONの場合は400を返す', async () => {
    const response = await router.handleRequest({ method: 'POST', path: '/ranking', body: '{invalid' })
    expect(response.statusCode).toBe(400)
  })

  it('POST /rankingでtimeMsが不正な場合は400を返す', async () => {
    const response = await router.handleRequest({
      method: 'POST',
      path: '/ranking',
      body: JSON.stringify({ timeMs: -1, catchCount: 1 }),
    })
    expect(response.statusCode).toBe(400)
  })

  it('未定義のルートは404を返す', async () => {
    const response = await router.handleRequest({ method: 'GET', path: '/unknown' })
    expect(response.statusCode).toBe(404)
  })
})
