// MatchAnimation.jsx
// 比赛动画弹窗：在 WeekSummary 前逐轮展示比赛过程
// 数据来源：weekEngine 计算好的 matchResults，这里只做展示

import { useState, useEffect, useRef } from 'react'
import styles from './MatchAnimation.module.css'

const ROUND_LABEL = {
  r1: '首轮', r2: '第二轮', r3: '第三轮',
  qf: '四分之一决赛', sf: '半决赛', runner_up: '亚军', champion: '冠军',
}

const LEVEL_COLOR = {
  slam:  '#9a6e0a',
  '1000': '#1a4090',
  '500':  '#1a6010',
  '250':  '#2a6858',
  itf:    '#5a2a8a',
}

// 把所有球员的所有轮次拍平成一个播放队列
// 按轮次分组：同一轮所有球员打完再进下一轮
function buildPlayQueue(matchData) {
  if (!matchData || matchData.length === 0) return []

  const ROUND_ORDER = ['r1', 'r2', 'r3', 'qf', 'sf', 'runner_up', 'champion']

  // 收集所有实际出现的轮次
  const allRounds = new Set()
  matchData.forEach(player => {
    (player.matchResults || []).forEach(m => {
      if (m && m.round) allRounds.add(m.round)
    })
  })

  const sortedRounds = ROUND_ORDER.filter(r => allRounds.has(r))

  const queue = []
  sortedRounds.forEach(round => {
    matchData.forEach(player => {
      const match = (player.matchResults || []).find(m => m && m.round === round)
      // ✅ 必须有 match 且有轮次标签才加入队列
      if (match && match.round) {
        queue.push({
          playerName:  player.playerName || '未知球员',
          playerId:    player.playerId,
          eventName:   player.eventName || '赛事',
          level:       player.level || 'itf',
          round,
          roundLabel:  ROUND_LABEL[round] || round,
          match,
        })
      }
    })
  })

  return queue
}

// 单场比赛的比分展示
function ScoreDisplay({ score, playerName, revealed }) {
  if (!score || !revealed) return null
  const { playerSets, oppSets } = score

  return (
    <div className={styles.scoreRow}>
      <div className={styles.scorePlayer}>
        <span className={styles.scorePlayerName}>{playerName}</span>
        <div className={styles.scoreSets}>
          {playerSets.map((g, i) => (
            <span
              key={i}
              className={`${styles.scoreSet} ${g > oppSets[i] ? styles.scoreSetWin : styles.scoreSetLose}`}
            >
              {g}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.scorePlayer}>
        <span className={styles.scorePlayerName}>{score._oppName || '对手'}</span>
        <div className={styles.scoreSets}>
          {oppSets.map((g, i) => (
            <span
              key={i}
              className={`${styles.scoreSet} ${g > playerSets[i] ? styles.scoreSetWin : styles.scoreSetLose}`}
            >
              {g}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// 单场比赛卡片
function MatchCard({ item, phase, onNext, isLast, onSkipAll }) {
  const isWin      = item.match.result === 'win'
  const isChampion = item.match.result === 'champion'
  const isRunnerUp = item.match.result === 'runner_up'
  const isFinal    = isChampion || isRunnerUp
  const levelColor = LEVEL_COLOR[item.level] || '#4a5a48'

  // score 附上对手名字方便 ScoreDisplay 使用
  const score = item.match.score
    ? { ...item.match.score, _oppName: item.match.opponent?.name || '对手' }
    : null

  return (
    <div className={styles.matchCard}>

      {/* 赛事标题 */}
      <div className={styles.cardHeader}>
        <span className={styles.eventTag} style={{ color: levelColor }}>
          {item.eventName}
        </span>
        <span className={styles.roundTag}>{item.roundLabel}</span>
      </div>

      {/* 球员 vs 对手 */}
      <div className={styles.vsRow}>
        <div className={styles.vsSide}>
          <div className={styles.vsAvatar} style={{ background: 'var(--forest)', color: 'var(--gold)' }}>
            {item.playerName.charAt(0)}
          </div>
          <span className={styles.vsName}>{item.playerName}</span>
          <span className={styles.vsLabel}>我方</span>
        </div>

        <div className={styles.vsCenter}>
          {phase === 'playing' ? (
            <div className={styles.vsPlaying}>
              <span className={styles.vsBall}>🎾</span>
              <span className={styles.vsVs}>进行中</span>
            </div>
          ) : (
            <span className={`${styles.vsResult} ${
              isChampion ? styles.vsChampion :
              isWin      ? styles.vsWin : styles.vsLose
            }`}>
              {isChampion ? '🏆' : isWin ? '胜' : '负'}
            </span>
          )}
        </div>

        <div className={`${styles.vsSide} ${styles.vsSideRight}`}>
          {isFinal ? (
            <>
              <div className={styles.vsAvatar} style={{ background: '#c9a84c', color: '#fff' }}>
                {isChampion ? '🏆' : '🥈'}
              </div>
              <span className={styles.vsName}>{isChampion ? '夺得冠军' : '获得亚军'}</span>
              <span className={styles.vsLabel}>最终成绩</span>
            </>
          ) : (
            <>
              <div className={styles.vsAvatar} style={{ background: '#8a9688', color: '#fff' }}>
                {item.match.opponent?.name?.charAt(0) || '?'}
              </div>
              <span className={styles.vsName}>{item.match.opponent?.name || '对手'}</span>
              <span className={styles.vsLabel}>
                {item.match.opponent?.ranking ? `世界第 ${item.match.opponent.ranking}` : '对手'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 进度条（playing 阶段） */}
      {phase === 'playing' && (
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} />
          </div>
          <span className={styles.progressLabel}>比赛进行中…</span>
        </div>
      )}

      {/* 结果展示（revealed 阶段） */}
      {phase === 'revealed' && !isFinal && (
        <div className={styles.resultWrap}>
          {/* 比分 */}
          {score && (
            <ScoreDisplay
              score={score}
              playerName={item.playerName}
              revealed={true}
            />
          )}
          {/* 战力对比 */}
          {item.match.myPower != null && (
            <div className={styles.powerRow}>
              <span className={styles.powerLabel} style={{ color: 'var(--forest)' }}>
                战力 {item.match.myPower}
              </span>
              <div className={styles.powerTrack}>
                <div
                  className={styles.powerFill}
                  style={{ width: `${Math.round(item.match.myPower / (item.match.myPower + item.match.oppPower) * 100)}%` }}
                />
              </div>
              <span className={styles.powerLabel} style={{ color: 'var(--ink-muted)' }}>
                {item.match.oppPower}
              </span>
            </div>
          )}
          {/* 叙述文字 */}
          {item.match.narrative && (
            <p className={styles.narrative}>{item.match.narrative}</p>
          )}
        </div>
      )}

      {/* 最终成绩说明 */}
      {phase === 'revealed' && isFinal && (
        <div className={styles.resultWrap}>
          <p className={styles.narrative}>
            {isChampion
              ? `🎉 恭喜！${item.playerName}赢得了${item.eventName}冠军！`
              : `${item.playerName}在${item.eventName}决赛中不敌对手，获得亚军。`}
          </p>
        </div>
      )}

      {/* 底部按钮 */}
      {phase === 'revealed' && (
        <div className={styles.cardFooter}>
          <button className={styles.skipAllBtn} onClick={onSkipAll}>
            跳过全部 <i className="ti ti-player-skip-forward" />
          </button>
          <button className={styles.nextBtn} onClick={onNext}>
            {isLast ? '查看本周总结' : '下一场'} <i className="ti ti-arrow-right" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── 主组件 ────────────────────────────────────────────
export default function MatchAnimation({ visible, matchData, onComplete }) {
  const queue              = buildPlayQueue(matchData || [])
  const [index, setIndex]  = useState(0)
  const [phase, setPhase]  = useState('playing') // 'playing' | 'revealed'
  const timerRef           = useRef(null)

  // 每次切换到新 index 时，先播放动画再展示结果
  useEffect(() => {
    if (!visible || queue.length === 0) return
    setPhase('playing')
    // 1.5秒后显示结果
    timerRef.current = setTimeout(() => {
      setPhase('revealed')
    }, 1500)
    return () => clearTimeout(timerRef.current)
  }, [index, visible])

  // visible 变化时重置
  useEffect(() => {
    if (visible) {
      setIndex(0)
      setPhase('playing')
    }
  }, [visible])

  if (!visible || queue.length === 0) return null

  const current = queue[index]
  // ✅ 保护：index 越界时直接关闭动画
  if (!current) {
    onComplete()
    return null
  }
  const isLast  = index === queue.length - 1

  function handleNext() {
    clearTimeout(timerRef.current)
    if (isLast) {
      onComplete()
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleSkipAll() {
    clearTimeout(timerRef.current)
    onComplete()
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>

        {/* 顶部进度指示 */}
        <div className={styles.topBar}>
          <div className={styles.topProgress}>
            {queue.map((_, i) => (
              <div
                key={i}
                className={`${styles.topDot} ${
                  i < index ? styles.topDotDone :
                  i === index ? styles.topDotActive : ''
                }`}
              />
            ))}
          </div>
          <span className={styles.topCount}>{index + 1} / {queue.length}</span>
        </div>

        {/* 比赛卡片 */}
        <MatchCard
          key={index}
          item={current}
          phase={phase}
          onNext={handleNext}
          isLast={isLast}
          onSkipAll={handleSkipAll}
        />

      </div>
    </div>
  )
}
