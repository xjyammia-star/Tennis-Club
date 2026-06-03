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

import { useSyncExternalStore } from 'react'

// ── Store ─────────────────────────────────────────────
let state = {
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

const listeners = new Set()

function setState(updater) {
  state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
  listeners.forEach(fn => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot() {
  return state
}

// ── Actions ───────────────────────────────────────────
export const gameActions = {
  advanceWeek() {
    setState(s => {
      const gs = s.gameState
      let newWeek = gs.week + 1
      let newYear = gs.year
      if (newWeek > 52) { newWeek = 1; newYear++ }
      return { ...s, gameState: { ...gs, week: newWeek, year: newYear } }
    })
  },
  updatePlayer(player) {
    setState(s => ({ ...s, players: s.players.map(p => p.id === player.id ? { ...p, ...player } : p) }))
  },
  addPlayer(player) {
    setState(s => ({ ...s, players: [...s.players, player], clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount + 1 } }))
  },
  removePlayer(player) {
    setState(s => ({ ...s, players: s.players.filter(p => p.id !== player.id), clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount - 1 } }))
  },
  updateCoach(coach) {
    setState(s => ({ ...s, coaches: s.coaches.map(c => c.id === coach.id ? { ...c, ...coach } : c) }))
  },
  addCoach(coach) {
    setState(s => ({ ...s, coaches: [...s.coaches, coach], clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount + 1 } }))
  },
  removeCoach(coach) {
    setState(s => ({ ...s, coaches: s.coaches.filter(c => c.id !== coach.id), clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount - 1 } }))
  },
  addSession(day, session) {
    setState(s => ({ ...s, schedule: { ...s.schedule, [day]: [...(s.schedule[day] || []), session] } }))
  },
  removeSession(sessionId) {
    setState(s => {
      const newSchedule = {}
      Object.keys(s.schedule).forEach(day => {
        newSchedule[day] = (s.schedule[day] || []).filter(ss => ss.id !== sessionId)
      })
      return { ...s, schedule: newSchedule }
    })
  },
  updateFacility(facility) {
    setState(s => ({ ...s, facilities: s.facilities.map(f => f.id === facility.id ? { ...f, ...facility } : f) }))
  },
  addFacility(facility) {
    setState(s => ({ ...s, facilities: [...s.facilities, facility] }))
  },
  enterEvent(entry) {
    setState(s => ({ ...s, myEntries: [...s.myEntries, entry] }))
  },
  withdrawEvent(entry) {
    setState(s => ({ ...s, myEntries: s.myEntries.filter(e => e.eventId !== entry.eventId) }))
  },
  addTransaction(tx) {
    setState(s => ({
      ...s,
      transactions: [...s.transactions, tx],
      finance: { ...s.finance, cash: s.finance.cash + (tx.type === 'income' ? tx.amount : -tx.amount) },
    }))
  },
  updateFinance(data) {
    setState(s => ({ ...s, finance: { ...s.finance, ...data } }))
  },
  updateGameState(data) {
    setState(s => ({ ...s, gameState: { ...s.gameState, ...data } }))
  },
  updateClubStats(data) {
    setState(s => ({ ...s, clubStats: { ...s.clubStats, ...data } }))
  },
  addNews(news) {
    setState(s => ({ ...s, recentNews: [news, ...s.recentNews].slice(0, 10) }))
  },
  loadSave(saveData) {
    setState(saveData)
  },
}

// ── Hook：用 React 18 的 useSyncExternalStore ─────────
// 这是 React 官方推荐的订阅外部 store 的方式，100% 可靠
export function useGameStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()))
}

export function useGameState()  { return useGameStore(s => s.gameState)  }
export function useClubStats()  { return useGameStore(s => s.clubStats)  }
export function usePlayers()    { return useGameStore(s => s.players)    }
export function useCoaches()    { return useGameStore(s => s.coaches)    }
export function useFacilities() { return useGameStore(s => s.facilities) }
export function useSchedule()   { return useGameStore(s => s.schedule)   }
export function useFinance()    { return useGameStore(s => s.finance)    }
export function useFullState()  { return useGameStore(s => s)            }
