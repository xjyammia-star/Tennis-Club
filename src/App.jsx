import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useReducer, useEffect, useState } from 'react'
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
import RankingsPage from './pages/RankingsPage'   // ✅ 新增
import { advanceWeekEngine } from './utils/weekEngine'
import { buildInitialState } from './data/difficultyConfig'  // ✅ 新增

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
    case 'ENTER_EVENT':
      return { ...state, myEntries: [...state.myEntries, action.entry] }
    case 'WITHDRAW_EVENT':
      return { ...state, myEntries: state.myEntries.filter(e => e.eventId !== action.entry.eventId) }
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [...state.transactions, action.tx],
        finance: {
          ...state.finance,
          cash: state.finance.cash + (action.tx.type === 'income' ? action.tx.amount : -action.tx.amount),
        },
      }
    case 'ADD_NEWS':
      return { ...state, recentNews: [action.news, ...state.recentNews].slice(0, 15) }
    default:
      return state
  }
}

function autoSave(state) {
  try {
    localStorage.setItem('tcm_autosave', JSON.stringify(state))
    const userStr = localStorage.getItem('tcm_user')
    const slotStr = localStorage.getItem('tcm_current_slot')
    if (!userStr || !slotStr) return
    const user = JSON.parse(userStr)
    const slot = parseInt(slotStr, 10)
    if (!user?.id || !slot) return
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

export async function manualSave(state, slot) {
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
    if (data.save?.state_json) {
      return JSON.parse(data.save.state_json)
    }
  } catch (err) {
    console.warn('远程读档失败，尝试本地:', err)
  }
  try {
    const local = localStorage.getItem('tcm_autosave')
    if (local) return JSON.parse(local)
  } catch {}
  return null
}

function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    // 优先检查新游戏难度（点「开始游戏」选难度后跳转）
    const newGameDifficulty = localStorage.getItem('tcm_new_game_difficulty')
    if (newGameDifficulty) {
      localStorage.removeItem('tcm_new_game_difficulty')
      try {
        const newState = buildInitialState(newGameDifficulty, INIT)
        dispatch({ type: 'LOAD_SAVE', data: newState })
      } catch (err) {
        console.warn('难度初始化失败，使用默认 state:', err)
      }
      return
    }
    // 检查是否有存档需要加载（点「继续游戏」后跳转）
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
    }
  }, [])

  async function advanceWeek() {
    if (advancing) return
    setAdvancing(true)
    try {
      const newState = await advanceWeekEngine(state)
      dispatch({ type: 'LOAD_SAVE', data: newState })
      autoSave(newState)
    } catch (err) {
      console.error('进入下一周失败:', err)
    } finally {
      setAdvancing(false)
    }
  }

  return (
    <GameCtx.Provider value={{ state, dispatch, advanceWeek, advancing }}>
      {children}
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
              <Route path="/rankings"      element={<RankingsPage />}    />  {/* ✅ 新增 */}
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
