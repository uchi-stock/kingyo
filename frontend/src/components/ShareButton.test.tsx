import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ShareButton } from './ShareButton'

describe('ShareButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('初期状態ではモーダルを表示しない', () => {
    render(<ShareButton getUrl={() => 'https://example.com/game'} />)

    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()
  })

  it('トリガーボタンを押すと、URLとQRコードを含むモーダルを表示する（issue #144）', () => {
    render(<ShareButton getUrl={() => 'https://example.com/game'} />)

    fireEvent.click(screen.getByTestId('share-button'))

    expect(screen.getByTestId('share-modal')).toHaveTextContent('https://example.com/game')
    expect(screen.getByTestId('share-modal').querySelector('svg')).not.toBeNull()
  })

  it('コピーボタンを押すと、URLをクリップボードへコピーし文言が変わる（issue #144）', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<ShareButton getUrl={() => 'https://example.com/game'} />)
    fireEvent.click(screen.getByTestId('share-button'))

    fireEvent.click(screen.getByTestId('share-copy-button'))

    expect(writeText).toHaveBeenCalledWith('https://example.com/game')
    await waitFor(() => {
      expect(screen.getByTestId('share-copy-button')).toHaveTextContent('コピーしました')
    })
  })

  it('クリップボードAPIが使えない環境でも、例外を投げずコピー失敗として扱う（issue #144）', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('not available'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<ShareButton getUrl={() => 'https://example.com/game'} />)
    fireEvent.click(screen.getByTestId('share-button'))

    fireEvent.click(screen.getByTestId('share-copy-button'))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled()
    })

    expect(screen.getByTestId('share-copy-button')).toHaveTextContent('URLをコピー')
  })

  it('閉じるボタンを押すとモーダルを閉じる', () => {
    render(<ShareButton getUrl={() => 'https://example.com/game'} />)
    fireEvent.click(screen.getByTestId('share-button'))

    fireEvent.click(screen.getByTestId('share-close-button'))

    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()
  })

  it('ヘッダーの閉じるアイコン（×）を押すとモーダルを閉じる', () => {
    render(<ShareButton getUrl={() => 'https://example.com/game'} />)
    fireEvent.click(screen.getByTestId('share-button'))

    fireEvent.click(screen.getByTestId('share-modal').querySelector('.btn-close') as Element)

    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()
  })

  it('バックドロップをクリックするとモーダルを閉じる', () => {
    render(<ShareButton getUrl={() => 'https://example.com/game'} />)
    fireEvent.click(screen.getByTestId('share-button'))

    fireEvent.click(screen.getByTestId('share-modal-backdrop'))

    expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument()
  })
})
