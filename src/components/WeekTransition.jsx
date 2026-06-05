// WeekTransition.jsx — 「下一周」过渡动画
import { useEffect, useState, useRef } from 'react'
import styles from './WeekTransition.module.css'

const LOADING_LINES = [
  { icon: 'ti-run',            text: '球员们正在训练...' },
  { icon: 'ti-calendar-week',  text: '安排本周课程...' },
  { icon: 'ti-trophy',         text: '处理赛事结果...' },
  { icon: 'ti-currency-yen',   text: '统计本周收支...' },
  { icon: 'ti-user-star',      text: '评估教练表现...' },
  { icon: 'ti-building',       text: '检查设施状态...' },
]

export default function WeekTransition({ year, week, visible }) {
  const [lineIndex, setLineIndex] = useState(0)
  const [progress, setProgress]   = useState(0)
  const [ballPos, setBallPos]     = useState(10)
  // ✅ 修复：用 ref 存 ballDir，不用 state，避免 useEffect 重复触发
  const ballDirRef = useRef(1)

  // 文字轮换
  useEffect(() => {
    if (!visible) return
    setLineIndex(0)
    const t = setInterval(() => setLineIndex(i => (i + 1) % LOADING_LINES.length), 650)
    return () => clearInterval(t)
  }, [visible])

  // 进度条
  useEffect(() => {
    if (!visible) return
    setProgress(0)
    const start = Date.now()
    const total = 3800
    const t = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / total) * 100)
      setProgress(pct)
      if (pct >= 100) clearInterval(t)
    }, 50)
    return () => clearInterval(t)
  }, [visible])

  // ✅ 修复：网球弹跳用 ref 存方向，单个 useEffect 不依赖 ballDir state
  useEffect(() => {
    if (!visible) return
    setBallPos(10)
    ballDirRef.current = 1
    const t = setInterval(() => {
      setBallPos(prev => {
        let next = prev + ballDirRef.current * 2.5
        if (next >= 88) { ballDirRef.current = -1; next = 88 }
        if (next <= 2)  { ballDirRef.current =  1; next = 2  }
        return next
      })
    }, 30)
    return () => clearInterval(t)
  }, [visible])

  if (!visible) return null

  const line = LOADING_LINES[lineIndex]

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.topBar} />

        <div className={styles.weekLabel}>
          <span className={styles.weekYear}>第 {year} 年</span>
          <span className={styles.weekNum}>第 {week} 周</span>
        </div>

        {/* 网球场 */}
        <div className={styles.courtWrap}>
          <div className={styles.court}>
            <div className={styles.courtNet} />
            <div className={styles.courtLineLeft} />
            <div className={styles.courtLineRight} />
            <div className={styles.ball} style={{ left: `${ballPos}%` }}>
              <div className={styles.ballInner} />
            </div>
          </div>
        </div>

        {/* 滚动文字 */}
        <div className={styles.statusRow}>
          <i className={`ti ${line.icon} ${styles.statusIcon}`} aria-hidden="true" />
          <span className={styles.statusText} key={lineIndex}>{line.text}</span>
        </div>

        {/* 进度条 */}
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
