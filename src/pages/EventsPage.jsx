import { useState, useMemo } from 'react'
import { useGameCtx } from '../App'
import {
  allEvents, eventHistory,
  hostEventConfig,
} from '../data/mockData'
import styles from './EventsPage.module.css'

// ── 常量 ──────────────────────────────────────────────
const LEVEL_META = {
  slam: { cls: styles.badgeSlam, color: '#9a6e0a' },
  '1000': { cls: styles.badge1000, color: '#1a4090' },
  '500':  { cls: styles.badge500,  color: '#1a6010' },
  '250':  { cls: styles.badge250,  color: '#2a6858' },
  itf:    { cls: styles.badgeItf,  color: '#5a2a8a' },
}
const SURFACE_ICON  = { 硬地: 'ti-rectangle', 红土: 'ti-circle', 草地: 'ti-leaf' }
const SURFACE_COLOR = { 硬地: '#2a5fa8', 红土: '#b8562a', 草地: '#2a7a3a' }

const ROUND_ORDER = ['r1','r2','r3','qf','sf','runner_up','champion']
const ROUND_LABEL = {
  r1: '首轮', r2: '第二轮', r3: '第三轮',
  qf: '四强', sf: '半决赛', runner_up: '亚军', champion: '冠军',
}

function weeksUntil(week, currentWeek) { return week - currentWeek }
function getStatus(event, currentWeek) {
  const diff = weeksUntil(event.week, currentWeek)
  if (diff < 0)             return 'past'
  if (diff === 0 || diff === 1) return 'ongoing'
  if (diff <= 4)            return 'soon'
  return 'upcoming'
}
function getEligiblePlayers(event, players) {
  return players.filter(p => {
    if (event.level === 'itf')  return p.age >= 14 && p.age < 18
    if (event.level === 'slam') return p.ranking && p.ranking <= 150
    if (event.level === '1000') return p.ranking && p.ranking <= 300
    if (event.level === '500')  return p.ranking && p.ranking <= 500
    if (event.level === '250')  return p.age >= 18
    return false
  })
}

function LevelBadge({ level, label }) {
  const meta = LEVEL_META[level] || LEVEL_META['250']
  return <span className={`${styles.badge} ${meta.cls}`}>{label}</span>
}

// ════════════════════════════════════════════════════════
// ✅ 战报弹窗
// 兼容两种数据格式：
//   - 完整格式（weekEngine 生成）：含 matchResults 逐轮数据
//   - 简版格式（mockData eventHistory）：只有 results 汇总
// ════════════════════════════════════════════════════════
function MatchReportModal({ record, onClose, players }) {
  const isFullReport = Array.isArray(record.matchResults) && record.matchResults.length > 0
  const [activePlayer, setActivePlayer] = useState(0)

  const playerReports = isFullReport ? record.matchResults : null
  const currentReport = playerReports?.[activePlayer]

  // 通过 playerId 从 players 数组查性别
  function getGender(r) {
    if (players) {
      const found = players.find(p => p.id === r.playerId)
      if (found) return found.gender
    }
    return r.gender || null
  }

  const maleReports   = playerReports?.filter(r => getGender(r) === 'male')   ?? []
  const femaleReports = playerReports?.filter(r => getGender(r) === 'female') ?? []
  const hasBothGenders = maleReports.length > 0 && femaleReports.length > 0

  function renderSummaryCard(r) {
    const realIndex = playerReports?.indexOf(r) ?? 0
    return (
      <button
        key={r.playerId}
        className={`${styles.reportSummaryCard} ${activePlayer === realIndex ? styles.reportSummaryCardActive : ''}`}
        onClick={() => setActivePlayer(realIndex)}
      >
        <div className={styles.reportSummaryAvatar}>{r.playerName?.charAt(0)}</div>
        <div className={styles.reportSummaryInfo}>
          <span className={styles.reportSummaryName}>{r.playerName}</span>
          <span className={`${styles.reportSummaryResult} ${
            r.finalRound === 'champion'  ? styles.reportResultChampion :
            r.finalRound === 'runner_up' ? styles.reportResultRunnerUp :
            ['sf','qf'].includes(r.finalRound) ? styles.reportResultGood : ''
          }`}>
            {r.finalRoundLabel ?? ROUND_LABEL[r.finalRound] ?? r.finalRound}
          </span>
          {r.prize > 0 && (
            <span className={styles.reportSummaryPrize}>+¥{r.prize.toLocaleString()}</span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.reportPanel} onClick={e => e.stopPropagation()}>

        {/* ── 头部 ── */}
        <div className={styles.reportHeader}>
          <div>
            <div className={styles.detailTagRow}>
              <LevelBadge level={record.level} label={record.levelLabel} />
              {record.surface && (
                <span className={styles.surfaceTag} style={{ color: SURFACE_COLOR[record.surface] }}>
                  <i className={`ti ${SURFACE_ICON[record.surface]}`} aria-hidden="true" />
                  {record.surface}
                </span>
              )}
            </div>
            <div className={styles.reportTitle}>{record.eventName}</div>
            <div className={styles.reportSubtitle}>
              第 {record.year ?? '—'} 年 · 第 {record.week ?? '—'} 周
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.reportBody}>

          {/* ── 汇总成绩卡：男女分列 ── */}
          {isFullReport ? (
            hasBothGenders ? (
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-muted)', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-gender-male" style={{ fontSize: 12, color: '#2a5fa8' }} /> 男子签表
                  </div>
                  <div className={styles.reportSummaryRow}>
                    {maleReports.map(r => renderSummaryCard(r))}
                  </div>
                </div>
                <div style={{ width: '0.5px', background: 'var(--cream-dark)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-muted)', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-gender-female" style={{ fontSize: 12, color: '#b8396a' }} /> 女子签表
                  </div>
                  <div className={styles.reportSummaryRow}>
                    {femaleReports.map(r => renderSummaryCard(r))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-muted)', letterSpacing: '0.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {maleReports.length > 0
                    ? <><i className="ti ti-gender-male" style={{ fontSize: 12, color: '#2a5fa8' }} /> 男子签表</>
                    : <><i className="ti ti-gender-female" style={{ fontSize: 12, color: '#b8396a' }} /> 女子签表</>
                  }
                </div>
                <div className={styles.reportSummaryRow}>
                  {playerReports.map(r => renderSummaryCard(r))}
                </div>
              </div>
            )
          ) : (
            <div className={styles.reportSummaryRow} style={{ marginBottom: 12 }}>
              {(record.results ?? []).map((r, i) => (
                <div key={i} className={styles.reportSummaryCard}>
                  <div className={styles.reportSummaryAvatar}>{r.playerName?.charAt(0)}</div>
                  <div className={styles.reportSummaryInfo}>
                    <span className={styles.reportSummaryName}>{r.playerName}</span>
                    <span className={styles.reportSummaryResult}>{r.round}</span>
                    {r.prize > 0 && (
                      <span className={styles.reportSummaryPrize}>+¥{r.prize.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── 总奖金 ── */}
          {(record.totalPrize > 0) && (
            <div className={styles.reportTotalPrize}>
              <i className="ti ti-currency-yen" aria-hidden="true" />
              本次赛事总奖金
              <strong>+¥{record.totalPrize.toLocaleString()}</strong>
            </div>
          )}

          {/* ✅ 赛事冠军 */}
          {(record.maleChampion || record.femaleChampion || record.champion) && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              background: 'linear-gradient(135deg, #f5edda, #fdf6e3)',
              border: '1px solid var(--gold)', borderRadius: 10,
              padding: '10px 14px', marginBottom: 12,
            }}>
              {(record.maleChampion || (!record.femaleChampion && record.champion)) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏆</span>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                      {record.femaleChampion ? '男子冠军' : '本届冠军'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#9a6e0a' }}>
                      {record.maleChampion || record.champion}
                    </div>
                  </div>
                </div>
              )}
              {record.femaleChampion && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏆</span>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>女子冠军</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#9a6e0a' }}>
                      {record.femaleChampion}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {isFullReport && currentReport && (
            <div className={styles.reportRounds}>
              <div className={styles.reportRoundsTitle}>
                <i className="ti ti-timeline" aria-hidden="true" />
                {currentReport.playerName} · 逐轮战报
              </div>

              {/* 进度时间轴 */}
              <div className={styles.reportTimeline}>
                {(currentReport.matchResults ?? []).map((match, idx) => {
                  const isWin  = match.result === 'win' || match.result === 'champion'
                  const isLast = idx === (currentReport.matchResults.length - 1)
                  return (
                    <div key={idx} className={styles.reportTimelineItem}>
                      {/* 左侧竖线 + 节点 */}
                      <div className={styles.reportTimelineLeft}>
                        <div className={`${styles.reportTimelineNode} ${
                          isWin ? styles.nodeWin : styles.nodeLose
                        }`}>
                          <i className={`ti ${isWin ? 'ti-check' : 'ti-x'}`} aria-hidden="true" />
                        </div>
                        {!isLast && <div className={styles.reportTimelineLine} />}
                      </div>

                      {/* 右侧内容 */}
                      <div className={styles.reportTimelineContent}>
                        <div className={styles.reportRoundHeader}>
                          <span className={styles.reportRoundLabel}>
                            {match.roundLabel ?? ROUND_LABEL[match.round] ?? match.round}
                          </span>
                          <span className={`${styles.reportRoundResult} ${
                            isWin ? styles.reportRoundWin : styles.reportRoundLose
                          }`}>
                            {match.result === 'champion' ? '🏆 夺冠' : isWin ? '胜' : '负'}
                          </span>
                        </div>

                        {/* 对手信息（冠军轮无对手） */}
                        {match.opponent && (
                          <div className={styles.reportOpponent}>
                            <div className={styles.reportOpponentLeft}>
                              <div className={styles.reportOpponentAvatar}>
                                {match.opponent.name?.charAt(0)}
                              </div>
                              <div>
                                <div className={styles.reportOpponentName}>
                                  {match.opponent.name}
                                  {match.opponent.nationality && (
                                    <span className={styles.reportOpponentNat}>
                                      · {match.opponent.nationality}
                                    </span>
                                  )}
                                </div>
                                {match.opponent.ranking && (
                                  <div className={styles.reportOpponentRank}>
                                    世界排名 #{match.opponent.ranking}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 战力对比 */}
                            {match.myPower != null && match.oppPower != null && (
                              <div className={styles.reportPowerBar}>
                                <div className={styles.reportPowerLabel}>
                                  <span style={{ color: 'var(--forest)' }}>
                                    战力 {match.myPower}
                                  </span>
                                  <span style={{ color: 'var(--ink-faint)', fontSize: 10 }}>vs</span>
                                  <span style={{ color: 'var(--ink-mid)' }}>
                                    {match.oppPower}
                                  </span>
                                </div>
                                <div className={styles.reportPowerTrack}>
                                  <div
                                    className={styles.reportPowerFill}
                                    style={{
                                      width: `${Math.round(match.myPower / (match.myPower + match.oppPower) * 100)}%`
                                    }}
                                  />
                                </div>
                                <div className={styles.reportWinProb}>
                                  胜率 {match.winProb}%
                                </div>
                              </div>
                            )}

                            {/* ✅ 比分展示 */}
                            {match.score?.playerSets?.length > 0 && (
                              <div className={styles.reportScore}>
                                <div className={styles.reportScoreRow}>
                                  <span className={styles.reportScoreName}>
                                    {currentReport.playerName}
                                  </span>
                                  <div className={styles.reportScoreSets}>
                                    {match.score.playerSets.map((g, si) => (
                                      <span
                                        key={si}
                                        className={`${styles.reportScoreSet} ${
                                          g > match.score.oppSets[si]
                                            ? styles.reportScoreSetWin
                                            : styles.reportScoreSetLose
                                        }`}
                                      >{g}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className={styles.reportScoreRow}>
                                  <span className={styles.reportScoreName}>
                                    {match.opponent?.name}
                                  </span>
                                  <div className={styles.reportScoreSets}>
                                    {match.score.oppSets.map((g, si) => (
                                      <span
                                        key={si}
                                        className={`${styles.reportScoreSet} ${
                                          g > match.score.playerSets[si]
                                            ? styles.reportScoreSetWin
                                            : styles.reportScoreSetLose
                                        }`}
                                      >{g}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* ✅ 叙述文字 */}
                            {match.narrative && (
                              <div className={styles.reportNarrative}>
                                {match.narrative}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 积分获得（仅最终轮显示） */}
                        {isLast && currentReport.points > 0 && (
                          <div className={styles.reportPoints}>
                            <i className="ti ti-star" aria-hidden="true" />
                            获得积分 +{currentReport.points}
                            {currentReport.prize > 0 && (
                              <span className={styles.reportPointsPrize}>
                                · 奖金 +¥{currentReport.prize.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 简版格式：无逐轮数据时的提示 ── */}
          {!isFullReport && (
            <div className={styles.reportNoDetail}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              <span>该场赛事为历史导入数据，暂无逐轮战报。</span>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── 赛事详情弹窗 ──────────────────────────────────────
function EventDetail({ event, entry, onClose, onEnter, onWithdraw, players, currentWeek }) {
  const eligible  = getEligiblePlayers(event, players)
  const isEntered = !!entry
  const weeksAway = weeksUntil(event.week, currentWeek)
  const status    = getStatus(event, currentWeek)
  // ✅ 始终从空数组开始，已报名球员通过已选中状态标记显示，不预填
  const [selectedPlayers, setSelectedPlayers] = useState(entry?.playerIds ? [...entry.playerIds] : [])

  function togglePlayer(id) {
    setSelectedPlayers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.detailHeader}>
          <div>
            <div className={styles.detailTagRow}>
              <LevelBadge level={event.level} label={event.levelLabel} />
              <span className={styles.surfaceTag} style={{ color: SURFACE_COLOR[event.surface] }}>
                <i className={`ti ${SURFACE_ICON[event.surface]}`} aria-hidden="true" />
                {event.surface}
              </span>
            </div>
            <div className={styles.detailName}>{event.name}</div>
            <div className={styles.detailMeta}>
              第 {event.week} 周 · 持续 {event.duration} 周 · {event.qualify}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.detailBody}>
          <div className={`${styles.statusCard} ${
            status === 'soon' ? styles.statusSoon :
            status === 'ongoing' ? styles.statusOngoing : styles.statusNormal
          }`}>
            <i className={`ti ${
              status === 'past' ? 'ti-check' :
              status === 'ongoing' ? 'ti-activity' :
              status === 'soon' ? 'ti-alarm' : 'ti-calendar'
            }`} aria-hidden="true" />
            <span>
              {status === 'past'    ? '赛事已结束' :
               status === 'ongoing' ? '赛事进行中' :
               status === 'soon'    ? `距开赛仅剩 ${weeksAway} 周` :
               `距开赛还有 ${weeksAway} 周`}
            </span>
            {isEntered && <span className={styles.enteredPill}>已报名</span>}
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-users" aria-hidden="true" />
              可参赛球员（{eligible.length} 人符合资格）
            </div>
            {eligible.length > 0 ? (
              <div className={styles.playerGrid}>
                {eligible.map(p => {
                  const sel = selectedPlayers.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      className={`${styles.playerBtn} ${sel ? styles.playerBtnSel : ''}`}
                      onClick={() => togglePlayer(p.id)}
                      disabled={status === 'past'}
                    >
                      <div className={styles.playerBtnAvatar}>{p.name.charAt(0)}</div>
                      <div className={styles.playerBtnInfo}>
                        <span className={styles.playerBtnName}>{p.name}</span>
                        <span className={styles.playerBtnMeta}>
                          {p.age}岁{p.ranking ? ` · #${p.ranking}` : ''}
                        </span>
                      </div>
                      {sel && <i className="ti ti-check" style={{ color: 'var(--gold)', fontSize: 14 }} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className={styles.noEligible}>
                <i className="ti ti-lock" aria-hidden="true" /> 暂无球员符合参赛资格
              </p>
            )}
          </div>

          {status !== 'past' && (
            <div className={styles.actionRow}>
              {/* ✅ 统一显示"确认报名"，可增删球员后重新提交 */}
              <button
                className={styles.btnEnter}
                disabled={selectedPlayers.length === 0 || eligible.length === 0}
                onClick={() => { onEnter(event.id, selectedPlayers); onClose() }}
              >
                <i className="ti ti-send" aria-hidden="true" />
                {selectedPlayers.length > 0
                  ? `确认报名（${selectedPlayers.length} 人）`
                  : '请先选择球员'}
              </button>
              {/* ✅ 已报名时额外显示取消报名按钮 */}
              {isEntered && (
                <button className={styles.btnWithdraw} onClick={() => { onWithdraw(event.id); onClose() }}>
                  <i className="ti ti-x" aria-hidden="true" /> 取消报名
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 承办赛事弹窗 ──────────────────────────────────────
function HostModal({ onClose }) {
  const [size, setSize] = useState('small')
  const cfg       = hostEventConfig[size]
  const estIncome = cfg.regFee * cfg.regMax * 0.7 + cfg.ticketFee * cfg.ticketMax * 0.6
  const estProfit = estIncome - cfg.cost

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.hostPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.hostHeader}>
          <span className={styles.hostTitle}>承办比赛</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.hostBody}>
          <div className={styles.sizeRow}>
            {[{ k:'small',l:'小型赛事' },{ k:'medium',l:'中型赛事' },{ k:'large',l:'大型赛事' }].map(({k,l}) => (
              <button key={k} className={`${styles.sizeBtn} ${size===k ? styles.sizeBtnActive : ''}`} onClick={() => setSize(k)}>{l}</button>
            ))}
          </div>
          <div className={styles.hostGrid}>
            <div className={styles.hostBox}><span className={styles.hostBoxVal}>¥{(cfg.cost/10000).toFixed(0)}万</span><span className={styles.hostBoxLbl}>承办成本</span></div>
            <div className={styles.hostBox}><span className={styles.hostBoxVal}>¥{cfg.regFee}</span><span className={styles.hostBoxLbl}>报名费/人</span></div>
            <div className={styles.hostBox}><span className={styles.hostBoxVal}>{cfg.regMax}人</span><span className={styles.hostBoxLbl}>报名上限</span></div>
            <div className={styles.hostBox}><span className={styles.hostBoxVal}>+{cfg.prestige}</span><span className={styles.hostBoxLbl}>声望加成</span></div>
          </div>
          <div className={styles.hostEstimate}>
            <div className={styles.hostEstRow}><span>预估收入</span><strong className={styles.estIncome}>+¥{(estIncome/10000).toFixed(1)}万</strong></div>
            <div className={styles.hostEstRow}><span>承办成本</span><strong className={styles.estExpense}>-¥{(cfg.cost/10000).toFixed(0)}万</strong></div>
            <div className={`${styles.hostEstRow} ${styles.hostEstTotal}`}>
              <span>预估净利润</span>
              <strong className={estProfit >= 0 ? styles.estIncome : styles.estExpense}>
                {estProfit >= 0 ? '+' : ''}¥{(estProfit/10000).toFixed(1)}万
              </strong>
            </div>
          </div>
          <p className={styles.hostNote}>* 需提前 2 周申请，实际收入受参与人数影响。承办大型赛事需声望 ≥ 3000。</p>
        </div>
        <div className={styles.hostFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button className={styles.btnHost} onClick={() => { alert('承办功能开发中…'); onClose() }}>
            <i className="ti ti-flag" aria-hidden="true" /> 申请承办
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 赛事行 ────────────────────────────────────────────
function EventRow({ event, entry, onClick, currentWeek }) {
  const status    = getStatus(event, currentWeek)
  const weeksAway = weeksUntil(event.week, currentWeek)
  return (
    <div
      className={`${styles.eventRow} ${
        status === 'soon'    ? styles.eventSoon    :
        status === 'ongoing' ? styles.eventOngoing :
        status === 'past'    ? styles.eventPast    : ''
      }`}
      onClick={() => onClick(event)}
    >
      <div className={styles.eventLeft}>
        <LevelBadge level={event.level} label={event.levelLabel} />
        <div className={styles.eventInfo}>
          <span className={styles.eventName}>{event.name}</span>
          <span className={styles.eventSub}>
            第 {event.week} 周 &nbsp;·&nbsp;
            <span style={{ color: SURFACE_COLOR[event.surface] }}>
              <i className={`ti ${SURFACE_ICON[event.surface]}`} aria-hidden="true" /> {event.surface}
            </span>
            &nbsp;·&nbsp; {event.qualify}
          </span>
        </div>
      </div>
      <div className={styles.eventRight}>
        {entry && (
          <span className={styles.enteredTag}>
            <i className="ti ti-check" aria-hidden="true" /> {entry.playerIds.length}人
          </span>
        )}
        {status === 'past' ? (
          <span className={styles.weekTag} style={{ color: 'var(--ink-faint)' }}>已结束</span>
        ) : status === 'ongoing' ? (
          <span className={styles.weekTagOngoing}>进行中</span>
        ) : (
          <span className={`${styles.weekTag} ${status === 'soon' ? styles.weekTagSoon : ''}`}>
            {weeksAway === 0 ? '本周' : `${weeksAway}周后`}
          </span>
        )}
        <i className="ti ti-chevron-right" style={{ color: 'var(--ink-faint)', fontSize: 15 }} aria-hidden="true" />
      </div>
    </div>
  )
}

// ── ✅ 历史战绩行（可点击展开战报）──────────────────────
function HistoryRow({ record, onViewReport }) {
  // 判断是否有完整战报数据
  const hasFullReport = Array.isArray(record.matchResults) && record.matchResults.length > 0

  return (
    <div className={styles.historyRow}>
      <div className={styles.historyLeft}>
        <LevelBadge level={record.level} label={record.levelLabel} />
        <span className={styles.historyName}>{record.eventName}</span>
      </div>
      <div className={styles.historyRight}>
        <div className={styles.historyResults}>
          {(record.results ?? record.matchResults?.map(r => ({
            playerName: r.playerName,
            round: r.finalRoundLabel ?? ROUND_LABEL[r.finalRound] ?? r.finalRound,
          })) ?? []).map((r, i) => (
            <span key={i} className={styles.historyResult}>
              {r.playerName} <span className={styles.historyRound}>{r.round}</span>
            </span>
          ))}
          {record.totalPrize > 0 && (
            <span className={styles.historyPrize}>+¥{record.totalPrize.toLocaleString()}</span>
          )}
        </div>
        {/* ✅ 战报按钮 */}
        <button
          className={`${styles.reportBtn} ${hasFullReport ? styles.reportBtnFull : styles.reportBtnSimple}`}
          onClick={() => onViewReport(record)}
          title={hasFullReport ? '查看详细战报' : '查看简版战报'}
        >
          <i className="ti ti-file-report" aria-hidden="true" />
          战报
        </button>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function EventsPage() {
  const { state, dispatch } = useGameCtx()
  const { players, myEntries, gameState } = state
  const currentWeek = gameState.week

  const [selected, setSelected]         = useState(null)
  const [showHost, setShowHost]         = useState(false)
  const [filter, setFilter]             = useState('all')
  const [showHistory, setShowHistory]   = useState(false)
  const [reportRecord, setReportRecord] = useState(null)  // ✅ 当前查看战报的记录

  const filtered = useMemo(() => {
    return allEvents.filter(ev => {
      if (filter === 'entered')  return myEntries.some(e => e.eventId === ev.id)
      if (filter === 'itf')      return ev.level === 'itf'
      if (filter === 'pro')      return ev.level !== 'itf'
      if (filter === 'upcoming') return getStatus(ev, currentWeek) !== 'past'
      return true
    })
  }, [filter, myEntries, currentWeek])

  const enteredCount = myEntries.length
  const soonCount    = allEvents.filter(ev => {
    const diff = weeksUntil(ev.week, currentWeek)
    return diff >= 0 && diff <= 4
  }).length

  function handleEnter(eventId, playerIds) {
    dispatch({ type: 'ENTER_EVENT', eventId, playerIds })
  }
  function handleWithdraw(eventId) {
    dispatch({ type: 'WITHDRAW_EVENT', eventId })
  }

  // 历史战绩：优先用 state 里的，fallback 到 mockData
  const history = state.eventHistory ?? eventHistory

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>赛事管理</h1>
      </header>

      <div className={styles.inner}>

        {/* 概览 */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{allEvents.length}</span>
            <span className={styles.summaryLabel}>年度赛事</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${enteredCount > 0 ? styles.summaryGreen : ''}`}>{enteredCount}</span>
            <span className={styles.summaryLabel}>已报名</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${soonCount > 0 ? styles.summaryWarn : ''}`}>{soonCount}</span>
            <span className={styles.summaryLabel}>近4周赛事</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{history.length}</span>
            <span className={styles.summaryLabel}>历史战绩</span>
          </div>
        </div>

        {/* 操作按钮行 */}
        <div className={styles.actionBar}>
          <button className={styles.hostBtn} onClick={() => setShowHost(true)}>
            <i className="ti ti-flag" aria-hidden="true" /> 承办比赛
          </button>
          <button
            className={`${styles.historyBtn} ${showHistory ? styles.historyBtnActive : ''}`}
            onClick={() => setShowHistory(v => !v)}
          >
            <i className="ti ti-history" aria-hidden="true" /> 历史战绩
          </button>
        </div>

        {/* ✅ 历史战绩（每行加「战报」按钮）*/}
        {showHistory && (
          <div className={styles.historyCard}>
            <div className={styles.historyTitle}>历史战绩</div>
            {history.length > 0
              ? history.map(h => (
                  <HistoryRow
                    key={h.id}
                    record={h}
                    onViewReport={setReportRecord}
                  />
                ))
              : <p className={styles.noHistory}>暂无历史记录</p>
            }
          </div>
        )}

        {/* 筛选 */}
        <div className={styles.filterRow}>
          {[
            { v:'all',      l:'全部'      },
            { v:'upcoming', l:'即将开始'  },
            { v:'entered',  l:'已报名'    },
            { v:'itf',      l:'ITF青少年' },
            { v:'pro',      l:'职业赛'    },
          ].map(({ v, l }) => (
            <button
              key={v}
              className={`${styles.filterBtn} ${filter === v ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(v)}
            >{l}</button>
          ))}
        </div>

        {/* 赛事列表 */}
        <div className={styles.eventList}>
          {filtered.map(ev => (
            <EventRow
              key={ev.id}
              event={ev}
              entry={myEntries.find(e => e.eventId === ev.id)}
              onClick={setSelected}
              currentWeek={currentWeek}
            />
          ))}
        </div>

      </div>

      {/* 赛事详情弹窗 */}
      {selected && (
        <EventDetail
          event={selected}
          entry={myEntries.find(e => e.eventId === selected.id)}
          onClose={() => setSelected(null)}
          onEnter={handleEnter}
          onWithdraw={handleWithdraw}
          players={players}
          currentWeek={currentWeek}
        />
      )}

      {/* 承办弹窗 */}
      {showHost && <HostModal onClose={() => setShowHost(false)} />}

      {/* ✅ 战报弹窗 */}
      {reportRecord && (
        <MatchReportModal
          record={reportRecord}
          onClose={() => setReportRecord(null)}
          players={players}
        />
      )}
    </div>
  )
}
