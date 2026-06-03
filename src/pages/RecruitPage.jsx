import { useState } from 'react'
import { recruitCoaches, recruitPlayers } from '../data/mockData'
import { useGameCtx } from '../App'
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

function MiniBar({ value, color = 'forest' }) {
  return (
    <div className={styles.barWrap}>
      <div className={`${styles.barFill} ${styles[`bar_${color}`]}`} style={{ width: `${value}%` }} />
    </div>
  )
}

// ── 确认弹窗 ──────────────────────────────────────────
function ConfirmModal({ type, item, onConfirm, onCancel }) {
  const isCoach  = type === 'coach'
  const isPlayer = type === 'player'

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
              {item.requiresFacility && (
                <div className={`${styles.modalRow} ${styles.modalWarn}`}>
                  <i className="ti ti-alert-triangle" aria-hidden="true" />
                  <span>需要设施：{item.requiresFacility}</span>
                </div>
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
          <button className={styles.btnConfirm} onClick={() => onConfirm(item)}>
            确认{isCoach ? '聘用' : '招募'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 教练招募卡片 ──────────────────────────────────────
function CoachRecruitCard({ coach, onRecruit }) {
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
              coach.style === 'strict' ? styles.styleStrict :
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
      {coach.specialSkills.length > 0 && (
        <div className={styles.skillRow}>
          {coach.specialSkills.map(s => <span key={s} className={styles.skillBadge}>{s}</span>)}
        </div>
      )}
      <p className={styles.bio}>{coach.bio}</p>
      {coach.requiresFacility && (
        <div className={styles.requireBanner}>
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          需要设施：{coach.requiresFacility}
        </div>
      )}
      <button className={styles.recruitBtn} onClick={() => onRecruit(coach)}>
        <i className="ti ti-user-plus" aria-hidden="true" /> 聘用教练
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
              <span className={styles.feeTag}>
                <i className="ti ti-coin-yuan" aria-hidden="true" /> 需补助
              </span>
            )}
            {player.currentClub !== '无' && (
              <span className={styles.clubTag}>
                <i className="ti ti-building" aria-hidden="true" /> {player.currentClub}
              </span>
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
      {player.skills.length > 0 && (
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
  const [tab, setTab]         = useState('players')
  const [pending, setPending] = useState(null)
  const [accepted, setAccepted] = useState([])  // 本周已处理的 id

  const available = tab === 'coaches'
    ? recruitCoaches.filter(c => !accepted.includes(`coach-${c.id}`))
    : recruitPlayers.filter(p => !accepted.includes(`player-${p.id}`))

  function handleRecruit(item) {
    setPending({ type: tab === 'coaches' ? 'coach' : 'player', item })
  }

  function handleConfirm(item) {
    const key = tab === 'coaches' ? `coach-${item.id}` : `player-${item.id}`
    setAccepted(prev => [...prev, key])
    setPending(null)

    if (tab === 'coaches') {
      // 聘用教练：加入 state.coaches
      const newCoach = {
        ...item,
        contractWeeksLeft: item.contractYears * 52,
        studentCount: 0,
        totalStudents: 0,
        loyalty: 70,
      }
      dispatch({ type: 'ADD_COACH', coach: newCoach })
      dispatch({
        type: 'ADD_NEWS',
        news: {
          id: Date.now(),
          type: 'coach',
          text: `成功聘用教练${item.name}（${item.levelLabel}），合同 ${item.contractYears} 年。`,
          week: state.gameState.week,
        },
      })
    } else {
      // 招募球员：加入 state.players，若有补助费则登记
      const newPlayer = {
        ...item,
        isSponsored: item.joinFee > 0,  // 需要生活补助的视为赞助球员
        expPool: {},
      }
      dispatch({ type: 'ADD_PLAYER', player: newPlayer })
      dispatch({
        type: 'ADD_NEWS',
        news: {
          id: Date.now(),
          type: 'player',
          text: `成功招募球员${item.name}（${item.talentLabel}，${item.age}岁），加入俱乐部。`,
          week: state.gameState.week,
        },
      })
    }
  }

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

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'players' ? styles.tabActive : ''}`}
            onClick={() => setTab('players')}
          >
            <i className="ti ti-users" aria-hidden="true" />
            申请球员
            <span className={styles.tabCount}>{recruitPlayers.length}</span>
          </button>
          <button
            className={`${styles.tab} ${tab === 'coaches' ? styles.tabActive : ''}`}
            onClick={() => setTab('coaches')}
          >
            <i className="ti ti-user-star" aria-hidden="true" />
            待招教练
            <span className={styles.tabCount}>{recruitCoaches.length}</span>
          </button>
        </div>

        {available.length > 0 ? (
          <div className={styles.list}>
            {tab === 'coaches'
              ? available.map(c => <CoachRecruitCard key={c.id} coach={c} onRecruit={handleRecruit} />)
              : available.map(p => <PlayerRecruitCard key={p.id} player={p} onRecruit={handleRecruit} />)
            }
          </div>
        ) : (
          <div className={styles.empty}>
            <i className="ti ti-check" aria-hidden="true" />
            <p>本周候选人已处理完毕</p>
            <span>下周会有新的候选人出现</span>
          </div>
        )}
      </div>

      {pending && (
        <ConfirmModal
          type={pending.type}
          item={pending.item}
          onConfirm={handleConfirm}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
