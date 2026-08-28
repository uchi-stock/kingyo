import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import UpdateNotifier from './UpdateNotifier'

const originalServiceWorker = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined
const originalLocation = window.location

// navigator.serviceWorkerのcontrollerchangeイベントをテストから発火できるようにモックする
function mockServiceWorkerContainer(hasControllerAtLoad: boolean) {
  const listeners = new Map<string, Set<EventListener>>()
  const container = {
    controller: hasControllerAtLoad ? {} : null,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    }),
  }
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true })
  return {
    // リスナーはReactのイベントシステムを経由しない直接呼び出しのため、act()で
    // 包んでReactの状態更新を同期的に反映させる
    fireControllerChange: () => {
      act(() => {
        for (const listener of listeners.get('controllerchange') ?? []) {
          listener(new Event('controllerchange'))
        }
      })
    },
  }
}

describe('UpdateNotifier', () => {
  afterEach(() => {
    // setupTests.tsのグローバルなafterEach（cleanup）より前に、必ずこのファイル内で
    // マウントしたコンポーネントをアンマウントしておく。navigator.serviceWorkerの
    // 復元より後にアンマウントされると、エフェクトのクリーンアップ関数
    // （navigator.serviceWorker.removeEventListener呼び出し）が復元後のnavigator状態を
    // 参照して失敗するため
    cleanup()
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', { value: originalServiceWorker, configurable: true })
    } else {
      // @ts-expect-error テストで追加したserviceWorkerプロパティを元に戻す
      delete navigator.serviceWorker
    }
    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true })
    vi.restoreAllMocks()
  })

  it('初期状態では何も表示しない', () => {
    mockServiceWorkerContainer(true)
    render(<UpdateNotifier />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ページ読み込み時点で既にService Workerの制御下にあった場合、controllerchangeで更新バナーを表示する（issue #135）', () => {
    const { fireControllerChange } = mockServiceWorkerContainer(true)
    render(<UpdateNotifier />)

    fireControllerChange()

    expect(screen.getByRole('alert')).toHaveTextContent('新しいバージョンがあります')
  })

  it('初回インストール（読み込み時点でcontrollerが無い）の場合は、controllerchangeが発生しても更新バナーを表示しない（issue #135）', () => {
    const { fireControllerChange } = mockServiceWorkerContainer(false)
    render(<UpdateNotifier />)

    fireControllerChange()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('更新するボタンを押すと、画面がリロードされる（issue #135）', () => {
    const { fireControllerChange } = mockServiceWorkerContainer(true)
    const reload = vi.fn()
    Object.defineProperty(window, 'location', { value: { ...originalLocation, reload }, configurable: true })
    render(<UpdateNotifier />)
    fireControllerChange()

    fireEvent.click(screen.getByRole('button', { name: '更新する' }))

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('serviceWorkerが利用できない環境では、例外を投げず何も表示しない', () => {
    // @ts-expect-error テスト用にserviceWorker自体が存在しない環境を再現する
    delete navigator.serviceWorker

    expect(() => render(<UpdateNotifier />)).not.toThrow()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
