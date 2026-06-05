// ══════════════════════════════════════════════════════
// GameInitAnimation.jsx — 新游戏初始化动画
// 在 LandingPage 确认开始游戏后显示，3-5秒后自动跳转
// ══════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import styles from './GameInitAnimation.module.css'

// 动画步骤，每步显示约600ms
function buildSteps(players, coaches, difficulty) {
  const diffLabel = { hard: '困难', normal: '普通', easy: '简单' }[difficulty] || '普通'
  const steps = [
    { icon: 'ti-building',     text: `初始化${diffLabel}难度俱乐部...` },
    { icon: 'ti-rectangle',    text: '建设球场设施...' },
  ]

  // 插入球员生成步骤（最多显示5个）
  const showPlayers = players.slice(0, 5)
  showPlayers.forEach(p => {
    steps.push({
      icon: 'ti-user-plus',
      text: `招募球员 ${p.name} · ${p.talentLabel}`,
      highlight: p.talentLabel === '万里挑一' || p.talentLabel === '天赋异禀',
    })
  })
  if (players.length > 5) {
    steps.push({ icon: 'ti-users', text: `共招募 ${players.length} 名青少年球员` })
  }

  steps.push({ icon: 'ti-user-star',    text: `组建教练团队（${coaches.length} 人）...` })
  steps.push({ icon: 'ti-trophy',       text: '配置年度赛事日历...' })
  steps.push({ icon: 'ti-calendar',     text: '设定游戏进程...' })
  steps.push({ icon: 'ti-circle-check', text: '初始化完成！即将进入游戏', done: true })

  return steps
}

export default function GameInitAnimation({ visible, players, coaches, difficulty, onComplete }) {
  const [stepIndex, setStepIndex]   = useState(0)
  const [progress, setProgress]     = useState(0)
  const [done, setDone]             = useState(false)

  const steps = buildSteps(players || [], coaches || [], difficulty || 'normal')
  const STEP_INTERVAL = Math.max(400, Math.floor(4000 / steps.length))
  const TOTAL_MS = steps.length * STEP_INTERVAL + 600

  // 步骤推进
  useEffect(() => {
    if (!visible) { setStepIndex(0); setProgress(0); setDone(false); return }
    const t = setInterval(() => {
      setStepIndex(i => {
        const next = i + 1
        if (next >= steps.length) { clearInterval(t); setDone(true); return i }
        return next
      })
    }, STEP_INTERVAL)
    return () => clearInterval(t)
  }, [visible])

  // 进度条
  useEffect(() => {
    if (!visible) return
    const start = Date.now()
    const t = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / TOTAL_MS) * 100)
      setProgress(pct)
      if (pct >= 100) clearInterval(t)
    }, 40)
    return () => clearInterval(t)
  }, [visible])

  // 完成后自动回调
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => onComplete?.(), 600)
    return () => clearTimeout(t)
  }, [done])

  if (!visible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>

        {/* 顶部装饰 */}
        <div className={styles.topBar} />

        {/* 标题 */}
        <div className={styles.titleRow}>
          <div className={styles.titleIcon}>
            <i className="ti ti-tennis" aria-hidden="true" />
          </div>
          <div>
            <div className={styles.titleEyebrow}>正在初始化</div>
            <div className={styles.titleMain}>长青网球俱乐部</div>
          </div>
        </div>

        {/* 步骤列表 */}
        <div className={styles.stepList}>
          {steps.slice(0, stepIndex + 1).map((step, i) => (
            <div
              key={i}
              className={`${styles.stepItem} ${step.done ? styles.stepDone : ''} ${step.highlight ? styles.stepHighlight : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`${styles.stepIcon} ${step.done ? styles.stepIconDone : step.highlight ? styles.stepIconHighlight : ''}`}>
                <i className={`ti ${step.done ? 'ti-check' : step.icon}`} aria-hidden="true" />
              </div>
              <span className={styles.stepText}>{step.text}</span>
              {step.highlight && (
                <span className={styles.starTag}>
                  <i className="ti ti-star" aria-hidden="true" />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 进度条 */}
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>

        <div className={styles.progressLabel}>
          {done ? '初始化完成，即将进入游戏...' : `正在生成游戏数据 ${Math.round(progress)}%`}
        </div>

      </div>
    </div>
  )
}
