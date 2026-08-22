import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RankingList } from './RankingList'

describe('RankingList', () => {
  it('記録が無い場合は案内文を表示する', () => {
    render(<RankingList entries={[]} />)
    expect(screen.getByTestId('ranking-empty')).toHaveTextContent('まだ記録がありません')
    expect(screen.queryByTestId('ranking-list')).not.toBeInTheDocument()
  })

  it('記録を受け取った順序のまま、フォーマットした時間で表示する', () => {
    render(
      <RankingList
        entries={[
          { timeMs: 65432, recordedAt: '2026-01-01T00:00:00.000Z' },
          { timeMs: 12345, recordedAt: '2026-01-02T00:00:00.000Z' },
        ]}
      />,
    )
    const list = screen.getByTestId('ranking-list')
    expect(list).toHaveTextContent('01:05.4')
    expect(list).toHaveTextContent('00:12.3')
    expect(screen.queryByTestId('ranking-empty')).not.toBeInTheDocument()
  })
})
