import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import ServiceWorkerRegistration from './ServiceWorkerRegistration'

// テスト対象がnavigator.serviceWorkerを参照するため、jsdomに実装のないこのAPIを
// テストごとにモックし、afterEachで元に戻す
const originalServiceWorker = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined

function mockServiceWorkerContainer(registration: { update: ReturnType<typeof vi.fn> }) {
  const register = vi.fn().mockResolvedValue(registration)
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register },
    configurable: true,
  })
  return register
}

describe('ServiceWorkerRegistration', () => {
  afterEach(() => {
    // setupTests.tsのグローバルなafterEach（cleanup）より前に、必ずこのファイル内で
    // マウントしたコンポーネントをアンマウントしておく。navigator.serviceWorkerの
    // 復元より後にアンマウントされると、エフェクトのクリーンアップ関数が復元後の
    // navigator状態を参照して失敗するため
    cleanup()
    if (originalServiceWorker) {
      Object.defineProperty(navigator, 'serviceWorker', { value: originalServiceWorker, configurable: true })
    } else {
      // @ts-expect-error テストで追加したserviceWorkerプロパティを元に戻す
      delete navigator.serviceWorker
    }
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('マウント時に/sw.jsを登録する（issue #135）', () => {
    const register = mockServiceWorkerContainer({ update: vi.fn() })

    render(<ServiceWorkerRegistration />)

    expect(register).toHaveBeenCalledWith('/sw.js')
  })

  it('serviceWorkerが利用できない環境（Android Chrome以外の一部ブラウザ等）では、例外を投げず何もしない', () => {
    // @ts-expect-error テスト用にserviceWorker自体が存在しない環境を再現する
    delete navigator.serviceWorker

    expect(() => render(<ServiceWorkerRegistration />)).not.toThrow()
  })

  it('画面がフォアグラウンドに戻ると（visibilitychange）、登録済みのregistration.update()を呼ぶ（issue #135）', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    mockServiceWorkerContainer({ update })

    render(<ServiceWorkerRegistration />)
    // register()のPromise解決を待つ
    await Promise.resolve()
    await Promise.resolve()

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('画面が非表示（visibilityState !== visible）の場合は、visibilitychangeが発生してもupdate()を呼ばない（issue #135）', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    mockServiceWorkerContainer({ update })

    render(<ServiceWorkerRegistration />)
    await Promise.resolve()
    await Promise.resolve()

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).not.toHaveBeenCalled()
  })
})
