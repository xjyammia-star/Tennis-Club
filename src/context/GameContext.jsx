import { createContext, useContext, useReducer, useMemo } from 'react'
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
} from '../data/mockData'

// ── 初始状态 ─────────────────────────────────────────
const initialState = {
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
  isLoading: false,
  error: null,
}

// ── Action 类型 ───────────────────────────────────────
export const ACTIONS = {
  ADVANCE_WEEK:      'ADVANCE_WEEK',
  UPDATE_PLAYER:     'UPDATE_PLAYER',
  ADD_PLAYER:        'ADD_PLAYER',
  REMOVE_PLAYER:     'REMOVE_PLAYER',
  UPDATE_COACH:      'UPDATE_COACH',
  ADD_COACH:         'ADD_COACH',
  REMOVE_COACH:      'REMOVE_COACH',
  ADD_SESSION:       'ADD_SESSION',
  REMOVE_SESSION:    'REMOVE_SESSION',
  UPDATE_SESSION:    'UPDATE_SESSION',
  UPDATE_FACILITY:   'UPDATE_FACILITY',
  ADD_FACILITY:      'ADD_FACILITY',
  ENTER_EVENT:       'ENTER_EVENT',
  WITHDRAW_EVENT:    'WITHDRAW_EVENT',
  ADD_TRANSACTION:   'ADD_TRANSACTION',
  UPDATE_FINANCE:    'UPDATE_FINANCE',
  UPDATE_GAME_STATE: 'UPDATE_GAME_STATE',
  UPDATE_CLUB_STATS: 'UPDATE_CLUB_STATS',
  ADD_NEWS:          'ADD_NEWS',
  LOAD_SAVE:         'LOAD_SAVE',
  SET_LOADING:       'SET_LOADING',
  SET_ERROR:         'SET_ERROR',
}

// ── Reducer ───────────────────────────────────────────
function gameReducer(state, action) {
  switch (action.type) {

    case ACTIONS.ADVANCE_WEEK: {
      const gs = state.gameState
      let newWeek = gs.week + 1
      let newYear = gs.year
      if (newWeek > 52) { newWeek = 1; newYear++ }
      return { ...state, gameState: { ...gs, week: newWeek, year: newYear } }
    }

    case ACTIONS.UPDATE_PLAYER:
      return { ...state, players: state.players.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p) }

    case ACTIONS.ADD_PLAYER:
      return { ...state, players: [...state.players, action.payload], clubStats: { ...state.clubStats, playerCount: state.clubStats.playerCount + 1 } }

    case ACTIONS.REMOVE_PLAYER:
      return { ...state, players: state.players.filter(p => p.id !== action.payload.id), clubStats: { ...state.clubStats, playerCount: state.clubStats.playerCount - 1 } }

    case ACTIONS.UPDATE_COACH:
      return { ...state, coaches: state.coaches.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) }

    case ACTIONS.ADD_COACH:
      return { ...state, coaches: [...state.coaches, action.payload], clubStats: { ...state.clubStats, coachCount: state.clubStats.coachCount + 1 } }

    case ACTIONS.REMOVE_COACH:
      return { ...state, coaches: state.coaches.filter(c => c.id !== action.payload.id), clubStats: { ...state.clubStats, coachCount: state.clubStats.coachCount - 1 } }

    case ACTIONS.ADD_SESSION: {
      const { day, session } = action.payload
      return { ...state, schedule: { ...state.schedule, [day]: [...(state.schedule[day] || []), session] } }
    }

    case ACTIONS.REMOVE_SESSION: {
      const newSchedule = {}
      Object.keys(state.schedule).forEach(day => {
        newSchedule[day] = (state.schedule[day] || []).filter(s => s.id !== action.payload.sessionId)
      })
      return { ...state, schedule: newSchedule }
    }

    case ACTIONS.UPDATE_SESSION: {
      const { day, session } = action.payload
      return { ...state, schedule: { ...state.schedule, [day]: (state.schedule[day] || []).map(s => s.id === session.id ? { ...s, ...session } : s) } }
    }

    case ACTIONS.UPDATE_FACILITY:
      return { ...state, facilities: state.facilities.map(f => f.id === action.payload.id ? { ...f, ...action.payload } : f) }

    case ACTIONS.ADD_FACILITY:
      return { ...state, facilities: [...state.facilities, action.payload] }

    case ACTIONS.ENTER_EVENT:
      return { ...state, myEntries: [...state.myEntries, action.payload] }

    case ACTIONS.WITHDRAW_EVENT:
      return { ...state, myEntries: state.myEntries.filter(e => e.eventId !== action.payload.eventId) }

    case ACTIONS.ADD_TRANSACTION:
      return {
        ...state,
        transactions: [...state.transactions, action.payload],
        finance: { ...state.finance, cash: state.finance.cash + (action.payload.type === 'income' ? action.payload.amount : -action.payload.amount) },
      }

    case ACTIONS.UPDATE_FINANCE:
      return { ...state, finance: { ...state.finance, ...action.payload } }

    case ACTIONS.UPDATE_GAME_STATE:
      return { ...state, gameState: { ...state.gameState, ...action.payload } }

    case ACTIONS.UPDATE_CLUB_STATS:
      return { ...state, clubStats: { ...state.clubStats, ...action.payload } }

    case ACTIONS.ADD_NEWS:
      return { ...state, recentNews: [action.payload, ...state.recentNews].slice(0, 10) }

    case ACTIONS.LOAD_SAVE:
      return { ...initialState, ...action.payload, isLoading: false }

    case ACTIONS.SET_LOADING:
      return { ...state, isLoading: action.payload }

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────
const GameContext = createContext(null)

// ── Provider ──────────────────────────────────────────
export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // useMemo 确保 actions 对象引用稳定，避免无限重渲染
  const actions = useMemo(() => ({
    updatePlayer:    (player)       => dispatch({ type: ACTIONS.UPDATE_PLAYER,     payload: player        }),
    addPlayer:       (player)       => dispatch({ type: ACTIONS.ADD_PLAYER,        payload: player        }),
    removePlayer:    (player)       => dispatch({ type: ACTIONS.REMOVE_PLAYER,     payload: player        }),
    updateCoach:     (coach)        => dispatch({ type: ACTIONS.UPDATE_COACH,      payload: coach         }),
    addCoach:        (coach)        => dispatch({ type: ACTIONS.ADD_COACH,         payload: coach         }),
    removeCoach:     (coach)        => dispatch({ type: ACTIONS.REMOVE_COACH,      payload: coach         }),
    addSession:      (day, session) => dispatch({ type: ACTIONS.ADD_SESSION,       payload: { day, session } }),
    removeSession:   (sessionId)    => dispatch({ type: ACTIONS.REMOVE_SESSION,    payload: { sessionId } }),
    updateSession:   (day, session) => dispatch({ type: ACTIONS.UPDATE_SESSION,    payload: { day, session } }),
    updateFacility:  (facility)     => dispatch({ type: ACTIONS.UPDATE_FACILITY,   payload: facility      }),
    addFacility:     (facility)     => dispatch({ type: ACTIONS.ADD_FACILITY,      payload: facility      }),
    enterEvent:      (entry)        => dispatch({ type: ACTIONS.ENTER_EVENT,       payload: entry         }),
    withdrawEvent:   (entry)        => dispatch({ type: ACTIONS.WITHDRAW_EVENT,    payload: entry         }),
    addTransaction:  (tx)           => dispatch({ type: ACTIONS.ADD_TRANSACTION,   payload: tx            }),
    updateFinance:   (data)         => dispatch({ type: ACTIONS.UPDATE_FINANCE,    payload: data          }),
    updateGameState: (data)         => dispatch({ type: ACTIONS.UPDATE_GAME_STATE, payload: data          }),
    updateClubStats: (data)         => dispatch({ type: ACTIONS.UPDATE_CLUB_STATS, payload: data          }),
    addNews:         (news)         => dispatch({ type: ACTIONS.ADD_NEWS,          payload: news          }),
    advanceWeek:     ()             => dispatch({ type: ACTIONS.ADVANCE_WEEK                              }),
    loadSave:        (saveData)     => dispatch({ type: ACTIONS.LOAD_SAVE,         payload: saveData      }),
    setLoading:      (val)          => dispatch({ type: ACTIONS.SET_LOADING,       payload: val           }),
    setError:        (err)          => dispatch({ type: ACTIONS.SET_ERROR,         payload: err           }),
  }), [dispatch])

  return (
    <GameContext.Provider value={{ state, dispatch, ...actions }}>
      {children}
    </GameContext.Provider>
  )
}

// ── Hooks ─────────────────────────────────────────────
export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame 必须在 GameProvider 内使用')
  return ctx
}

export function useGameState()    { return useGame().state.gameState    }
export function useClubStats()    { return useGame().state.clubStats    }
export function usePlayers()      { return useGame().state.players      }
export function useCoaches()      { return useGame().state.coaches      }
export function useFacilities()   { return useGame().state.facilities   }
export function useSchedule()     { return useGame().state.schedule     }
export function useFinance()      { return useGame().state.finance      }
export function useTransactions() { return useGame().state.transactions }
export function useEvents()       { return useGame().state              }
