import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useReducer, useEffect, useState, useRef } from 'react'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Topbar from './components/Topbar'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import CoachesPage from './pages/CoachesPage'
import RecruitPage from './pages/RecruitPage'
import SchedulePage from './pages/SchedulePage'
import FacilitiesPage from './pages/FacilitiesPage'
import EventsPage from './pages/EventsPage'
import FinancePage from './pages/FinancePage'
import SettingsPage from './pages/SettingsPage'
import ClubSettingsPage from './pages/ClubSettingsPage'
import RankingsPage from './pages/RankingsPage'
import WeekTransition from './components/WeekTransition'
import WeekSummary from './components/WeekSummary'
import { advanceWeekEngine } from './utils/weekEngine'
import { buildInitialState } from './data/difficultyConfig'

import {
  gameState as initGameState, clubStats as initClubStats,
  players as initPlayers, coaches as initCoaches,
  facilities as initFacilities, weekSchedule as initSchedule,
  allEvents, myEntries as initEntries, eventHistory as initHistory,
  financeSummary as initFinance, weekTransactions as initTransactions,
  weeklyTrend as initTrend, incomeBreakdown as initIncome,
  expenseBreakdown as initExpense, recentNews as initNews,
  upcomingEvents as initUpcoming,
} from './data/mockData'

export const GameCtx = createContext(null)
export const useGameCtx = () => useContext(GameCtx)

const INIT = {
  gameState:        { ...initGameState },
  clubStats:        { ...initClubStats },
  players:          [...initPlayers],
  coaches:          [...initCoaches],
  facilities:       [...initFacilities],
  schedule:         { ...initSchedule },
  allEvents:        [...allEvents],
  myEntries:        [...initEntries],
  eventHistory:     [...initHistory],
  finance:          { ...initFinance },
  transactions:     [...initTransactions],
  weeklyTrend:      [...initTrend],
  incomeBreakdown:  [...initIncome],
  expenseBreakdown: [...initExpense],
  recentNews:       [...initNews],
  upcomingEvents:   [...initUpcoming],
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADVANCE_WEEK':
      return state
    case 'LOAD_SAVE':
      return { ...INIT, ...action.data }
    case 'ADD_SESSION': {
      const { day, session } = action
      return { ...state, schedule: { ...state.schedule, [day]: [...(state.schedule[day] || []), session] } }
    }
    case 'REMOVE_SESSION': {
      const ns = {}
      Object.keys(state.schedule).forEach(d => {
        ns[d] = (state.schedule[d] || []).filter(s => s.id !== action.id)
      })
      return { ...state, schedule: ns }
    }
    case 'UPDATE_GAME_STATE':
      return { ...state, gameState: { ...state.gameState, ...action.data } }
    case 'UPDATE_CLUB_STATS':
      return { ...state, clubStats: { ...state.clubStats, ...action.data } }
    case 'ADD_PLAYER':
      return {
        ...state,
        players: [...state.players, action.player],
        clubStats: { ...state.clubStats, playerCount: state.clubStats.playerCount + 1 },
      }
    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.player.id),
        clubStats: { ...state.clubStats, playerCount: state.clubStats.playerCount - 1 },
      }
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map(p => p.id === action.player.id ? { ...p, ...action.player } : p),
      }
    case 'ADD_COACH':
      return {
        ...state,
        coaches: [...state.coaches, action.coach],
        clubStats: { ...state.clubStats, coachCount: state.clubStats.coachCount + 1 },
      }
    case 'REMOVE_COACH':
      return {
        ...state,
        coaches: state.coaches.filter(c => c.id !== action.coach.id),
        clubStats: { ...state.clubStats, coachCount: state.clubStats.coachCount - 1 },
      }
    case 'UPDATE_COACH':
      return {
        ...state,
        coaches: state.coaches.map(c => c.id === action.coach.id ? { ...c, ...action.coach } : c),
      }
    case 'UPDATE_FACILITY':
      return {
        ...state,
        facilities: state.facilities.map(f => f.id === action.facility.id ? { ...f, ...action.facility } : f),
      }
    case 'ADD_FACILITY':
      return { ...state, facilities: [...state.facilities, action.facility] }
    case 'ENTER_EVENT': {
      const newEntry = action.entry ?? { eventId: action.eventId, playerIds: action.playerIds, status: 'upcoming' }
      const filtered = state.myEntries.filter(e => e.eventId !== newEntry.eventId)
      return { ...state, myEntries: [...filtered, newEntry] }
    }
    case 'WITHDRAW_EVENT': {
      const withdrawId = action.entry?.eventId ?? action.eventId
      return { ...state, myEntries: state.myEntries.filter(e => e.eventId !== withdrawId) }
    }
    case 'ADD_TRANSACTION': {
      // ✅ 只追加记录，不直接修改 cash
      // cash 统一由 weekEngine 在每周结算时计算，避免与 weekEngine 的覆盖逻辑冲突
      // 即时扣款通过 DEDUCT_CASH 单独处理
      return {
        ...state,
        transactions: [...state.transactions, action.tx],
      }
    }
    case 'DEDUCT_CASH': {
      // ✅ 专门用于即时扣款（升级设施、缴纳维护费、新建设施等）
      // 与 ADD_TRANSACTION 配合使用，两者分开以避免 weekEngine 覆盖问题
      return {
        ...state,
        finance: {
          ...state.finance,
          cash: state.finance.cash - action.amount,
        },
        gameState: {
          ...state.gameState,
          cash: (state.gameState.cash ?? state.finance.cash) - action.amount,
        },
      }
    }
    case 'ADD_NEWS':
      return { ...state, recentNews: [action.news, ...state.recentNews].slice(0, 15) }
    default:
      return state
  }
}

// ✅ autoSave 始终存入槽位 1（自动存档固定用槽位1）
function autoSave(state) {
  try {
    localStorage.setItem('tcm_autosave', JSON.stringify(state))

    const userStr = localStorage.getItem('tcm_user')
    if (!userStr) return

    const user = JSON.parse(userStr)
    if (!user?.id) return

    const slot = 1

    const saveData = {
      club_name:    state.gameState.clubName,
      current_year: state.gameState.year,
      current_week: state.gameState.week,
      funds:        state.finance.cash,
      reputation:   state.gameState.prestige,
      difficulty:   state.gameState.difficulty,
      state_json:   JSON.stringify(state),
    }

    fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', userId: user.id, slot, saveData }),
    }).catch(err => console.warn('自动存档远程失败（不影响游戏）:', err))

  } catch (err) {
    console.warn('自动存档失败:', err)
  }
}

export async function manualSave(state, slot = 1) {
  try {
    localStorage.setItem('tcm_autosave', JSON.stringify(state))

    const userStr = localStorage.getItem('tcm_user')
    const user = userStr ? JSON.parse(userStr) : null
    if (!user?.id) return { success: true, remote: false }

    const saveData = {
      club_name:    state.gameState.clubName,
      current_year: state.gameState.year,
      current_week: state.gameState.week,
      funds:        state.finance.cash,
      reputation:   state.gameState.prestige,
      difficulty:   state.gameState.difficulty,
      state_json:   JSON.stringify(state),
    }

    const res = await fetch('/api/saves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', userId: user.id, slot, saveData }),
    })
    const data = await res.json()
    return { success: true, remote: data.success }
  } catch (err) {
    console.warn('手动存档失败:', err)
    return { success: false, error: err.message }
  }
}

export async function loadSave(userId, slot) {
  try {
    const res = await fetch(`/api/saves?userId=${userId}&slot=${slot}`)
    const data = await res.json()
    if (data.save?.state_json) return JSON.parse(data.save.state_json)
  } catch (err) {
    console.warn('远程读档失败，尝试本地:', err)
  }
  try {
    const local = localStorage.getItem('tcm_autosave')
    if (local) return JSON.parse(local)
  } catch {}
  return null
}

const TRANSITION_MIN_MS = 3800

function GameProvider({ children }) {
  const [state, dispatch]                   = useReducer(reducer, INIT)
  const [advancing, setAdvancing]           = useState(false)
  const [showTransition, setShowTransition] = useState(false)
  const [showSummary, setShowSummary]       = useState(false)
  const [summaryState, setSummaryState]     = useState(null)
  const [prevFinance, setPrevFinance]       = useState(null)
  const pendingStateRef = useRef(null)
  // ✅ 用 ref 始终持有最新 state，避免 advanceWeek 闭包读到旧快照
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    // ✅ 新游戏：读取难度 + 年限
    const newGameDifficulty = localStorage.getItem('tcm_new_game_difficulty')
    if (newGameDifficulty) {
      localStorage.removeItem('tcm_new_game_difficulty')
      const gameDuration = parseInt(localStorage.getItem('tcm_new_game_duration') || '20', 10)
      localStorage.removeItem('tcm_new_game_duration')
      const clubName = localStorage.getItem('tcm_new_game_clubname') || '长青网球俱乐部'
      localStorage.removeItem('tcm_new_game_clubname')
      try {
        const newState = buildInitialState(newGameDifficulty, INIT, gameDuration, clubName)
        dispatch({ type: 'LOAD_SAVE', data: newState })
        autoSave(newState)
      } catch (err) {
        console.warn('难度初始化失败:', err)
      }
      return
    }

    // 继续游戏：读取存档
    const pendingLoad = localStorage.getItem('tcm_pending_load')
    if (pendingLoad) {
      try {
        const savedState = JSON.parse(pendingLoad)
        dispatch({ type: 'LOAD_SAVE', data: savedState })
      } catch (err) {
        console.warn('读取存档数据失败:', err)
      } finally {
        localStorage.removeItem('tcm_pending_load')
      }
      return
    }

    // 兜底：读取本地自动存档（刷新页面时恢复）
    // ✅ 修复：不再限制 week>1，只要有合法存档（有 gameState 和 difficulty）就恢复
    // 第1周第1年刷新也能正确恢复，不会重置成 mockData 默认状态
    try {
      const autosave = localStorage.getItem('tcm_autosave')
      if (autosave) {
        const savedState = JSON.parse(autosave)
        if (savedState?.gameState?.difficulty) {
          dispatch({ type: 'LOAD_SAVE', data: savedState })
        }
      }
    } catch {}
  }, [])

  function handleSummaryClose() {
    setShowSummary(false)
    if (pendingStateRef.current) {
      dispatch({ type: 'LOAD_SAVE', data: pendingStateRef.current })
      autoSave(pendingStateRef.current)
      pendingStateRef.current = null
    }
    setAdvancing(false)
  }

  async function advanceWeek() {
    if (advancing) return
    // ✅ 用 stateRef.current 而非闭包里的 state，确保拿到最新状态（含升级扣款后的 cash）
    const currentState = stateRef.current
    setAdvancing(true)
    setPrevFinance({ ...currentState.finance })
    setShowTransition(true)

    const startTime = Date.now()

    try {
      const newState = await advanceWeekEngine(currentState)
      pendingStateRef.current = newState

      const elapsed = Date.now() - startTime
      const remaining = TRANSITION_MIN_MS - elapsed
      if (remaining > 0) {
        await new Promise(r => setTimeout(r, remaining))
      }

      setShowTransition(false)
      setSummaryState(newState)
      setShowSummary(true)

    } catch (err) {
      console.error('❌ advanceWeek 失败:', err)
      setShowTransition(false)
      setAdvancing(false)
    }
  }

  const transitionWeek = (state.gameState.week % 52) + 1
  const transitionYear = state.gameState.week === 52
    ? state.gameState.year + 1
    : state.gameState.year

  return (
    <GameCtx.Provider value={{ state, dispatch, advanceWeek, advancing }}>
      {children}
      <WeekTransition
        visible={showTransition}
        year={transitionYear}
        week={transitionWeek}
      />
      <WeekSummary
        visible={showSummary}
        onClose={handleSummaryClose}
        newState={summaryState}
        prevFinance={prevFinance}
      />
    </GameCtx.Provider>
  )
}

function GameLayout() {
  return (
    <GameProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-area">
          <Topbar />
          <main className="page-content">
            <Routes>
              <Route path="/home"          element={<HomePage />}        />
              <Route path="/players"       element={<PlayersPage />}     />
              <Route path="/coaches"       element={<CoachesPage />}     />
              <Route path="/recruit"       element={<RecruitPage />}     />
              <Route path="/schedule"      element={<SchedulePage />}    />
              <Route path="/facilities"    element={<FacilitiesPage />}  />
              <Route path="/events"        element={<EventsPage />}      />
              <Route path="/finance"       element={<FinancePage />}     />
              <Route path="/settings"      element={<SettingsPage />}    />
              <Route path="/club-settings" element={<ClubSettingsPage />}/>
              <Route path="/rankings"      element={<RankingsPage />}    />
            </Routes>
          </main>
        </div>
        <BottomNav />
      </div>
    </GameProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/*"       element={<GameLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
