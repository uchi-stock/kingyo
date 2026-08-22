import { useCallback, useRef } from 'react'

// 指定した音源を再生する関数を返す。<audio>相当のインスタンスをuseRefで使い回すことで、
// 再生のたびに新規生成せずに済む。ブラウザの自動再生ポリシーにより、ユーザー操作を
// 伴わない再生（傾きセンサー由来のジェスチャー等）ではplay()が拒否されることがあるため、
// Promiseのrejectは無視し、機能全体に影響しないようにする（issue #48）
export function usePlaySound(url: string): () => void {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  return useCallback(() => {
    if (typeof Audio === 'undefined') {
      return
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(url)
    }
    const audio = audioRef.current
    audio.currentTime = 0
    // play()はブラウザ・実行環境によってはPromiseを返さない実装もあるため（jsdom等）、
    // Promise.resolveで包んでから扱う。自動再生ポリシーによる再生拒否等でrejectされても、
    // 効果音が鳴らないだけで他の操作には影響させない
    Promise.resolve(audio.play()).catch(() => {})
  }, [url])
}
