import { useState, useMemo, useRef, useEffect } from 'react'
import { DAYS, courseTypes } from '../data/mockData'
import { useGameCtx } from '../App'
import { generatePrivateLessons } from '../utils/privateLesson'
import { calcCourtRentalIncome, calcRentalParams, rentRateLabel } from '../utils/courtRental'
import { getClubSettings } from '../utils/clubSettings'
import styles from './SchedulePage.module.css'

const FULL_SLOTS = [
  { key: 'private', label: '私教',   sublabel: '06–10点', clubOnly: false, rentable: true,  maxHours: 4 },
  { key: 'am',      label: '上午',   sublabel: '10–12点', clubOnly: true,  rentable: false, maxHours: 2 },
  { key: 'pm',      label: '下午',   sublabel: '12–17点', clubOnly: false, rentable: true,  maxHours: 5 },
  { key: 'eve1',    label: '傍晚',   sublabel: '17–20点', clubOnly: true,  rentable: false, maxHours: 3 },
  { key: 'eve2',    label: '夜间',   sublabel: '20–22点', clubOnly: false, rentable: true,  maxHours: 2 },
]

function getCourseType(id) {
  return courseTypes.find(c => c.id === id) || courseTypes[0]
}

function dayTotalHours(sessions) {
  return sessions.reduce((sum, s) => sum + (s.hours || 0), 0)
}

function calcWeekStats(schedule, players) {
  let totalSessions = 0, totalHours = 0
  const playerHoursMap = {}
  DAYS.forEach(({ key }) => {
    ;(schedule[key] || []).forEach(s => {
      if (s.type !== 'private') totalSessions++
      totalHours += s.hours || 0
      ;(s.playerIds || []).forEach(pid => {
        playerHoursMap[pid] = (playerHoursMap[pid] || 0) + (s.hours || 0)
      })
    })
  })
  const restCount = (players || []).filter(p => !playerHoursMap[p.id]).length
  return { totalSessions, totalHours, playerHoursMap, restCount }
}

// ── 私教详情弹窗 ──────────────────────────────────────
function PrivateDetailModal({ session, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.detailHeader} style={{ borderTopColor: '#9a6e0a' }}>
          <div className={styles.detailTitleRow}>
            <div className={styles.detailTypeIcon} style={{ background: 'rgba(154,110,10,0.1)', color: '#9a6e0a' }}>
              <i className="ti ti-user-star" />
            </div>
            <div>
              <div className={styles.detailTitle}>{session.label}</div>
              <div className={styles.detailSubtitle}>06:00–10:00 · 系统自动安排 · 每节1小时</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.detailBody}>
          <div className={styles.privateList}>
            {(session.details || []).map((d, i) => (
              <div key={i} className={styles.privateItem}>
                <div className={styles.privateAvatar}>{d.playerName.charAt(0)}</div>
                <div className={styles.privateInfo}>
                  <span className={styles.privatePlayer}>{d.playerName}</span>
                  <span className={styles.privateCoach}><i className="ti ti-user-star" />{d.coachName}</span>
                </div>
                <span className={styles.privateMeta}>1h · +20exp</span>
              </div>
            ))}
          </div>
          <div className={styles.privateNote}>
            <i className="ti ti-info-circle" />
            私教由系统根据球员家庭背景和水平自动安排，不可手动修改
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionChip({ session, onClick }) {
  const isMergedPrivate = session.type === 'private' && session.isMerged
  const ct = getCourseType(session.type)
  const color = session.color || ct.color
  return (
    <div
      className={`${styles.chip} ${isMergedPrivate ? styles.chipPrivate : ''}`}
      style={{ borderLeftColor: color }}
      onClick={() => onClick(session)}
    >
      <div className={styles.chipLabel}>
        {session.label}
        {session.isAutoScheduled && <span className={styles.chipAutoTag}>系统</span>}
      </div>
      <div className={styles.chipMeta}>
        <span className={styles.chipCoach}>
          {isMergedPrivate ? `${session.playerIds?.length || 0}人` : session.coachName}
        </span>
        <span className={styles.chipHours}>{session.hours}h</span>
      </div>
      {!isMergedPrivate && (
        <div className={styles.chipPlayers}>
          {(session.playerNames || []).slice(0, 3).join('、')}
          {(session.playerNames || []).length > 3 && ` +${session.playerNames.length - 3}`}
        </div>
      )}
    </div>
  )
}

function EmptySlot({ day, slot, onClick }) {
  return (
    <div className={styles.emptySlot} onClick={() => onClick(day, slot)}>
      <i className="ti ti-plus" />
    </div>
  )
}

// ── 团课详情/编辑弹窗 ─────────────────────────────────
function SessionDetail({ session, onClose, onDelete, onEdit, players, coaches }) {
  const [editing, setEditing] = useState(false)
  const [editHours,     setEditHours]     = useState(session.hours)
  const [editCoachIds,  setEditCoachIds]  = useState(session.coachIds || (session.coachId ? [session.coachId] : []))
  const [editPlayerIds, setEditPlayerIds] = useState(session.playerIds || [])
  const ct = getCourseType(session.type)

  function toggleCoach(id) {
    setEditCoachIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }
  function togglePlayer(id) {
    setEditPlayerIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  function handleSave() {
    if (!editCoachIds.length)  { alert('请至少选择一名教练'); return }
    if (!editPlayerIds.length) { alert('请至少选择一名球员'); return }
    const bestCoach = coaches
      .filter(c => editCoachIds.includes(c.id))
      .sort((a, b) => {
        const aB = parseFloat((a.expBonus || '0%').replace('%','')) || 0
        const bB = parseFloat((b.expBonus || '0%').replace('%','')) || 0
        return bB - aB
      })[0]
    onEdit({
      ...session,
      hours:       editHours,
      coachIds:    editCoachIds,
      coachId:     bestCoach?.id,
      coachName:   editCoachIds.length === 1 ? coaches.find(c => c.id === editCoachIds[0])?.name : `${editCoachIds.length}名教练`,
      playerIds:   editPlayerIds,
      playerNames: editPlayerIds.map(id => players.find(p => p.id === id)?.name || ''),
    })
    onClose()
  }

  if (editing) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.addPanel} onClick={e => e.stopPropagation()}>
          <div className={styles.addHeader}>
            <div>
              <div className={styles.addTitle}>编辑课程：{session.label}</div>
              <div className={styles.addSubtitle}>{ct.effect}</div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
          </div>
          <div className={styles.addBody}>
            <div className={styles.addField}>
              <label className={styles.addLabel}>课时时长</label>
              <div className={styles.hoursRow}>
                {[0.5,1,1.5,2,2.5,3].map(h => (
                  <button key={h} className={`${styles.hourBtn} ${editHours===h?styles.hourBtnActive:''}`} onClick={() => setEditHours(h)}>{h}h</button>
                ))}
              </div>
            </div>
            <div className={styles.addField}>
              <label className={styles.addLabel}>负责教练（可多选）已选 {editCoachIds.length} 名</label>
              <div className={styles.coachSelect}>
                {coaches.map(c => (
                  <button key={c.id}
                    className={`${styles.coachBtn} ${editCoachIds.includes(c.id)?styles.coachBtnActive:''}`}
                    onClick={() => toggleCoach(c.id)}
                  >
                    <span className={styles.coachBtnAvatar}>{c.name.charAt(0)}</span>
                    <div>
                      <div className={styles.coachBtnName}>{c.name}</div>
                      <div className={styles.coachBtnLevel}>{c.levelLabel} · {c.expBonus}</div>
                    </div>
                    {editCoachIds.includes(c.id) && <i className="ti ti-check" style={{color:'var(--gold)'}} />}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.addField}>
              <label className={styles.addLabel}>参与球员（已选 {editPlayerIds.length} 人）</label>
              <div className={styles.playerSelect}>
                {players.map(p => {
                  const isSelected = editPlayerIds.includes(p.id)
                  const hi = p.fatigue >= 70
                  return (
                    <button key={p.id}
                      className={`${styles.playerBtn} ${isSelected?styles.playerBtnActive:''} ${hi?styles.playerBtnWarn:''}`}
                      onClick={() => togglePlayer(p.id)}
                    >
                      <span>{p.name}</span>
                      <span className={styles.playerBtnAge}>{p.age}岁</span>
                      {hi && <i className="ti ti-flame" style={{color:'#c0392b',fontSize:11}} />}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className={styles.addFooter}>
            <button className={styles.btnCancel} onClick={() => setEditing(false)}>返回</button>
            <button className={styles.btnAdd} onClick={handleSave}><i className="ti ti-device-floppy" /> 保存修改</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.detailHeader} style={{ borderTopColor: ct.color }}>
          <div className={styles.detailTitleRow}>
            <div className={styles.detailTypeIcon} style={{ background: `${ct.color}18`, color: ct.color }}>
              <i className={`ti ${ct.icon}`} />
            </div>
            <div>
              <div className={styles.detailTitle}>{session.label}</div>
              <div className={styles.detailSubtitle}>{ct.effect}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.detailBody}>
          <div className={styles.detailGrid}>
            {[
              { val: `${session.hours}h`,                lbl: '课时' },
              { val: session.hours * ct.expPerHour,      lbl: '经验/人' },
              { val: (session.playerIds || []).length,   lbl: '参与球员' },
              { val: `+${session.hours * 10}`,           lbl: '疲劳/人' },
            ].map((b, i) => (
              <div key={i} className={styles.detailBox}>
                <span className={styles.detailBoxVal}>{b.val}</span>
                <span className={styles.detailBoxLbl}>{b.lbl}</span>
              </div>
            ))}
          </div>
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}><i className="ti ti-user-star" /> 负责教练</div>
            {(session.coachIds && session.coachIds.length > 1 ? session.coachIds : [session.coachId]).map(cid => {
              const coach = coaches?.find(c => c.id === cid)
              const name  = coach?.name || session.coachName || '未知'
              return (
                <div key={cid} className={styles.coachRow}>
                  <div className={styles.coachAvatar}>{name.charAt(0)}</div>
                  <span className={styles.coachName}>{name}</span>
                  {coach && <span className={styles.coachBonusTag}>{coach.expBonus}</span>}
                </div>
              )
            })}
          </div>
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-users" /> 参与球员（{(session.playerNames || []).length}人）
            </div>
            <div className={styles.playerChips}>
              {(session.playerNames || []).map((name, i) => {
                const p  = players.find(pl => pl.id === session.playerIds?.[i])
                const hi = (p?.fatigue || 0) >= 70
                return (
                  <span key={i} className={`${styles.playerChip} ${hi ? styles.playerChipWarn : ''}`}>
                    {name}{hi && <i className="ti ti-flame" />}
                  </span>
                )
              })}
            </div>
          </div>
          <div className={styles.detailActions}>
            <button className={styles.btnEdit} onClick={() => setEditing(true)}><i className="ti ti-edit" /> 编辑</button>
            <button className={styles.btnDelete} onClick={() => onDelete(session)}><i className="ti ti-trash" /> 删除</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 添加课程弹窗 ──────────────────────────────────────
function AddSessionModal({ day, slot, onClose, onAdd, players, coaches, courtCount, initCoachIds = [], initPlayerIds = [], existingSessions = [] }) {
  const [type, setType]         = useState('court_group')
  // ✅ 用预选数据初始化，没有预选时才用第一位教练
  const [coachIds, setCoachIds] = useState(initCoachIds.length > 0 ? initCoachIds : [coaches[0]?.id].filter(Boolean))
  const [hours, setHours]       = useState(2)
  const [selected, setSelected] = useState(initPlayerIds)

  const allowedTypes = courseTypes.filter(c => c.id !== 'rest' && c.id !== 'private')
  const slotInfo     = FULL_SLOTS.find(s => s.key === slot)
  const maxPlayers   = (courtCount || 6) * 4

  // ✅ 计算该时段当天已用课时，限制可选小时数
  // existingSessions 从外部传入（当天该时段已有的课程）
  const slotMaxHours    = slotInfo?.maxHours || 4
  const usedHours       = (existingSessions || []).reduce((sum, s) => sum + (s.hours || 0), 0)
  const remainingHours  = Math.max(0, slotMaxHours - usedHours)
  // 可选课时：只保留不超过剩余时间的选项
  const hourOptions     = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5].filter(h => h <= remainingHours)
  // 若当前选中的 hours 超出剩余时间，自动降为最大可选值
  const safeHours = hourOptions.includes(hours)
    ? hours
    : (hourOptions.length > 0 ? hourOptions[hourOptions.length - 1] : 0)

  // 实时显示当前选择会占用多少场地小时
  const courtsNeeded = type === 'court_group' && selected.length > 0
    ? Math.ceil(selected.length / 4)
    : type === 'court_group' ? 1 : 0
  const courtHoursUsed = courtsNeeded * hours

  function toggleCoach(id) {
    setCoachIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }
  function togglePlayer(pid) {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(id => id !== pid)
      if (prev.length >= maxPlayers) { alert(`团课最多 ${maxPlayers} 名球员（球场数×4）`); return prev }
      return [...prev, pid]
    })
  }

  function handleAdd() {
    if (!coachIds.length)  { alert('请至少选择一名教练'); return }
    if (!selected.length)  { alert('请至少选择一名球员'); return }
    if (hours > remainingHours) { alert(`该时段剩余 ${remainingHours}h，无法添加 ${hours}h 的课程`); return }
    if (hourOptions.length === 0) { alert('该时段已排满，无法继续添加'); return }
    const bestCoach = coaches
      .filter(c => coachIds.includes(c.id))
      .sort((a, b) => {
        const aB = parseFloat((a.expBonus || '0%').replace('%','')) || 0
        const bB = parseFloat((b.expBonus || '0%').replace('%','')) || 0
        return bB - aB
      })[0]
    const ct = getCourseType(type)
    onAdd({
      id:          `s_${Date.now()}`,
      slot,
      type,
      label:       ct.label,
      hours:       safeHours,
      coachIds,
      coachId:     bestCoach?.id,
      coachName:   coachIds.length === 1
                     ? coaches.find(c => c.id === coachIds[0])?.name
                     : `${coachIds.length}名教练`,
      playerIds:   selected,
      playerNames: selected.map(id => players.find(p => p.id === id)?.name || ''),
      color:       ct.color,
    })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.addPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.addHeader}>
          <div>
            <div className={styles.addTitle}>{DAYS.find(d => d.key === day)?.label} · {slotInfo?.label}</div>
            <div className={styles.addSubtitle}>{slotInfo?.sublabel}</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.addBody}>
          <div className={styles.addField}>
            <label className={styles.addLabel}>课程类型</label>
            <div className={styles.typeGrid}>
              {allowedTypes.map(c => (
                <button key={c.id}
                  className={`${styles.typeBtn} ${type === c.id ? styles.typeBtnActive : ''}`}
                  style={type === c.id ? { borderColor: c.color, background: `${c.color}12` } : {}}
                  onClick={() => setType(c.id)}
                >
                  <i className={`ti ${c.icon}`} style={{ color: c.color }} />
                  <span>{c.label}</span>
                  <span className={styles.typeExp}>{c.expPerHour * hours}exp/人</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.addField}>
            <label className={styles.addLabel}>课时时长</label>
            <div className={styles.hoursRow}>
              {[0.5,1,1.5,2,2.5,3].map(h => (
                <button key={h} className={`${styles.hourBtn} ${hours===h?styles.hourBtnActive:''}`} onClick={() => setHours(h)}>{h}h</button>
              ))}
            </div>
          </div>
          <div className={styles.addField}>
            <label className={styles.addLabel}>
              负责教练（可多选，不超过 {courtCount} 名）已选 {coachIds.length} 名
            </label>
            <div className={styles.coachSelect}>
              {coaches.map(c => {
                const isSelected = coachIds.includes(c.id)
                const disabled   = !isSelected && coachIds.length >= (courtCount || 6)
                return (
                  <button key={c.id}
                    className={`${styles.coachBtn} ${isSelected?styles.coachBtnActive:''} ${disabled?styles.coachBtnDisabled:''}`}
                    onClick={() => !disabled && toggleCoach(c.id)}
                    disabled={disabled}
                  >
                    <span className={styles.coachBtnAvatar}>{c.name.charAt(0)}</span>
                    <div>
                      <div className={styles.coachBtnName}>{c.name}</div>
                      <div className={styles.coachBtnLevel}>{c.levelLabel} · {c.expBonus}</div>
                    </div>
                    {isSelected && <i className="ti ti-check" style={{color:'var(--gold)'}} />}
                  </button>
                )
              })}
            </div>
          </div>
          <div className={styles.addField}>
            <label className={styles.addLabel}>
              参与球员（已选 {selected.length} / 最多 {maxPlayers} 人）
              {/* ✅ 实时显示场地占用提示 */}
              {type === 'court_group' && selected.length > 0 && (
                <span style={{ color: '#c9a84c', marginLeft: 8, fontWeight: 400 }}>
                  需 {courtsNeeded} 块场地 · 占用 {courtHoursUsed}h
                </span>
              )}
            </label>
            <div className={styles.playerSelect}>
              {players.map(p => {
                const isSelected = selected.includes(p.id)
                const hi         = p.fatigue >= 70
                const disabled   = !isSelected && selected.length >= maxPlayers
                return (
                  <button key={p.id}
                    className={`${styles.playerBtn} ${isSelected?styles.playerBtnActive:''} ${hi?styles.playerBtnWarn:''} ${disabled?styles.playerBtnDisabled:''}`}
                    onClick={() => togglePlayer(p.id)}
                    disabled={disabled}
                  >
                    <span>{p.name}</span>
                    <span className={styles.playerBtnAge}>{p.age}岁</span>
                    {hi && <i className="ti ti-flame" style={{color:'#c0392b',fontSize:11}} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className={styles.addFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button className={styles.btnAdd} onClick={handleAdd}><i className="ti ti-plus" /> 添加课程</button>
        </div>
      </div>
    </div>
  )
}

function WeekStats({ stats, rentalInfo }) {
  return (
    <div className={styles.statsRow}>
      <div className={styles.statItem}>
        <span className={styles.statVal}>{stats.totalSessions}</span>
        <span className={styles.statLbl}>团课数</span>
      </div>
      <div className={styles.statDiv} />
      <div className={styles.statItem}>
        <span className={styles.statVal}>{stats.totalHours}h</span>
        <span className={styles.statLbl}>总课时</span>
      </div>
      <div className={styles.statDiv} />
      <div className={styles.statItem}>
        <span className={styles.statVal}>{Object.keys(stats.playerHoursMap).length}</span>
        <span className={styles.statLbl}>参训球员</span>
      </div>
      <div className={styles.statDiv} />
      <div className={styles.statItem}>
        <span className={`${styles.statVal} ${stats.restCount > 0 ? styles.statWarn : ''}`}>{stats.restCount}</span>
        <span className={styles.statLbl}>未排课</span>
      </div>
      <div className={styles.statDiv} />
      <div className={styles.statItem}>
        <span className={styles.statVal} style={{ color: '#1a6010', fontSize: 14 }}>
          ¥{rentalInfo.income.toLocaleString()}
        </span>
        <span className={styles.statLbl}>外租预估</span>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function SchedulePage() {
  const settings = getClubSettings()
  const { state, dispatch } = useGameCtx()

  const players   = state.players
  const coaches   = state.coaches
  const schedule  = state.schedule
  const clubStats = state.clubStats

  const privateLessons = useMemo(() => generatePrivateLessons({
    players, coaches,
    courtCount: clubStats.courtCount,
    isMatchWeek: false,
    settings,
  }), [players, coaches, clubStats.courtCount])

  const [groupSchedule, setGroupSchedule] = useState(schedule)

  const fullSchedule = useMemo(() => {
    const merged = {}
    DAYS.forEach(({ key }) => {
      const group = (groupSchedule[key] || []).filter(s => s.type !== 'private')
      const priv  = privateLessons[key] || []
      merged[key] = [...priv, ...group]
    })
    return merged
  }, [groupSchedule, privateLessons])

  // ✅ 使用共用函数，与 weekEngine/ClubSettingsPage 完全一致
  const { weekPrivateCounts, weekGroupCounts } = useMemo(
    () => calcRentalParams(groupSchedule, privateLessons),
    [groupSchedule, privateLessons]
  )

  const rentalInfo = useMemo(() => calcCourtRentalIncome({
    courtCount:        clubStats.courtCount,
    prestige:          state.gameState.prestige || 1000,
    hourlyRate:        settings.courtHourlyRate,
    weekPrivateCounts,
    weekGroupCounts,
    eventModifier:     0,
  }), [weekPrivateCounts, weekGroupCounts, settings.courtHourlyRate, clubStats.courtCount, state.gameState.prestige])

  const [selectedDay, setSelectedDay] = useState('mon')
  const [sessionDetail, setSessionDetail] = useState(null)
  const [privateDetail, setPrivateDetail] = useState(null)
  const [addTarget, setAddTarget]         = useState(null)
  const [view, setView]                   = useState('week')

  // ── 预选面板：默认只选中「已出现在现有团课里」的教练和球员 ──
  // 这样新招募的成员不会被默认勾选，与团课实际内容保持一致
  const initCoachIds  = useRef(coaches.map(c => c.id))
  const initPlayerIds = useRef(players.map(p => p.id))

  // ── 计算「应被预选」的教练/球员：只选团课里实际出现过的 ──
  function calcInitPreCoachIds(sch, coachesList) {
    const used = new Set()
    Object.values(sch).forEach(sessions => {
      sessions.forEach(s => {
        if (s.type === 'private') return
        ;(s.coachIds || (s.coachId ? [s.coachId] : [])).forEach(id => used.add(id))
      })
    })
    // 没有任何团课时（新游戏），默认全选
    return used.size > 0
      ? coachesList.filter(c => used.has(c.id)).map(c => c.id)
      : coachesList.map(c => c.id)
  }

  function calcInitPrePlayerIds(sch, playersList) {
    const used = new Set()
    Object.values(sch).forEach(sessions => {
      sessions.forEach(s => {
        if (s.type === 'private') return
        ;(s.playerIds || []).forEach(id => used.add(id))
      })
    })
    return used.size > 0
      ? playersList.filter(p => used.has(p.id)).map(p => p.id)
      : playersList.map(p => p.id)
  }

  const [preCoachIds,  setPreCoachIds]  = useState(() => calcInitPreCoachIds(schedule, coaches))
  const [prePlayerIds, setPrePlayerIds] = useState(() => calcInitPrePlayerIds(schedule, players))

  // ✅ 每次推进新一周后（week 变化），重置预选状态与团课实际内容同步
  // 这样新招募的成员不会被误判为已选中
  const currentWeek = state.gameState.week
  useEffect(() => {
    setPreCoachIds(calcInitPreCoachIds(schedule, coaches))
    setPrePlayerIds(calcInitPrePlayerIds(schedule, players))
  }, [currentWeek])

  // ── 勾选/取消教练：更新预选 + 同步到所有现有团课 ──
  function togglePreCoach(coachId) {
    const isAdding = !preCoachIds.includes(coachId)
    setPreCoachIds(prev => isAdding ? [...prev, coachId] : prev.filter(c => c !== coachId))

    setGroupSchedule(prev => {
      const updated = {}
      DAYS.forEach(({ key }) => {
        updated[key] = (prev[key] || []).map(s => {
          if (s.type === 'private') return s
          let newCoachIds
          if (isAdding) {
            // 追加：如果已有则跳过
            if ((s.coachIds || []).includes(coachId)) return s
            newCoachIds = [...(s.coachIds || []), coachId]
          } else {
            // 移除：如果不存在则跳过
            if (!(s.coachIds || []).includes(coachId)) return s
            newCoachIds = (s.coachIds || []).filter(c => c !== coachId)
            if (newCoachIds.length === 0) return s  // 至少保留一名教练，不移除
          }
          const updatedS = {
            ...s,
            coachIds: newCoachIds,
            coachName: newCoachIds.length === 1
              ? coaches.find(c => c.id === newCoachIds[0])?.name || s.coachName
              : `${newCoachIds.length}名教练`,
          }
          dispatch({ type: 'REMOVE_SESSION', id: s.id })
          dispatch({ type: 'ADD_SESSION', day: key, session: updatedS })
          return updatedS
        })
      })
      return updated
    })
  }

  // ── 勾选/取消球员：更新预选 + 同步到所有现有团课 ──
  function togglePrePlayer(playerId) {
    const isAdding = !prePlayerIds.includes(playerId)
    setPrePlayerIds(prev => isAdding ? [...prev, playerId] : prev.filter(p => p !== playerId))

    setGroupSchedule(prev => {
      const updated = {}
      DAYS.forEach(({ key }) => {
        updated[key] = (prev[key] || []).map(s => {
          if (s.type === 'private') return s
          let newPlayerIds
          if (isAdding) {
            // 追加：如果已有则跳过
            if ((s.playerIds || []).includes(playerId)) return s
            newPlayerIds = [...(s.playerIds || []), playerId]
          } else {
            // 移除：如果不存在则跳过
            if (!(s.playerIds || []).includes(playerId)) return s
            newPlayerIds = (s.playerIds || []).filter(p => p !== playerId)
            if (newPlayerIds.length === 0) return s  // 至少保留一名球员，不移除
          }
          const newPlayerNames = newPlayerIds.map(pid => players.find(p => p.id === pid)?.name || '')
          const updatedS = { ...s, playerIds: newPlayerIds, playerNames: newPlayerNames }
          dispatch({ type: 'REMOVE_SESSION', id: s.id })
          dispatch({ type: 'ADD_SESSION', day: key, session: updatedS })
          return updatedS
        })
      })
      return updated
    })
  }

  function selectAllPlayers() { setPrePlayerIds(players.map(p => p.id)) }
  function clearAllPlayers()  { setPrePlayerIds([]) }

  const stats = useMemo(() => calcWeekStats(fullSchedule, players), [fullSchedule, players])

  function handleClick(session) {
    if (session.isMerged && session.type === 'private') setPrivateDetail(session)
    else setSessionDetail(session)
  }

  function handleDelete(session) {
    setGroupSchedule(prev => {
      const u = { ...prev }
      DAYS.forEach(({ key }) => { u[key] = (u[key] || []).filter(s => s.id !== session.id) })
      return u
    })
    dispatch({ type: 'REMOVE_SESSION', id: session.id })
    setSessionDetail(null)
  }

  function handleEdit(updatedSession) {
    setGroupSchedule(prev => {
      const u = { ...prev }
      DAYS.forEach(({ key }) => {
        u[key] = (u[key] || []).map(s => s.id === updatedSession.id ? updatedSession : s)
      })
      return u
    })
    dispatch({ type: 'REMOVE_SESSION', id: updatedSession.id })
    const dayKey = DAYS.find(d =>
      (schedule[d.key] || []).some(s => s.id === updatedSession.id) ||
      (groupSchedule[d.key] || []).some(s => s.id === updatedSession.id)
    )?.key || 'mon'
    dispatch({ type: 'ADD_SESSION', day: dayKey, session: updatedSession })
  }

  function handleAdd(dayKey, slot, data) {
    setGroupSchedule(prev => ({ ...prev, [dayKey]: [...(prev[dayKey] || []), data] }))
    dispatch({ type: 'ADD_SESSION', day: dayKey, session: data })
    setAddTarget(null)
  }

  function WeekView() {
    return (
      <div className={styles.weekGrid}>
        <div className={styles.slotLabelCell} />
        {DAYS.map(d => {
          const h = dayTotalHours(fullSchedule[d.key] || [])
          return (
            <div key={d.key} className={`${styles.weekHeaderCell} ${d.key==='mon'?styles.today:''}`}>
              <span className={styles.dayLabel}>{d.label}</span>
              {h > 0 && <span className={styles.dayHours}>{h}h</span>}
            </div>
          )
        })}
        {FULL_SLOTS.map(slot => (
          <>
            <div key={`lbl-${slot.key}`} className={`${styles.slotLabelCell} ${slot.clubOnly?styles.slotClubOnly:''}`}>
              <span className={styles.slotLabelText}>{slot.label}</span>
              <span className={styles.slotTimeText}>{slot.sublabel}</span>
            </div>
            {DAYS.map(d => {
              const slotSessions = (fullSchedule[d.key] || []).filter(s => s.slot === slot.key)
              return (
                <div key={`${d.key}-${slot.key}`} className={`${styles.weekCell} ${slot.clubOnly?styles.weekCellClub:''}`}>
                  {slotSessions.map(s => <SessionChip key={s.id} session={s} onClick={handleClick} />)}
                  {slot.key !== 'private' && (
                    <EmptySlot day={d.key} slot={slot.key} onClick={(day,sl) => setAddTarget({day,slot:sl})} />
                  )}
                </div>
              )
            })}
          </>
        ))}
      </div>
    )
  }

  function DayView() {
    const grouped = {}
    FULL_SLOTS.forEach(s => { grouped[s.key] = [] })
    ;(fullSchedule[selectedDay] || []).forEach(s => { if (grouped[s.slot]) grouped[s.slot].push(s) })
    return (
      <div className={styles.dayView}>
        <div className={styles.dayPicker}>
          {DAYS.map(d => (
            <button key={d.key}
              className={`${styles.dayPickerBtn} ${selectedDay===d.key?styles.dayPickerActive:''}`}
              onClick={() => setSelectedDay(d.key)}
            >
              <span className={styles.dayPickerShort}>{d.short}</span>
              {(fullSchedule[d.key]||[]).length > 0 && <span className={styles.dayPickerDot} />}
            </button>
          ))}
        </div>
        {FULL_SLOTS.map(slot => (
          <div key={slot.key} className={styles.daySlot}>
            <div className={`${styles.daySlotLabel} ${slot.clubOnly?styles.daySlotClub:''}`}>
              {slot.label}
              <span className={styles.daySlotTime}>{slot.sublabel}</span>
              {slot.clubOnly && <span className={styles.clubBadge}>俱乐部专用</span>}
            </div>
            <div className={styles.daySlotBody}>
              {grouped[slot.key].map(s => <SessionChip key={s.id} session={s} onClick={handleClick} />)}
              {slot.key !== 'private' && (
                <EmptySlot day={selectedDay} slot={slot.key} onClick={(day,sl) => setAddTarget({day,slot:sl})} />
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>训练安排</h1>
        <span className={styles.mobileWeek}>第 {state.gameState.week} 周</span>
      </header>
      <div className={styles.inner}>
        <WeekStats stats={stats} rentalInfo={rentalInfo} />

        <div className={styles.viewToggle}>
          <button className={`${styles.viewBtn} ${view==='day'?styles.viewBtnActive:''}`} onClick={() => setView('day')}>
            <i className="ti ti-calendar-day" /> 按天
          </button>
          <button className={`${styles.viewBtn} ${view==='week'?styles.viewBtnActive:''}`} onClick={() => setView('week')}>
            <i className="ti ti-calendar-week" /> 本周
          </button>
        </div>

        {players.some(p => p.fatigue >= 70) && (
          <div className={styles.warnBanner}>
            <i className="ti ti-flame" />
            <span>{players.filter(p=>p.fatigue>=70).map(p=>p.name).join('、')} 疲劳度偏高，建议安排休息</span>
          </div>
        )}

        <div className={styles.rentalBanner}>
          <i className="ti ti-home" />
          <span>
            本周场地外租预估收入 <strong>¥{rentalInfo.income.toLocaleString()}</strong>
            （可租 {rentalInfo.totalRentableHours}h · 出租率 {rentalInfo.rentRate}% · {rentRateLabel(rentalInfo.rentRate)}）
          </span>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{background:'#9a6e0a'}} />私教（系统）</span>
          {courseTypes.filter(c=>c.id!=='rest'&&c.id!=='private').map(c => (
            <span key={c.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{background:c.color}} />{c.label}
            </span>
          ))}
        </div>

        <div className={styles.calendarWrap}>
          <div className={styles.desktopOnly}><WeekView /></div>
          <div className={styles.mobileOnly}>{view==='week'?<WeekView />:<DayView />}</div>
        </div>

        {/* ✅ 第6条：预选面板 */}
        <div className={styles.preSelectPanel}>
          <div className={styles.preSelectTitle}>
            <i className="ti ti-hand-click" /> 选好教练和球员后，点击课表中的 <strong>+</strong> 快速添加课程
          </div>

          {/* 教练预选 */}
          <div className={styles.preSelectSection}>
            <div className={styles.preSelectLabel}>选择教练（已选 {preCoachIds.length} 名）</div>
            <div className={styles.preSelectList}>
              {coaches.map(c => (
                <button
                  key={c.id}
                  className={`${styles.preSelectBtn} ${preCoachIds.includes(c.id) ? styles.preSelectBtnActive : ''}`}
                  onClick={() => togglePreCoach(c.id)}
                >
                  <span className={styles.preSelectAvatar}>{c.name.charAt(0)}</span>
                  <div className={styles.preSelectInfo}>
                    <span className={styles.preSelectName}>{c.name}</span>
                    <span className={styles.preSelectSub}>{c.levelLabel} · {c.expBonus}</span>
                  </div>
                  {preCoachIds.includes(c.id) && <i className="ti ti-check" style={{color:'var(--gold)'}} />}
                </button>
              ))}
            </div>
          </div>

          {/* 球员预选 */}
          <div className={styles.preSelectSection}>
            <div className={styles.preSelectLabel}>
              选择球员（已选 {prePlayerIds.length} / {players.length} 名）
              <button className={styles.preSelectAll} onClick={selectAllPlayers}>全选</button>
              <button className={styles.preSelectAll} onClick={clearAllPlayers}>清空</button>
            </div>
            <div className={styles.preSelectList}>
              {players.map(p => {
                const hi = p.fatigue >= 70
                return (
                  <button
                    key={p.id}
                    className={`${styles.preSelectBtn} ${prePlayerIds.includes(p.id) ? styles.preSelectBtnActive : ''} ${hi ? styles.preSelectBtnTired : ''}`}
                    onClick={() => togglePrePlayer(p.id)}
                  >
                    <span className={styles.preSelectAvatar}>{p.name.charAt(0)}</span>
                    <div className={styles.preSelectInfo}>
                      <span className={styles.preSelectName}>{p.name}</span>
                      <span className={styles.preSelectSub}>
                        Lv{p.level} · 疲劳{p.fatigue}%{hi ? ' ⚠️' : ''}
                      </span>
                    </div>
                    {prePlayerIds.includes(p.id) && <i className="ti ti-check" style={{color:'var(--gold)'}} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {sessionDetail && (
        <SessionDetail
          session={sessionDetail}
          onClose={() => setSessionDetail(null)}
          onDelete={handleDelete}
          onEdit={handleEdit}
          players={players}
          coaches={coaches}
        />
      )}
      {privateDetail && <PrivateDetailModal session={privateDetail} onClose={() => setPrivateDetail(null)} />}
      {addTarget && (
        <AddSessionModal
          day={addTarget.day} slot={addTarget.slot}
          onClose={() => setAddTarget(null)}
          onAdd={(data) => handleAdd(addTarget.day, addTarget.slot, data)}
          players={players} coaches={coaches}
          courtCount={clubStats.courtCount}
          initCoachIds={preCoachIds}
          initPlayerIds={prePlayerIds}
          existingSessions={(fullSchedule[addTarget.day] || []).filter(s => s.slot === addTarget.slot)}
        />
      )}
    </div>
  )
}
