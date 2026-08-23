import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from './testServer.js'

// 実際にHTTPサーバーを起動し、fetch()で叩くことでGET/POST /rankingの動作を
// エンドツーエンドに確認する（issue #112完了条件「serverless-offline等でローカルに
// APIを起動し、GET/POSTの動作を確認できる」に相当する検証）
describe('ranking API (e2e)', () => {
  let server
  let baseUrl

  beforeEach(async () => {
    server = createTestServer()
    await new Promise((resolve) => server.listen(0, resolve))
    const { port } = server.address()
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve))
  })

  it('GET /rankingは初期状態で空配列を返す', async () => {
    const response = await fetch(`${baseUrl}/ranking`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
  })

  it('POST /rankingで記録を追加すると、GET /rankingで取得できる', async () => {
    const postResponse = await fetch(`${baseUrl}/ranking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMs: 12345, catchCount: 3 }),
    })
    expect(postResponse.status).toBe(200)
    const posted = await postResponse.json()
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({ timeMs: 12345, catchCount: 3 })

    const getResponse = await fetch(`${baseUrl}/ranking`)
    const entries = await getResponse.json()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ timeMs: 12345, catchCount: 3 })
  })

  it('複数回POSTすると、記録時間の降順で返る', async () => {
    for (const timeMs of [1000, 3000, 2000]) {
      await fetch(`${baseUrl}/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeMs, catchCount: 1 }),
      })
    }
    const response = await fetch(`${baseUrl}/ranking`)
    const entries = await response.json()
    expect(entries.map((entry) => entry.timeMs)).toEqual([3000, 2000, 1000])
  })

  it('POST /rankingで不正なボディを送ると400を返す', async () => {
    const response = await fetch(`${baseUrl}/ranking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMs: -1, catchCount: 1 }),
    })
    expect(response.status).toBe(400)
  })

  it('未定義のルートは404を返す', async () => {
    const response = await fetch(`${baseUrl}/unknown`)
    expect(response.status).toBe(404)
  })
})
