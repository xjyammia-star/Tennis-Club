import { useState, useMemo } from 'react'
import { useGameCtx } from '../App'
import styles from './PlayersPage.module.css'

const HEALTH_LABEL = { healthy: '健康', minor: '轻伤', major: '重伤' }
const HEALTH_CLASS  = { healthy: styles.tagHealthy, minor: styles.tagMinor, major: styles.tagMajor }
const GENDER_LABEL  = { male: '男', female: '女' }

const TALENT_CLASS = {
  '万里挑一': styles.talentS, '天赋异禀': styles.talentA,
  '资质优良': styles.talentB, '平平无奇': styles.talentC, '天生愚钝': styles.talentD,
}

const AGE_GROUP = (age) => {
  if (age < 14) return 'youth'
  if (age < 18) return 'junior'
  return 'pro'
}

// 家境对忠诚度影响系数（越贫困影响越大）
const FAMILY_LOYALTY_MULT = { 贫穷: 2.0, 普通: 1.2, 小康: 0.8, 富裕: 0.4 }

function StatBar({ value, max = 100, color = 'forest' }) {
  return (
    <div className={styles.statBarWrap}>
      <div
        className={`${styles.statBar} ${styles[`statBar_${color}`]}`}
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  )
}

function StatRow({ label, value }) {
  const color = value >= 80 ? 'gold' : value >= 60 ? 'forest' : 'muted'
  return (
    <div className={styles.statRow}>
      <span className={styles.statLabel}>{label}</span>
      <StatBar value={value} color={color} />
      <span className={styles.statValue}>{value}</span>
    </div>
  )
}

// ── 球员详情抽屉 ──────────────────────────────────────
function PlayerDetail({ player, onClose, onToggleSponsor, onDismiss }) {
  const [confirmDismiss, setConfirmDismiss] = useState(false)
  const ageGroup = player.age < 18 ? 'ITF青少年' : 'ATP/WTA'

  // 赞助对忠诚度的预期影响
  const familyMult = FAMILY_LOYALTY_MULT[player.familyBg] || 1.0
  const sponsorLoyaltyChange = player.isSponsored
    ? -Math.round(10 * familyMult)   // 取消赞助：忠诚度下降
    : +Math.round(15 * familyMult)   // 提供赞助：忠诚度上升

  return (
    <div className={styles.detailOverlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>

        {/* 头部 */}
        <div className={styles.detailHeader}>
          <div className={styles.detailAvatar}>{player.name.charAt(0)}</div>
          <div className={styles.detailHeaderInfo}>
            <div className={styles.detailName}>{player.name}</div>
            <div className={styles.detailMeta}>
              {GENDER_LABEL[player.gender]} · {player.age} 岁 · {player.height} cm · {player.weight} kg · {player.familyBg}家庭
            </div>
            <div className={styles.detailTags}>
              <span className={`${styles.talentTag} ${TALENT_CLASS[player.talentLabel]}`}>
                {player.talentLabel}
              </span>
              <span className={`${styles.healthTag} ${HEALTH_CLASS[player.health]}`}>
                {HEALTH_LABEL[player.health]}
              </span>
              {player.isSponsored && (
                <span className={styles.sponsorTag}>
                  <i className="ti ti-star" aria-hidden="true" /> 赞助球员
                </span>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="关闭">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.detailBody}>

          {/* 疲劳 & 忠诚 */}
          <div className={styles.detailStatusRow}>
            <div className={styles.detailStatusItem}>
              <span className={styles.detailStatusLabel}>疲劳度</span>
              <div className={styles.fatigueMeter}>
                <div
                  className={`${styles.fatigueFill} ${
                    player.fatigue >= 70 ? styles.fatigueDanger :
                    player.fatigue >= 50 ? styles.fatigueWarn : styles.fatigueSafe
                  }`}
                  style={{ width: `${player.fatigue}%` }}
                />
              </div>
              <span className={styles.detailStatusVal}>{player.fatigue}</span>
            </div>
            <div className={styles.detailStatusItem}>
              <span className={styles.detailStatusLabel}>忠诚度</span>
              <div className={styles.fatigueMeter}>
                <div className={styles.loyaltyFill} style={{ width: `${player.loyalty}%` }} />
              </div>
              <span className={styles.detailStatusVal}>{player.loyalty}</span>
            </div>
          </div>

          {/* 积分排名 */}
          <div className={styles.rankRow}>
            <div className={styles.rankItem}>
              <span className={styles.rankVal}>{player.ranking ? `#${player.ranking}` : '—'}</span>
              <span className={styles.rankLabel}>{ageGroup} 排名</span>
            </div>
            <div className={styles.rankItem}>
              <span className={styles.rankVal}>{player.points || '—'}</span>
              <span className={styles.rankLabel}>积分</span>
            </div>
            <div className={styles.rankItem}>
              <span className={styles.rankVal}>{player.talent}</span>
              <span className={styles.rankLabel}>天赋值</span>
            </div>
          </div>

          {/* 技术属性 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}><i className="ti ti-award" aria-hidden="true" /> 技术属性</div>
            <StatRow label="发球"   value={player.serve}       />
            <StatRow label="正手"   value={player.forehand}    />
            <StatRow label="反手"   value={player.backhand}    />
            <StatRow label="接发球" value={player.returnServe} />
            <StatRow label="截击"   value={player.volley}      />
            <StatRow label="脚步"   value={player.footwork}    />
          </div>

          {/* 身体属性 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}><i className="ti ti-run" aria-hidden="true" /> 身体属性</div>
            <StatRow label="力量"  value={player.strength} />
            <StatRow label="体力"  value={player.stamina}  />
            <StatRow label="灵活性" value={player.agility} />
          </div>

          {/* 精神属性 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}><i className="ti ti-brain" aria-hidden="true" /> 精神属性</div>
            <StatRow label="抗压"  value={player.pressure}  />
            <StatRow label="意志力" value={player.willpower} />
            <StatRow label="专注力" value={player.focus}     />
          </div>

          {/* 特殊技能 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}><i className="ti ti-bolt" aria-hidden="true" /> 特殊技能</div>
            {player.skills?.length > 0 ? (
              <div className={styles.skillList}>
                {player.skills.map(s => <span key={s} className={styles.skillBadge}>{s}</span>)}
              </div>
            ) : (
              <p className={styles.emptyNote}>暂无特殊技能</p>
            )}
          </div>

          {/* 偏好 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}><i className="ti ti-heart" aria-hidden="true" /> 球员偏好</div>
            {player.preferences?.length > 0 ? (
              <div className={styles.skillList}>
                {player.preferences.map(p => <span key={p} className={styles.prefBadge}>{p}</span>)}
              </div>
            ) : (
              <p className={styles.emptyNote}>无特殊偏好</p>
            )}
          </div>

          {/* ── 操作区 ── */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-settings" aria-hidden="true" /> 管理操作
            </div>

            {/* 赞助切换 */}
            <div className={styles.actionCard}>
              <div className={styles.actionCardIcon}>
                <i className={`ti ${player.isSponsored ? 'ti-star-off' : 'ti-star'}`} aria-hidden="true" />
              </div>
              <div className={styles.actionCardInfo}>
                <span className={styles.actionCardTitle}>
                  {player.isSponsored ? '取消赞助' : '提供赞助'}
                </span>
                <span className={styles.actionCardDesc}>
                  {player.isSponsored
                    ? `取消后忠诚度 ${sponsorLoyaltyChange}（家境${player.familyBg}）`
                    : `赞助后忠诚度 +${sponsorLoyaltyChange}，每周补助 ¥500（家境${player.familyBg}）`}
                </span>
              </div>
              <button
                className={player.isSponsored ? styles.actionBtnWarn : styles.actionBtnPrimary}
                onClick={() => { onToggleSponsor(player); onClose() }}
              >
                {player.isSponsored ? '取消' : '赞助'}
              </button>
            </div>

            {/* 开除球员 */}
            {!confirmDismiss ? (
              <div className={styles.actionCard}>
                <div className={styles.actionCardIcon} style={{ color: 'var(--red-soft)' }}>
                  <i className="ti ti-user-minus" aria-hidden="true" />
                </div>
                <div className={styles.actionCardInfo}>
                  <span className={styles.actionCardTitle}>开除球员</span>
                  <span className={styles.actionCardDesc}>无需支付费用，球员将立即离队</span>
                </div>
                <button className={styles.actionBtnDanger} onClick={() => setConfirmDismiss(true)}>
                  开除
                </button>
              </div>
            ) : (
              <div className={styles.dismissConfirm}>
                <p>确认开除 <strong>{player.name}</strong>？此操作不可撤销。</p>
                <div className={styles.dismissBtns}>
                  <button className={styles.actionBtnSecondary} onClick={() => setConfirmDismiss(false)}>取消</button>
                  <button className={styles.actionBtnDanger} onClick={() => { onDismiss(player); onClose() }}>确认开除</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── 球员卡片 ──────────────────────────────────────────
function PlayerCard({ player, onClick }) {
  const techAvg = Math.round(
    (player.serve + player.forehand + player.backhand +
     player.returnServe + player.volley + player.footwork) / 6
  )
  const physAvg = Math.round((player.strength + player.stamina + player.agility) / 3)

  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.cardTop}>
        <div className={styles.avatar}>{player.name.charAt(0)}</div>
        <div className={styles.cardInfo}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{player.name}</span>
            <span className={`${styles.talentTag} ${TALENT_CLASS[player.talentLabel]}`}>
              {player.talentLabel}
            </span>
          </div>
          <div className={styles.cardMeta}>
            {GENDER_LABEL[player.gender]} · {player.age} 岁 · {player.height} cm
            {player.ranking && <span className={styles.ranking}> · #{player.ranking}</span>}
          </div>
          <div className={styles.cardTags}>
            <span className={`${styles.healthTag} ${HEALTH_CLASS[player.health]}`}>
              {HEALTH_LABEL[player.health]}
            </span>
            {player.isSponsored && (
              <span className={styles.sponsorTag}>
                <i className="ti ti-star" aria-hidden="true" /> 赞助
              </span>
            )}
            {player.fatigue >= 70 && <span className={styles.fatigueTag}>疲劳</span>}
          </div>
        </div>
        <i className={`ti ti-chevron-right ${styles.cardChevron}`} aria-hidden="true" />
      </div>
      <div className={styles.cardStats}>
        <div className={styles.cardStatItem}>
          <span className={styles.cardStatLabel}>技术</span>
          <StatBar value={techAvg} />
          <span className={styles.cardStatVal}>{techAvg}</span>
        </div>
        <div className={styles.cardStatItem}>
          <span className={styles.cardStatLabel}>身体</span>
          <StatBar value={physAvg} color={physAvg >= 70 ? 'gold' : 'forest'} />
          <span className={styles.cardStatVal}>{physAvg}</span>
        </div>
        <div className={styles.cardStatItem}>
          <span className={styles.cardStatLabel}>疲劳</span>
          <StatBar
            value={player.fatigue}
            color={player.fatigue >= 70 ? 'danger' : player.fatigue >= 50 ? 'warn' : 'forest'}
          />
          <span className={styles.cardStatVal}>{player.fatigue}</span>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function PlayersPage() {
  // 从 GameCtx 读取 state（问题8：疲劳显示跟着实时 state 变化）
  const { state, dispatch } = useGameCtx()
  const players = state.players

  const [search, setSearch]               = useState('')
  const [filterGender, setFilterGender]   = useState('all')
  const [filterAgeGroup, setFilterAgeGroup] = useState('all')
  const [filterHealth, setFilterHealth]   = useState('all')
  const [sortBy, setSortBy]               = useState('default')
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  const filtered = useMemo(() => {
    const list = players.filter(p => {
      if (search && !p.name.includes(search)) return false
      if (filterGender !== 'all' && p.gender !== filterGender) return false
      if (filterHealth !== 'all' && p.health !== filterHealth) return false
      if (filterAgeGroup !== 'all' && AGE_GROUP(p.age) !== filterAgeGroup) return false
      return true
    })

    const techAvg = p => {
      const vals = [p.serve, p.forehand, p.backhand, p.returnServe, p.volley, p.footwork].filter(v => v != null)
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    }
    const physAvg = p => {
      const vals = [p.strength, p.stamina, p.agility].filter(v => v != null)
      return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
    }

    if (sortBy === 'age')     return [...list].sort((a, b) => a.age - b.age)
    if (sortBy === 'tech')    return [...list].sort((a, b) => techAvg(b) - techAvg(a))
    if (sortBy === 'phys')    return [...list].sort((a, b) => physAvg(b) - physAvg(a))
    if (sortBy === 'ranking') return [...list].sort((a, b) => {
      if (a.ranking == null && b.ranking == null) return 0
      if (a.ranking == null) return 1   // 无排名排最后
      if (b.ranking == null) return -1
      return a.ranking - b.ranking
    })
    return list
  }, [search, filterGender, filterAgeGroup, filterHealth, sortBy, players])

  const stats = useMemo(() => ({
    total:     players.length,
    healthy:   players.filter(p => p.health === 'healthy').length,
    injured:   players.filter(p => p.health !== 'healthy').length,
    sponsored: players.filter(p => p.isSponsored).length,
  }), [players])

  // ── 赞助切换（问题5）──────────────────────────────
  function handleToggleSponsor(player) {
    const familyMult = FAMILY_LOYALTY_MULT[player.familyBg] || 1.0
    const willBeSponsored = !player.isSponsored

    // 提供赞助：忠诚+15×家境系数；取消赞助：忠诚-10×家境系数
    const loyaltyDelta = willBeSponsored
      ? +Math.round(15 * familyMult)
      : -Math.round(10 * familyMult)

    const newLoyalty = Math.min(100, Math.max(0, player.loyalty + loyaltyDelta))

    dispatch({
      type: 'UPDATE_PLAYER',
      player: { ...player, isSponsored: willBeSponsored, loyalty: newLoyalty },
    })
    dispatch({
      type: 'ADD_NEWS',
      news: {
        id: Date.now(),
        type: 'player',
        text: willBeSponsored
          ? `已为${player.name}提供赞助，忠诚度 +${loyaltyDelta}。`
          : `已取消${player.name}的赞助，忠诚度 ${loyaltyDelta}。`,
        week: state.gameState.week,
      },
    })
  }

  // ── 开除球员（问题7）─────────────────────────────
  function handleDismiss(player) {
    dispatch({ type: 'REMOVE_PLAYER', player })
    dispatch({
      type: 'ADD_NEWS',
      news: {
        id: Date.now(),
        type: 'player',
        text: `球员${player.name}已被开除出队。`,
        week: state.gameState.week,
      },
    })
  }

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>球员管理</h1>
        <span className={styles.mobileCount}>{players.length} 人</span>
      </header>

      <div className={styles.inner}>
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.total}</span>
            <span className={styles.summaryLabel}>在队球员</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.healthy}</span>
            <span className={styles.summaryLabel}>健康</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${stats.injured > 0 ? styles.summaryDanger : ''}`}>
              {stats.injured}
            </span>
            <span className={styles.summaryLabel}>伤病</span>
          </div>
          <div className={styles.summaryDivider} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.sponsored}</span>
            <span className={styles.summaryLabel}>赞助球员</span>
          </div>
        </div>

        <div className={styles.searchWrap}>
          <i className={`ti ti-search ${styles.searchIcon}`} aria-hidden="true" />
          <input
            className={styles.searchInput} type="text" placeholder="搜索球员姓名…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className={styles.searchClear} onClick={() => setSearch('')} aria-label="清除">
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            {[{v:'all',l:'全部'},{v:'male',l:'男'},{v:'female',l:'女'}].map(({v,l}) => (
              <button key={v} className={`${styles.filterBtn} ${filterGender===v?styles.filterBtnActive:''}`} onClick={() => setFilterGender(v)}>{l}</button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            {[{v:'all',l:'全年龄'},{v:'youth',l:'少年'},{v:'junior',l:'青少年'},{v:'pro',l:'职业'}].map(({v,l}) => (
              <button key={v} className={`${styles.filterBtn} ${filterAgeGroup===v?styles.filterBtnActive:''}`} onClick={() => setFilterAgeGroup(v)}>{l}</button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            {[{v:'all',l:'全状态'},{v:'healthy',l:'健康'},{v:'minor',l:'轻伤'},{v:'major',l:'重伤'}].map(({v,l}) => (
              <button key={v} className={`${styles.filterBtn} ${filterHealth===v?styles.filterBtnActive:''}`} onClick={() => setFilterHealth(v)}>{l}</button>
            ))}
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.sortLabel}>排序</span>
            {[
              {v:'default', l:'默认'},
              {v:'age',     l:'年龄↑'},
              {v:'tech',    l:'技术↓'},
              {v:'phys',    l:'身体↓'},
              {v:'ranking', l:'排名↑'},
            ].map(({v,l}) => (
              <button key={v} className={`${styles.filterBtn} ${sortBy===v?styles.filterBtnActive:''}`} onClick={() => setSortBy(v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className={styles.resultCount}>显示 {filtered.length} / {players.length} 名球员</div>

        {filtered.length > 0 ? (
          <div className={styles.list}>
            {filtered.map(p => (
              <PlayerCard key={p.id} player={p} onClick={() => setSelectedPlayer(p)} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <i className="ti ti-user-search" aria-hidden="true" />
            <p>没有符合条件的球员</p>
          </div>
        )}
      </div>

      {selectedPlayer && (
        <PlayerDetail
          player={state.players.find(p => p.id === selectedPlayer.id) || selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onToggleSponsor={handleToggleSponsor}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  )
}
