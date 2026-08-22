import { useCallback, useEffect, useRef } from 'react'

// 指定した音源を再生する関数を返す。<audio>相当のインスタンスをuseRefで使い回すことで、
// 再生のたびに新規生成せずに済む。ブラウザの自動再生ポリシーにより、ユーザー操作を
// 伴わない再生（傾きセンサー由来のジェスチャー等）ではplay()が拒否されることがあるため、
// Promiseのrejectは無視し、機能全体に影響しないようにする（issue #48）
export function usePlaySound(url: string): () => void {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const getAudio = useCallback(() => {
    if (typeof Audio === 'undefined') {
      return null
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
    }
    return audioRef.current
  }, [url])

  // 効果音の再生トリガーはdeviceorientationイベント（センサー由来のジェスチャー検出）であり、
  // タップ等の直接的なユーザー操作に紐づいていないため、iOS Safari等の自動再生ポリシーにより
  // play()が拒否され、効果音が一切鳴らない問題があった（issue #73）。
  // 画面への最初のタップ（issue #63のセンサー許可リクエストと同じトリガー）で一度
  // （無音で）play()→pause()しておくことで、その要素を「ユーザー操作に紐づく再生」として
  // ブラウザに認識させ、以降のセンサー由来の再生がブロックされないようにする
  useEffect(() => {
    const unlockOnFirstPointerDown = () => {
      const audio = getAudio()
      if (!audio) {
        return
      }
      const wasMuted = audio.muted
      audio.muted = true
      Promise.resolve(audio.play())
        .then(() => {
          audio.pause()
          audio.currentTime = 0
          audio.muted = wasMuted
        })
        .catch(() => {
          audio.muted = wasMuted
        })
    }
    window.addEventListener('pointerdown', unlockOnFirstPointerDown, { once: true })
    return () => window.removeEventListener('pointerdown', unlockOnFirstPointerDown)
  }, [getAudio])

  return useCallback(() => {
    const audio = getAudio()
    if (!audio) {
      return
    }
    audio.currentTime = 0
    // play()はブラウザ・実行環境によってはPromiseを返さない実装もあるため（jsdom等）、
    // Promise.resolveで包んでから扱う。自動再生ポリシーによる再生拒否等でrejectされても、
    // 効果音が鳴らないだけで他の操作には影響させない
    Promise.resolve(audio.play()).catch(() => {})
  }, [getAudio])
}
