import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export interface ShareButtonProps {
  // トリガーボタン・モーダル見出しの文言
  label?: string
  // トリガーボタンへ追加するクラス名
  className?: string
  // 共有するURLを返す関数（既定はwindow.location.href）
  getUrl?: () => string
}

// 現在のページ（既定ではwindow.location.href）をQRコードで表示し、URLをワンタップ
// コピーできるボタン＋モーダル。スマートフォンオンリーの利用環境で、家族・友人間の
// 画面共有にQRコードの読み取りが最も簡便であることを想定している（issue #144）。
// dev-standards shared/ui/ShareButton.jsxのTypeScript移植。元実装はdaisyUI前提の
// モーダルマークアップ（modal/modal-box/modal-action等）のため、Bootstrap 5.3を使う
// kingyoではsymlinkせずTSXへ移植し、モーダルをBootstrapのクラス・マークアップに
// 合わせて書き換えている（トリガーボタン自体はclassNameで見た目を委譲する設計のため、
// 元実装のままでも問題ない）。kingyoはBootstrapのJS（data-bs-*によるモーダル制御）を
// 読み込んでいないため、開閉状態は元実装と同様にReactのstateで管理する
export function ShareButton({
  label = 'このページを共有',
  className = '',
  getUrl = () => window.location.href,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  function openShare() {
    setCopied(false)
    setShareUrl(getUrl())
    setOpen(true)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
    } catch {
      // クリップボードAPIが使えない環境では、URLのテキスト選択・手動コピーで代替する
    }
  }

  return (
    <>
      <button type="button" onClick={openShare} className={className} data-testid="share-button">
        {label}
      </button>

      {open && (
        <>
          <div className="modal d-block" tabIndex={-1} role="dialog" data-testid="share-modal">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{label}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="閉じる"
                    onClick={() => setOpen(false)}
                  />
                </div>
                <div className="modal-body text-center">
                  <div className="d-flex justify-content-center mb-3">
                    <QRCodeSVG value={shareUrl} size={200} />
                  </div>
                  <p className="bg-light rounded p-2 small text-break user-select-all mb-0">{shareUrl}</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      void handleCopy()
                    }}
                    data-testid="share-copy-button"
                  >
                    {copied ? 'コピーしました' : 'URLをコピー'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setOpen(false)}
                    data-testid="share-close-button"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            className="modal-backdrop show"
            role="presentation"
            onClick={() => setOpen(false)}
            data-testid="share-modal-backdrop"
          />
        </>
      )}
    </>
  )
}
