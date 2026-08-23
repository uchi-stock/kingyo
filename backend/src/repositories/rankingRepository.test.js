import { describe, expect, it, vi } from 'vitest'
import { createRankingRepository } from './rankingRepository.js'

// DynamoDB Document Clientをモックし、実DynamoDBへは一切通信せず、
// 送信されるコマンドの内容（テーブル名・キー）のみを検証する
function createFakeClient(sendImpl) {
  return { send: vi.fn(sendImpl) }
}

describe('rankingRepository', () => {
  it('listはpkが固定値のQueryCommandを送信し、Itemsをid/timeMs/catchCount/recordedAtへ整形する', async () => {
    const client = createFakeClient(async (command) => {
      expect(command.input.TableName).toBe('kingyo-ranking-test')
      expect(command.input.ExpressionAttributeValues[':pk']).toBe('RANKING')
      return { Items: [{ pk: 'RANKING', sk: 'id-1', id: 'id-1', timeMs: 100, catchCount: 1, recordedAt: 'now' }] }
    })
    const repository = createRankingRepository({ tableName: 'kingyo-ranking-test', client })

    const entries = await repository.list()

    expect(entries).toEqual([{ id: 'id-1', timeMs: 100, catchCount: 1, recordedAt: 'now' }])
  })

  it('listはItemsが無い場合、空配列を返す', async () => {
    const client = createFakeClient(async () => ({}))
    const repository = createRankingRepository({ tableName: 'kingyo-ranking-test', client })

    expect(await repository.list()).toEqual([])
  })

  it('putはpk固定値・skにidを設定したPutCommandを送信する', async () => {
    const client = createFakeClient(async (command) => {
      expect(command.input.TableName).toBe('kingyo-ranking-test')
      expect(command.input.Item).toEqual({
        pk: 'RANKING',
        sk: 'id-1',
        id: 'id-1',
        timeMs: 100,
        catchCount: 1,
        recordedAt: 'now',
      })
      return {}
    })
    const repository = createRankingRepository({ tableName: 'kingyo-ranking-test', client })

    await repository.put({ id: 'id-1', timeMs: 100, catchCount: 1, recordedAt: 'now' })

    expect(client.send).toHaveBeenCalledTimes(1)
  })

  it('deleteByIdはpk固定値・skに指定したidを設定したDeleteCommandを送信する', async () => {
    const client = createFakeClient(async (command) => {
      expect(command.input.TableName).toBe('kingyo-ranking-test')
      expect(command.input.Key).toEqual({ pk: 'RANKING', sk: 'id-1' })
      return {}
    })
    const repository = createRankingRepository({ tableName: 'kingyo-ranking-test', client })

    await repository.deleteById('id-1')

    expect(client.send).toHaveBeenCalledTimes(1)
  })
})
