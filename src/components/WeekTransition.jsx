// ══════════════════════════════════════════════════════
// WeekTransition.jsx — 「下一周」过渡动画
// 点击「下一周」后全屏覆盖，3-4秒后自动结束
// ══════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import styles from './WeekTransition.module.css'

// 滚动文字序列（依次显示）
const LOADING_LINES = [
  { icon: 'ti-run',            text: '球员们正在训练...' },
  { icon: 'ti-calendar-week',  text: '安排本周课程...' },
  { icon: 'ti-trophy',         text: '处理赛事结果...' },
  { icon: 'ti-currency-yen',   text: '统计本周收支...' },
  { icon: 'ti-user-star',      text: '评估教练表现...' },
  { icon: 'ti-building',       text: '检查设施状态...' },
]

export default function WeekTransition({ year, week, visible }) {
  const [lineIndex, setLineIndex]   = useState(0)
  const [progress, setProgress]     = useState(0)
  const [ballPos, setBallPos]       = useState(0)   // 0-100 网球左右运动
  const [ballDir, setBallDir]       = useState(1)

  // 每 600ms 切换一条文字
  useEffect(() => {
    if (!visible) { setLineIndex(0); setProgress(0); return }
    const timer = setInterval(() => {
      setLineIndex(i => (i + 1) % LOADING_LINES.length)
    }, 600)
    return () => clearInterval(timer)
  }, [visible])

  // 进度条：4000ms 走完
  useEffect(() => {
    if (!visible) { setProgress(0); return }
    const start = Date.now()
    const total = 4000
    const raf = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / total) * 100)
      setProgress(pct)
      if (pct >= 100) clearInterval(raf)
    }, 30)
    return () => clearInterval(raf)
  }, [visible])

  // 网球左右弹跳动画
  useEffect(() => {
    if (!visible) { setBallPos(0); return }
    const timer = setInterval(() => {
      setBallPos(prev => {
        const next = prev + ballDir * 3
        if (next >= 90 || next <= 0) {
          setBallDir(d => -d)
          return Math.max(0, Math.min(90, next))
        }
        return next
      })
    }, 30)
    return () => clearInterval(timer)
  }, [visible, ballDir])

  if (!visible) return null

  const line = LOADING_LINES[lineIndex]

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>

        {/* 顶部装饰线 */}
        <div className={styles.topBar} />

        {/* 年份 + 周数 */}
        <div className={styles.weekLabel}>
          <span className={styles.weekYear}>第 {year} 年</span>
          <span className={styles.weekNum}>第 {week} 周</span>
        </div>

        {/* 网球场动画区 */}
        <div className={styles.courtWrap}>
          {/* 球场线条 */}
          <div className={styles.court}>
            <div className={styles.courtNet} />
            <div className={styles.courtLeft} />
            <div className={styles.courtRight} />
            {/* 运动的网球 */}
            <div
              className={styles.ball}
              style={{ left: `${ballPos}%` }}
            >
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
