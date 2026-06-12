import { useState } from 'react'
import { useGameCtx } from '../App'
// ✅ 不再从 mockData 导入 recruitCoaches / recruitPlayers
//    改为从全局 state 读取，这样每周刷新后数据会自动更新
import styles from './RecruitPage.module.css'

const LEVEL_CLASS = {
  elite: styles.levelElite, senior: styles.levelSenior,
  normal: styles.levelNormal, assistant: styles.levelAssistant,
}
const TALENT_CLASS = {
  '万里挑一': styles.talentS, '天赋异禀': styles.talentA,
  '资质优良': styles.talentB, '平平无奇': styles.talentC, '天生愚钝': styles.talentD,
}
const HEALTH_LABEL = { healthy: '健康', minor: '轻伤', major: '重伤' }
const HEALTH_CLASS  = { healthy: styles.tagHealthy, minor: styles.tagMinor, major: styles.tagMajor }

// 教练设施要求 → 匹配俱乐部设施类型和最低级别
const FACILITY_REQUIRE_MAP = {
  '高级健身房':  { type: 'gym',    minLevel: '高级' },
  '高级休息室':  { type: 'lounge', minLevel: '高级' },
  '顶级健身房':  { type: 'gym',    minLevel: '顶级' },
  '顶级休息室':  { type: 'lounge', minLevel: '顶级' },
  '高级球场':    { type: 'hard_court', minLevel: '高级' },
  '高级会议室':  { type: 'meeting', minLevel: '高级' },
}
const LEVEL_ORDER = { 糟糕: 0, 普通: 1, 高级: 2, 顶级: 3 }

// ✅ 设施检查：返回 { met, reason }
// met=true 表示满足，met=false 表示不满足并说明原因
function checkFacilityRequirement(requiresFacility, facilities) {
  if (!requiresFacility) return { met: true, reason: '' }
  const req = FACILITY_REQUIRE_MAP[requiresFacility]
  if (!req) return { met: true, reason: '' }

  const found = facilities.find(f => f.type === req.type)
  if (!found) return { met: false, reason: `需要建设${requiresFacility}` }

  const facilityLevelNum = LEVEL_ORDER[found.level] ?? 0
  const requiredLevelNum = LEVEL_ORDER[req.minLevel] ?? 0
  if (facilityLevelNum < requiredLevelNum) {
    return {
      met: false,
      reason: `${found.name}需升级至${req.minLevel}（当前${found.level}）`,
    }
  }
  return { met: true, reason: '' }
}

function MiniBar({ value, color = 'forest' }) {
  return (
    <div className={styles.barWrap}>
      <div className={`${styles.barFill} ${styles[`bar_${color}`]}`} style={{ width: `${value}%` }} />
    </div>
  )
}

// ── 确认弹窗 ──────────────────────────────────────────
function ConfirmModal({ type, item, onConfirm, onCancel, facilityCheck, confirming }) {
  const isCoach  = type === 'coach'
  const isPlayer = type === 'player'
  const canConfirm = (isPlayer || !facilityCheck || facilityCheck.met) && !confirming

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalIcon}>
          <i className={`ti ${isCoach ? 'ti-user-star' : 'ti-users'}`} aria-hidden="true" />
        </div>
        <h3 className={styles.modalTitle}>确认{isCoach ? '聘用' : '招募'} {item.name}？</h3>
        <div className={styles.modalBody}>
          {isCoach && (
            <>
              <div className={styles.modalRow}>
                <span>周工资</span>
                <strong>¥{item.weeklySalary.toLocaleString()}</strong>
              </div>
              <div className={styles.modalRow}>
                <span>合同年限</span>
                <strong>{item.contractYears} 年</strong>
              </div>
              <div className={styles.modalRow}>
                <span>训练加成</span>
                <strong>{item.expBonus}</strong>
              </div>
              {/* ✅ 设施要求展示：满足绿色 / 不满足红色警告 */}
              {item.requiresFacility && facilityCheck && (
                facilityCheck.met ? (
                  <div className={`${styles.modalRow} ${styles.modalOk}`}>
                    <i className="ti ti-check" aria-hidden="true" />
                    <span>设施要求已满足：{item.requiresFacility}</span>
                  </div>
                ) : (
                  <div className={`${styles.modalRow} ${styles.modalWarn}`}>
                    <i className="ti ti-alert-triangle" aria-hidden="true" />
                    <span>⚠️ {facilityCheck.reason}，无法聘用</span>
                  </div>
                )
              )}
            </>
          )}
          {isPlayer && (
            <>
              <div className={styles.modalRow}>
                <span>年龄</span>
                <strong>{item.age} 岁 · {item.height} cm</strong>
              </div>
              <div className={styles.modalRow}>
                <span>天赋</span>
                <strong>{item.talentLabel}</strong>
              </div>
              {item.joinFee > 0 && (
                <div className={`${styles.modalRow} ${styles.modalInfo}`}>
                  <i className="ti ti-info-circle" aria-hidden="true" />
                  <span>需要生活补助 ¥{item.joinFee}/周</span>
                </div>
              )}
              {item.health !== 'healthy' && (
                <div className={`${styles.modalRow} ${styles.modalWarn}`}>
                  <i className="ti ti-alert-triangle" aria-hidden="true" />
                  <span>当前状态：{HEALTH_LABEL[item.health]}</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className={styles.modalActions}>
          <button className={styles.btnCancel} onClick={onCancel}>取消</button>
          {/* ✅ 设施不满足时按钮置灰禁用 */}
          <button
            className={styles.btnConfirm}
            onClick={() => canConfirm && onConfirm(item)}
            disabled={!canConfirm}
            style={!canConfirm ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
          >
            {canConfirm ? `确认${isCoach ? '聘用' : '招募'}` : confirming ? '处理中…' : '设施不足，无法聘用'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 教练招募卡片 ──────────────────────────────────────
function CoachRecruitCard({ coach, onRecruit, facilityCheck }) {
  // ✅ 设施不满足时卡片按钮也禁用
  const canRecruit = facilityCheck?.met !== false

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={`${styles.avatar} ${LEVEL_CLASS[coach.level]}`}>{coach.name.charAt(0)}</div>
        <div className={styles.cardInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{coach.name}</span>
            <span className={`${styles.levelTag} ${LEVEL_CLASS[coach.level]}`}>{coach.levelLabel}</span>
          </div>
          <div className={styles.meta}>
            {coach.gender === 'male' ? '男' : '女'} · {coach.age} 岁 · ¥{coach.weeklySalary.toLocaleString()}/周
          </div>
          <div className={styles.tagRow}>
            <span className={`${styles.styleTag} ${
              coach.style === 'strict'  ? styles.styleStrict  :
              coach.style === 'relaxed' ? styles.styleRelaxed : styles.styleFree
            }`}>{coach.styleLabel}</span>
            <span className={styles.bonusTag}>{coach.expBonus}</span>
            <span className={styles.contractTag}>{coach.contractYears} 年合同</span>
          </div>
        </div>
      </div>

      <div className={styles.highlight}>
        <i className="ti ti-award" aria-hidden="true" />
        <span>{coach.careerHighlight}</span>
      </div>

      {coach.specialSkills?.length > 0 && (
        <div className={styles.skillRow}>
          {coach.specialSkills.map(s => <span key={s} className={styles.skillBadge}>{s}</span>)}
        </div>
      )}

      {/* ✅ 可传授技能展示（新字段） */}
      {coach.skills?.length > 0 && (
        <div className={styles.skillRow}>
          <span className={styles.skillLabel}>可传授：</span>
          {coach.skills.map(s => (
            <span key={s} className={`${styles.skillBadge} ${styles.skillBadgeTeach}`}>{s}</span>
          ))}
        </div>
      )}

      <p className={styles.bio}>{coach.bio}</p>

      {/* ✅ 设施要求横幅：满足绿色，不满足红色 */}
      {coach.requiresFacility && (
        <div className={canRecruit ? styles.requireBannerOk : styles.requireBanner}>
          <i className={`ti ${canRecruit ? 'ti-check' : 'ti-alert-triangle'}`} aria-hidden="true" />
          {canRecruit
            ? `设施要求已满足：${coach.requiresFacility}`
            : `⚠️ ${facilityCheck?.reason || `需要设施：${coach.requiresFacility}`}`}
        </div>
      )}

      {/* ✅ 设施不满足时按钮置灰 */}
      <button
        className={styles.recruitBtn}
        onClick={() => canRecruit && onRecruit(coach)}
        disabled={!canRecruit}
        style={!canRecruit ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
      >
        <i className="ti ti-user-plus" aria-hidden="true" />
        {canRecruit ? '聘用教练' : '设施不足'}
      </button>
    </div>
  )
}

// ── 球员招募卡片 ──────────────────────────────────────
function PlayerRecruitCard({ player, onRecruit }) {
  const techAvg = Math.round((player.serve + player.forehand + player.backhand + player.footwork) / 4)
  const physAvg = Math.round((player.strength + player.stamina + player.agility) / 3)

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.playerAvatar}>{player.name.charAt(0)}</div>
        <div className={styles.cardInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{player.name}</span>
            <span className={`${styles.talentTag} ${TALENT_CLASS[player.talentLabel]}`}>{player.talentLabel}</span>
          </div>
          <div className={styles.meta}>
            {player.gender === 'male' ? '男' : '女'} · {player.age} 岁 · {player.height} cm · {player.weight} kg
          </div>
          <div className={styles.tagRow}>
            <span className={`${styles.healthTag} ${HEALTH_CLASS[player.health]}`}>{HEALTH_LABEL[player.health]}</span>
            {player.ranking && <span className={styles.rankTag}>#{player.ranking}</span>}
            {player.joinFee > 0 && (
              <span className={styles.feeTag}><i className="ti ti-coin-yuan" aria-hidden="true" /> 需补助</span>
            )}
            {player.currentClub && player.currentClub !== '无' && (
              <span className={styles.clubTag}><i className="ti ti-building" aria-hidden="true" /> {player.currentClub}</span>
            )}
          </div>
        </div>
      </div>
      <div className={styles.statPreview}>
        <div className={styles.statPreviewItem}>
          <span className={styles.statLabel}>技术均值</span>
          <MiniBar value={techAvg} color={techAvg >= 70 ? 'gold' : 'forest'} />
          <span className={styles.statVal}>{techAvg}</span>
        </div>
        <div className={styles.statPreviewItem}>
          <span className={styles.statLabel}>身体均值</span>
          <MiniBar value={physAvg} color={physAvg >= 70 ? 'gold' : 'forest'} />
          <span className={styles.statVal}>{physAvg}</span>
        </div>
      </div>
      {player.skills?.length > 0 && (
        <div className={styles.skillRow}>
          {player.skills.map(s => <span key={s} className={styles.skillBadge}>{s}</span>)}
        </div>
      )}
      <p className={styles.bio}>{player.note}</p>
      <button className={styles.recruitBtn} onClick={() => onRecruit(player)}>
        <i className="ti ti-user-plus" aria-hidden="true" /> 招募球员
      </button>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function RecruitPage() {
  const { state, dispatch } = useGameCtx()
  const [tab, setTab]             = useState('players')
  const [pending, setPending]     = useState(null)
  const [accepted, setAccepted]   = useState([])
  const [confirming, setConfirming] = useState(false)  // ✅ 防双击重复招募

  const facilities = state.facilities || []

  // ✅ 从全局 state 读取招募候选人，不再用 mockData 静态数据
  // 第一次进游戏时 state 里还没有，fallback 到空数组（下一周后会自动生成）
  const stateRecruitCoaches = state.recruitCoaches || []
  const stateRecruitPlayers = state.recruitPlayers || []

  const available = tab === 'coaches'
    ? stateRecruitCoaches.filter(c => !accepted.includes(`coach-${c.id}`))
    : stateRecruitPlayers.filter(p => !accepted.includes(`player-${p.id}`))

  function handleRecruit(item) {
    setPending({ type: tab === 'coaches' ? 'coach' : 'player', item })
  }

  function handleConfirm(item) {
    if (confirming) return  // ✅ 防止双击：已在处理中则忽略
    setConfirming(true)
    if (tab === 'coaches') {
      const check = checkFacilityRequirement(item.requiresFacility, facilities)
      if (!check.met) return  // 不满足设施要求，静默拦截

      const newCoach = {
        ...item,
        contractWeeksLeft: (item.contractYears || 1) * 52,
        studentCount: 0,
        totalStudents: item.totalStudents || 8,
        loyalty: 70,
      }
      dispatch({ type: 'ADD_COACH', coach: newCoach })
      dispatch({
        type: 'ADD_NEWS',
        news: {
          id: Date.now(), type: 'coach',
          text: `成功聘用教练${item.name}（${item.levelLabel}），合同 ${item.contractYears} 年。`,
          week: state.gameState.week,
        },
      })
    } else {
      // 球员：补全所有 weekEngine 需要的字段，避免计算报错
      const newPlayer = {
        pressure:     50,
        willpower:    50,
        focus:        50,
        returnServe:  45,
        volley:       35,
        loyalty:      65,
        ranking:      null,
        points:       0,
        injuryResist: 65,
        expPool:      {},
        fatigue:      20,
        inMatch:      false,
        matchEventId: null,
        ...item,
        isSponsored: item.joinFee > 0,
      }
      dispatch({ type: 'ADD_PLAYER', player: newPlayer })
      dispatch({
        type: 'ADD_NEWS',
        news: {
          id: Date.now(), type: 'player',
          text: `成功招募球员${item.name}（${item.talentLabel}，${item.age}岁），加入俱乐部。`,
          week: state.gameState.week,
        },
      })
    }

    // 从本周列表移除
    const key = tab === 'coaches' ? `coach-${item.id}` : `player-${item.id}`
    setAccepted(prev => [...prev, key])
    setPending(null)
    setConfirming(false)  // ✅ 解除锁定
  }

  const pendingFacilityCheck = pending?.type === 'coach'
    ? checkFacilityRequirement(pending.item.requiresFacility, facilities)
    : null

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>招募市场</h1>
      </header>

      <div className={styles.inner}>
        <div className={styles.infoBanner}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>招募市场每周刷新，声望越高出现的候选人等级越高。</span>
        </div>

        {/* ✅ Tab 计数显示实时数量 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'players' ? styles.tabActive : ''}`}
            onClick={() => setTab('players')}
          >
            <i className="ti ti-users" aria-hidden="true" /> 申请球员
            <span className={styles.tabCount}>{stateRecruitPlayers.length}</span>
          </button>
          <button
            className={`${styles.tab} ${tab === 'coaches' ? styles.tabActive : ''}`}
            onClick={() => setTab('coaches')}
          >
            <i className="ti ti-user-star" aria-hidden="true" /> 待招教练
            <span className={styles.tabCount}>{stateRecruitCoaches.length}</span>
          </button>
        </div>

        {available.length > 0 ? (
          <div className={styles.list}>
            {tab === 'coaches'
              ? available.map(c => (
                  <CoachRecruitCard
                    key={c.id}
                    coach={c}
                    onRecruit={handleRecruit}
                    facilityCheck={checkFacilityRequirement(c.requiresFacility, facilities)}
                  />
                ))
              : available.map(p => (
                  <PlayerRecruitCard key={p.id} player={p} onRecruit={handleRecruit} />
                ))
            }
          </div>
        ) : (
          <div className={styles.empty}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <p>
              {stateRecruitCoaches.length === 0 && stateRecruitPlayers.length === 0
                ? '进入下一周后市场将刷新候选人'
                : '本周候选人已处理完毕'}
            </p>
            <span>下周会有新的候选人出现</span>
          </div>
        )}
      </div>

      {pending && (
        <ConfirmModal
          type={pending.type}
          item={pending.item}
          onConfirm={handleConfirm}
          onCancel={() => { setPending(null); setConfirming(false) }}
          facilityCheck={pendingFacilityCheck}
          confirming={confirming}
        />
      )}
    </div>
  )
}
