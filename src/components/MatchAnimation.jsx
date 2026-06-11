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
    if (player._isSummaryCard) return  // 总结卡不参与轮次收集
    ;(player.matchResults || []).forEach(m => {
      if (m && m.round) allRounds.add(m.round)
    })
  })

  const sortedRounds = ROUND_ORDER.filter(r => allRounds.has(r))

  const queue = []
  sortedRounds.forEach(round => {
    matchData.forEach(player => {
      if (player._isSummaryCard) return
      const match = (player.matchResults || []).find(m => m && m.round === round)
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

  // ✅ 总结卡放在最后
  matchData.forEach(player => {
    if (player._isSummaryCard) {
      queue.push({ _isSummaryCard: true, ...player })
    }
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

// ── 赛事总结卡 ────────────────────────────────────────
function SummaryCard({ item, onNext, isLast, onSkipAll }) {
  const levelColor = LEVEL_COLOR[item.level] || '#4a5a48'
  const isOurChampion = item.bestResults?.some(r =>
    r.round === '冠军' || r.round === 'champion'
  )

  // 兼容旧字段 champion（单一冠军）和新字段 maleChampion/femaleChampion
  const maleChampion   = item.maleChampion   || (item.champion && !item.femaleChampion ? item.champion : null)
  const femaleChampion = item.femaleChampion || null
  const hasChampion    = maleChampion || femaleChampion

  return (
    <div className={styles.matchCard}>
      <div className={styles.cardHeader}>
        <span className={styles.eventTag} style={{ color: levelColor }}>
          {item.eventName}
        </span>
        <span className={styles.roundTag}>赛事总结</span>
      </div>

      <div style={{ padding: '20px 0 8px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          {isOurChampion ? '🏆' : '🎾'}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>
          {item.eventName} 赛事结束
        </div>

        {/* 男女冠军 */}
        {hasChampion && (
          <div style={{
            background: 'linear-gradient(135deg, #f5edda, #fdf6e3)',
            border: '1px solid var(--gold)',
            borderRadius: 10, padding: '10px 16px', marginBottom: 12,
          }}>
            {maleChampion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: femaleChampion ? 8 : 0 }}>
                <span style={{ fontSize: 16 }}>🏆</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>男子冠军</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#9a6e0a' }}>{maleChampion}</div>
                </div>
              </div>
            )}
            {femaleChampion && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏆</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>女子冠军</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#9a6e0a' }}>{femaleChampion}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 我方球员成绩 */}
        {item.bestResults?.length > 0 && (
          <div style={{
            background: 'var(--cream)', borderRadius: 10,
            padding: '10px 16px', textAlign: 'left',
          }}>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 8 }}>
              我方球员成绩
            </div>
            {item.bestResults.map((r, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 13, color: 'var(--ink)', marginBottom: 4,
              }}>
                <span>{r.playerName}</span>
                <span style={{ color: 'var(--forest)', fontWeight: 500 }}>{r.round}</span>
              </div>
            ))}
          </div>
        )}

        {/* 奖金 */}
        {item.totalPrize > 0 && (
          <div style={{ fontSize: 13, color: 'var(--ink-mid)', marginTop: 10 }}>
            总奖金收入：<span style={{ color: 'var(--forest)', fontWeight: 600 }}>
              ¥{item.totalPrize.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <button className={styles.skipAllBtn} onClick={onSkipAll}>
          跳过全部 <i className="ti ti-player-skip-forward" />
        </button>
        <button className={styles.nextBtn} onClick={onNext}>
          {isLast ? '查看本周总结' : '下一场'} <i className="ti ti-arrow-right" />
        </button>
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
    const current = queue[index]
    // ✅ 总结卡直接显示，不需要 playing 动画
    if (current?._isSummaryCard) {
      setPhase('revealed')
      return
    }
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

        {/* 比赛卡片 or 总结卡 */}
        {current._isSummaryCard ? (
          <SummaryCard
            key={`summary_${index}`}
            item={current}
            onNext={handleNext}
            isLast={isLast}
            onSkipAll={handleSkipAll}
          />
        ) : (
          <MatchCard
            key={index}
            item={current}
            phase={phase}
            onNext={handleNext}
            isLast={isLast}
            onSkipAll={handleSkipAll}
          />
        )}

      </div>
    </div>
  )
}
