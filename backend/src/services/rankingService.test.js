import { beforeEach, describe, expect, it } from 'vitest'
import { createInMemoryRankingRepository } from '../../test/helpers/inMemoryRankingRepository.js'
import { createRankingService } from './rankingService.js'

describe('rankingService', () => {
  let repository
  let service

  beforeEach(() => {
    repository = createInMemoryRankingRepository()
    service = createRankingService(repository)
  })

  it('記録が無い場合は空配列を返す', async () => {
    expect(await service.getRanking()).toEqual([])
  })

  it('記録を追加すると取得できる', async () => {
    await service.addRankingEntry({ timeMs: 12345, catchCount: 3 })
    const entries = await service.getRanking()
    expect(entries).toHaveLength(1)
    expect(entries[0].timeMs).toBe(12345)
    expect(entries[0].catchCount).toBe(3)
    expect(typeof entries[0].recordedAt).toBe('string')
  })

  it('記録時間が長い順（降順）に並べ替えられる', async () => {
    await service.addRankingEntry({ timeMs: 1000, catchCount: 1 })
    await service.addRankingEntry({ timeMs: 3000, catchCount: 3 })
    const entries = await service.addRankingEntry({ timeMs: 2000, catchCount: 2 })
    expect(entries.map((entry) => entry.timeMs)).toEqual([3000, 2000, 1000])
  })

  it('上位10件を超える記録は切り捨てられ、repository側からも削除される', async () => {
    for (let i = 0; i < 12; i += 1) {
      await service.addRankingEntry({ timeMs: i, catchCount: i })
    }
    const entries = await service.getRanking()
    expect(entries).toHaveLength(10)
    // 上位10件は11, 10, 9, ..., 2（降順）のはず
    expect(entries.map((entry) => entry.timeMs)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
    // 切り捨てられた分はrepository側からも消えている（無制限に増え続けない）
    expect(await repository.list()).toHaveLength(10)
  })

  it('timeMsが数値でない場合はバリデーションエラーになる', async () => {
    await expect(service.addRankingEntry({ timeMs: 'invalid', catchCount: 1 })).rejects.toMatchObject({
      name: 'ValidationError',
      statusCode: 400,
    })
  })

  it('timeMsが負の値の場合はバリデーションエラーになる', async () => {
    await expect(service.addRankingEntry({ timeMs: -1, catchCount: 1 })).rejects.toMatchObject({
      name: 'ValidationError',
    })
  })

  it('catchCountが数値でない場合はバリデーションエラーになる', async () => {
    await expect(service.addRankingEntry({ timeMs: 100, catchCount: 'invalid' })).rejects.toMatchObject({
      name: 'ValidationError',
    })
  })

  it('getRankingの戻り値にidフィールドは含まれない（公開APIの形状を最小限にする）', async () => {
    await service.addRankingEntry({ timeMs: 100, catchCount: 1 })
    const [entry] = await service.getRanking()
    expect(entry).toEqual({ timeMs: 100, catchCount: 1, recordedAt: expect.any(String) })
  })
})
