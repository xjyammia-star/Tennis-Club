import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { createContext, useContext, useReducer, useCallback } from 'react'
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

import {
  gameState as initGameState,
  clubStats as initClubStats,
  players as initPlayers,
  coaches as initCoaches,
  facilities as initFacilities,
  weekSchedule as initSchedule,
  allEvents,
  myEntries as initEntries,
  eventHistory as initHistory,
  financeSummary as initFinance,
  weekTransactions as initTransactions,
  weeklyTrend as initTrend,
  incomeBreakdown as initIncome,
  expenseBreakdown as initExpense,
  recentNews as initNews,
  upcomingEvents as initUpcoming,
} from './data/mockData'

// ─── Context ─────────────────────────────────────────
export const GameCtx = createContext(null)
export const useGameCtx = () => useContext(GameCtx)

const INIT = {
  gameState: { ...initGameState },
  clubStats: { ...initClubStats },
  players: [...initPlayers],
  coaches: [...initCoaches],
  facilities: [...initFacilities],
  schedule: { ...initSchedule },
  allEvents: [...allEvents],
  myEntries: [...initEntries],
  eventHistory: [...initHistory],
  finance: { ...initFinance },
  transactions: [...initTransactions],
  weeklyTrend: [...initTrend],
  incomeBreakdown: [...initIncome],
  expenseBreakdown: [...initExpense],
  recentNews: [...initNews],
  upcomingEvents: [...initUpcoming],
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADVANCE_WEEK': {
      const gs = state.gameState
      let w = gs.week + 1, y = gs.year
      if (w > 52) { w = 1; y++ }
      return { ...state, gameState: { ...gs, week: w, year: y } }
    }
    case 'ADD_SESSION': {
      const { day, session } = action
      return { ...state, schedule: { ...state.schedule, [day]: [...(state.schedule[day] || []), session] } }
    }
    case 'REMOVE_SESSION': {
      const ns = {}
      Object.keys(state.schedule).forEach(d => { ns[d] = (state.schedule[d] || []).filter(s => s.id !== action.id) })
      return { ...state, schedule: ns }
    }
    case 'UPDATE_GAME_STATE': return { ...state, gameState: { ...state.gameState, ...action.data } }
    case 'UPDATE_CLUB_STATS': return { ...state, clubStats: { ...state.clubStats, ...action.data } }
    case 'ADD_PLAYER': return { ...state, players: [...state.players, action.player], clubStats: { ...state.clubStats, playerCount: state.clubStats.playerCount + 1 } }
    case 'REMOVE_PLAYER': return { ...state, players: state.players.filter(p => p.id !== action.player.id), clubStats: { ...state.clubStats, playerCount: state.clubStats.playerCount - 1 } }
    case 'UPDATE_PLAYER': return { ...state, players: state.players.map(p => p.id === action.player.id ? { ...p, ...action.player } : p) }
    case 'ADD_COACH': return { ...state, coaches: [...state.coaches, action.coach], clubStats: { ...state.clubStats, coachCount: state.clubStats.coachCount + 1 } }
    case 'REMOVE_COACH': return { ...state, coaches: state.coaches.filter(c => c.id !== action.coach.id), clubStats: { ...state.clubStats, coachCount: state.clubStats.coachCount - 1 } }
    case 'UPDATE_COACH': return { ...state, coaches: state.coaches.map(c => c.id === action.coach.id ? { ...c, ...action.coach } : c) }
    case 'UPDATE_FACILITY': return { ...state, facilities: state.facilities.map(f => f.id === action.facility.id ? { ...f, ...action.facility } : f) }
    case 'ADD_FACILITY': return { ...state, facilities: [...state.facilities, action.facility] }
    case 'ENTER_EVENT': return { ...state, myEntries: [...state.myEntries, action.entry] }
    case 'WITHDRAW_EVENT': return { ...state, myEntries: state.myEntries.filter(e => e.eventId !== action.entry.eventId) }
    case 'ADD_TRANSACTION': return { ...state, transactions: [...state.transactions, action.tx], finance: { ...state.finance, cash: state.finance.cash + (action.tx.type === 'income' ? action.tx.amount : -action.tx.amount) } }
    case 'ADD_NEWS': return { ...state, recentNews: [action.news, ...state.recentNews].slice(0, 10) }
    default: return state
  }
}

// ─── Provider ─────────────────────────────────────────
function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, INIT)

  return (
    <GameCtx.Provider value={{ state, dispatch }}>
      {children}
    </GameCtx.Provider>
  )
}

// ─── Layout ───────────────────────────────────────────
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
