import { useState, useMemo } from 'react'
import {
  weekSchedule, DAYS, SLOTS, courseTypes,
  players, coaches,
} from '../data/mockData'
import styles from './SchedulePage.module.css'

// ── 工具函数 ──────────────────────────────────────────
function getCourseType(id) {
  return courseTypes.find(c => c.id === id) || courseTypes[0]
}

// 计算一天总课时
function dayTotalHours(sessions) {
  return sessions.reduce((sum, s) => sum + s.hours, 0)
}

// 计算本周统计
function calcWeekStats(schedule) {
  let totalSessions = 0
  let totalHours = 0
  const playerHoursMap = {}
  const typeCount = {}

  DAYS.forEach(({ key }) => {
    const sessions = schedule[key] || []
    totalSessions += sessions.length
    sessions.forEach(s => {
      totalHours += s.hours
      typeCount[s.type] = (typeCount[s.type] || 0) + s.hours
      s.playerIds.forEach(pid => {
        playerHoursMap[pid] = (playerHoursMap[pid] || 0) + s.hours
      })
    })
  })

  const restCount = players.filter(p => !playerHoursMap[p.id]).length

  return { totalSessions, totalHours, typeCount, playerHoursMap, restCount }
}

// ── 课程卡片（日历格中） ──────────────────────────────
function SessionChip({ session, onClick }) {
  const ct = getCourseType(session.type)
  return (
    <div
      className={styles.chip}
      style={{ borderLeftColor: ct.color }}
      onClick={() => onClick(session)}
    >
      <div className={styles.chipLabel}>{session.label}</div>
      <div className={styles.chipMeta}>
        <span className={styles.chipCoach}>{session.coachName}</span>
        <span className={styles.chipHours}>{session.hours}h</span>
      </div>
      <div className={styles.chipPlayers}>
        {session.playerNames.slice(0, 3).join('、')}
        {session.playerNames.length > 3 && ` +${session.playerNames.length - 3}`}
      </div>
    </div>
  )
}

// ── 空时段（可点击添加） ───────────────────────────────
function EmptySlot({ day, slot, onClick }) {
  return (
    <div className={styles.emptySlot} onClick={() => onClick(day, slot)}>
      <i className="ti ti-plus" aria-hidden="true" />
    </div>
  )
}

// ── 课程详情弹窗 ──────────────────────────────────────
function SessionDetail({ session, onClose, onDelete }) {
  const ct = getCourseType(session.type)
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>

        <div className={styles.detailHeader} style={{ borderTopColor: ct.color }}>
          <div className={styles.detailTitleRow}>
            <div className={styles.detailTypeIcon} style={{ background: `${ct.color}18`, color: ct.color }}>
              <i className={`ti ${ct.icon}`} aria-hidden="true" />
            </div>
            <div>
              <div className={styles.detailTitle}>{session.label}</div>
              <div className={styles.detailSubtitle}>{ct.effect}</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.detailBody}>

          {/* 基本信息 */}
          <div className={styles.detailGrid}>
            <div className={styles.detailBox}>
              <span className={styles.detailBoxVal}>{session.hours}h</span>
              <span className={styles.detailBoxLbl}>课时</span>
            </div>
            <div className={styles.detailBox}>
              <span className={styles.detailBoxVal}>{session.hours * ct.expPerHour}</span>
              <span className={styles.detailBoxLbl}>经验/人</span>
            </div>
            <div className={styles.detailBox}>
              <span className={styles.detailBoxVal}>{session.playerIds.length}</span>
              <span className={styles.detailBoxLbl}>参与球员</span>
            </div>
            <div className={styles.detailBox}>
              <span className={styles.detailBoxVal}>
                +{session.hours * (session.type === 'private' ? 20 : 10) > 0
                  ? session.hours * (session.type === 'rest' ? 0 : 10)
                  : 0}
              </span>
              <span className={styles.detailBoxLbl}>疲劳/人</span>
            </div>
          </div>

          {/* 教练 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-user-star" aria-hidden="true" /> 负责教练
            </div>
            <div className={styles.coachRow}>
              <div className={styles.coachAvatar}>{session.coachName.charAt(0)}</div>
              <span className={styles.coachName}>{session.coachName}</span>
            </div>
          </div>

          {/* 参与球员 */}
          <div className={styles.detailSection}>
            <div className={styles.detailSectionTitle}>
              <i className="ti ti-users" aria-hidden="true" /> 参与球员（{session.playerNames.length} 人）
            </div>
            <div className={styles.playerChips}>
              {session.playerNames.map((name, i) => {
                const p = players.find(pl => pl.id === session.playerIds[i])
                const fatigue = p?.fatigue || 0
                return (
                  <span
                    key={i}
                    className={`${styles.playerChip} ${
                      fatigue >= 70 ? styles.playerChipWarn : ''
                    }`}
                  >
                    {name}
                    {fatigue >= 70 && <i className="ti ti-flame" aria-hidden="true" />}
                  </span>
                )
              })}
            </div>
          </div>

          {/* 操作 */}
          <div className={styles.detailActions}>
            <button className={styles.btnEdit} onClick={() => { alert('编辑功能开发中…'); onClose() }}>
              <i className="ti ti-edit" aria-hidden="true" /> 编辑课程
            </button>
            <button className={styles.btnDelete} onClick={() => onDelete(session)}>
              <i className="ti ti-trash" aria-hidden="true" /> 删除
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── 添加课程弹窗 ──────────────────────────────────────
function AddSessionModal({ day, slot, onClose, onAdd }) {
  const [type, setType]     = useState('court_group')
  const [coachId, setCoachId] = useState(coaches[0].id)
  const [hours, setHours]   = useState(2)
  const [selected, setSelected] = useState([])

  const ct = getCourseType(type)
  const isPrivate = type === 'private'

  function togglePlayer(pid) {
    if (isPrivate) {
      setSelected([pid])
    } else {
      setSelected(prev =>
        prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
      )
    }
  }

  function handleAdd() {
    if (selected.length === 0) { alert('请至少选择一名球员'); return }
    const coach = coaches.find(c => c.id === coachId)
    const ct2 = getCourseType(type)
    onAdd({
      id: `s_${Date.now()}`,
      slot,
      type,
      label: ct2.label,
      hours,
      coachId,
      coachName: coach.name,
      playerIds: selected,
      playerNames: selected.map(id => players.find(p => p.id === id)?.name || ''),
      color: ct2.color,
    })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.addPanel} onClick={e => e.stopPropagation()}>

        <div className={styles.addHeader}>
          <div className={styles.addTitle}>
            {DAYS.find(d => d.key === day)?.label} · {SLOTS.find(s => s.key === slot)?.label}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.addBody}>

          {/* 课程类型 */}
          <div className={styles.addField}>
            <label className={styles.addLabel}>课程类型</label>
            <div className={styles.typeGrid}>
              {courseTypes.filter(c => c.id !== 'rest').map(c => (
                <button
                  key={c.id}
                  className={`${styles.typeBtn} ${type === c.id ? styles.typeBtnActive : ''}`}
                  style={type === c.id ? { borderColor: c.color, background: `${c.color}12` } : {}}
                  onClick={() => setType(c.id)}
                >
                  <i className={`ti ${c.icon}`} aria-hidden="true" style={{ color: c.color }} />
                  <span>{c.label}</span>
                  <span className={styles.typeExp}>{c.expPerHour * hours} exp/人</span>
                </button>
              ))}
            </div>
          </div>

          {/* 时长 */}
          <div className={styles.addField}>
            <label className={styles.addLabel}>课时时长</label>
            <div className={styles.hoursRow}>
              {[0.5, 1, 1.5, 2, 2.5, 3].map(h => (
                <button
                  key={h}
                  className={`${styles.hourBtn} ${hours === h ? styles.hourBtnActive : ''}`}
                  onClick={() => setHours(h)}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>

          {/* 教练 */}
          <div className={styles.addField}>
            <label className={styles.addLabel}>负责教练</label>
            <div className={styles.coachSelect}>
              {coaches.map(c => (
                <button
                  key={c.id}
                  className={`${styles.coachBtn} ${coachId === c.id ? styles.coachBtnActive : ''}`}
                  onClick={() => setCoachId(c.id)}
                >
                  <span className={styles.coachBtnAvatar}>{c.name.charAt(0)}</span>
                  <div>
                    <div className={styles.coachBtnName}>{c.name}</div>
                    <div className={styles.coachBtnLevel}>{c.levelLabel}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 球员选择 */}
          <div className={styles.addField}>
            <label className={styles.addLabel}>
              参与球员
              {isPrivate ? '（私教限选1人）' : `（已选 ${selected.length} 人）`}
            </label>
            <div className={styles.playerSelect}>
              {players.map(p => {
                const isSelected = selected.includes(p.id)
                const fatigueHigh = p.fatigue >= 70
                return (
                  <button
                    key={p.id}
                    className={`${styles.playerBtn}
                      ${isSelected ? styles.playerBtnActive : ''}
                      ${fatigueHigh ? styles.playerBtnWarn : ''}`}
                    onClick={() => togglePlayer(p.id)}
                  >
                    <span>{p.name}</span>
                    <span className={styles.playerBtnAge}>{p.age}岁</span>
                    {fatigueHigh && (
                      <i className="ti ti-flame" aria-hidden="true" style={{ color: '#c0392b', fontSize: 11 }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        <div className={styles.addFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button className={styles.btnAdd} onClick={handleAdd}>
            <i className="ti ti-plus" aria-hidden="true" /> 添加课程
          </button>
        </div>

      </div>
    </div>
  )
}

// ── 本周统计面板 ──────────────────────────────────────
function WeekStats({ stats }) {
  return (
    <div className={styles.statsRow}>
      <div className={styles.statItem}>
        <span className={styles.statVal}>{stats.totalSessions}</span>
        <span className={styles.statLbl}>课程总数</span>
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
        <span className={`${styles.statVal} ${stats.restCount > 0 ? styles.statWarn : ''}`}>
          {stats.restCount}
        </span>
        <span className={styles.statLbl}>未排课</span>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function SchedulePage() {
  const [schedule, setSchedule]         = useState(weekSchedule)
  const [selectedDay, setSelectedDay]   = useState('mon')
  const [sessionDetail, setSessionDetail] = useState(null)
  const [addTarget, setAddTarget]         = useState(null) // { day, slot }
  const [view, setView]                 = useState('week') // week | day

  const stats = useMemo(() => calcWeekStats(schedule), [schedule])

  function handleDeleteSession(session) {
    setSchedule(prev => {
      const updated = { ...prev }
      DAYS.forEach(({ key }) => {
        updated[key] = (updated[key] || []).filter(s => s.id !== session.id)
      })
      return updated
    })
    setSessionDetail(null)
  }

  function handleAddSession(dayKey, slot, sessionData) {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), sessionData],
    }))
    setAddTarget(null)
  }

  // ── 按时段分组某天的课程 ──────────────────────────────
  function groupBySlot(sessions) {
    const grouped = { am: [], pm: [], eve: [] }
    sessions.forEach(s => {
      if (grouped[s.slot]) grouped[s.slot].push(s)
    })
    return grouped
  }

  // ── 周视图（桌面宽屏） ────────────────────────────────
  const WeekView = () => (
    <div className={styles.weekGrid}>
      {/* Header row */}
      <div className={styles.weekHeaderCell} />
      {DAYS.map(d => {
        const hours = dayTotalHours(schedule[d.key] || [])
        const isToday = d.key === 'mon'
        return (
          <div key={d.key} className={`${styles.weekHeaderCell} ${isToday ? styles.today : ''}`}>
            <span className={styles.dayLabel}>{d.label}</span>
            {hours > 0 && <span className={styles.dayHours}>{hours}h</span>}
          </div>
        )
      })}

      {/* Slot rows */}
      {SLOTS.map(slot => (
        <div key={slot.key} className={styles.weekRow}>
          <div className={styles.slotLabel}>{slot.label}</div>
          {DAYS.map(d => {
            const daySessions = schedule[d.key] || []
            const slotSessions = daySessions.filter(s => s.slot === slot.key)
            return (
              <div key={d.key} className={styles.weekCell}>
                {slotSessions.map(s => (
                  <SessionChip key={s.id} session={s} onClick={setSessionDetail} />
                ))}
                <EmptySlot
                  day={d.key}
                  slot={slot.key}
                  onClick={(day, sl) => setAddTarget({ day, slot: sl })}
                />
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  // ── 日视图（移动端） ──────────────────────────────────
  const DayView = () => {
    const sessions = schedule[selectedDay] || []
    const grouped = groupBySlot(sessions)
    return (
      <div className={styles.dayView}>
        {/* 日期选择器 */}
        <div className={styles.dayPicker}>
          {DAYS.map(d => {
            const hasSession = (schedule[d.key] || []).length > 0
            return (
              <button
                key={d.key}
                className={`${styles.dayPickerBtn} ${selectedDay === d.key ? styles.dayPickerActive : ''}`}
                onClick={() => setSelectedDay(d.key)}
              >
                <span className={styles.dayPickerShort}>{d.short}</span>
                {hasSession && <span className={styles.dayPickerDot} />}
              </button>
            )
          })}
        </div>

        {/* 当天课程 */}
        {SLOTS.map(slot => {
          const slotSessions = grouped[slot.key]
          return (
            <div key={slot.key} className={styles.daySlot}>
              <div className={styles.daySlotLabel}>{slot.label}</div>
              <div className={styles.daySlotBody}>
                {slotSessions.map(s => (
                  <SessionChip key={s.id} session={s} onClick={setSessionDetail} />
                ))}
                <EmptySlot
                  day={selectedDay}
                  slot={slot.key}
                  onClick={(day, sl) => setAddTarget({ day, slot: sl })}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* 移动端 Header */}
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>训练安排</h1>
        <span className={styles.mobileWeek}>第 1 周</span>
      </header>

      <div className={styles.inner}>

        {/* 周统计 */}
        <WeekStats stats={stats} />

        {/* 视图切换（移动端显示，桌面隐藏） */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${view === 'day' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('day')}
          >
            <i className="ti ti-calendar-day" aria-hidden="true" /> 按天
          </button>
          <button
            className={`${styles.viewBtn} ${view === 'week' ? styles.viewBtnActive : ''}`}
            onClick={() => setView('week')}
          >
            <i className="ti ti-calendar-week" aria-hidden="true" /> 本周
          </button>
        </div>

        {/* 提示：高疲劳球员 */}
        {players.some(p => p.fatigue >= 70) && (
          <div className={styles.warnBanner}>
            <i className="ti ti-flame" aria-hidden="true" />
            <span>
              {players.filter(p => p.fatigue >= 70).map(p => p.name).join('、')} 疲劳度偏高，建议安排休息
            </span>
          </div>
        )}

        {/* 课程类型图例 */}
        <div className={styles.legend}>
          {courseTypes.filter(c => c.id !== 'rest').map(c => (
            <span key={c.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: c.color }} />
              {c.label}
            </span>
          ))}
        </div>

        {/* 日历主体 */}
        <div className={styles.calendarWrap}>
          {/* 桌面：周视图 */}
          <div className={styles.desktopOnly}>
            <WeekView />
          </div>
          {/* 移动端：按视图切换 */}
          <div className={styles.mobileOnly}>
            {view === 'week' ? <WeekView /> : <DayView />}
          </div>
        </div>

      </div>

      {/* 课程详情弹窗 */}
      {sessionDetail && (
        <SessionDetail
          session={sessionDetail}
          onClose={() => setSessionDetail(null)}
          onDelete={handleDeleteSession}
        />
      )}

      {/* 添加课程弹窗 */}
      {addTarget && (
        <AddSessionModal
          day={addTarget.day}
          slot={addTarget.slot}
          onClose={() => setAddTarget(null)}
          onAdd={(data) => handleAddSession(addTarget.day, addTarget.slot, data)}
        />
      )}

    </div>
  )
}
