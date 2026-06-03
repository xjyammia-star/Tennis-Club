import { useState, useEffect } from 'react'
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

const INITIAL = {
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

// 用 EventTarget 做事件总线，最原生的浏览器机制
const bus = new EventTarget()
let _state = { ...INITIAL }

function _emit() {
  bus.dispatchEvent(new CustomEvent('change', { detail: _state }))
}

function _update(updater) {
  _state = typeof updater === 'function' ? updater(_state) : { ..._state, ...updater }
  _emit()
}

export const gameActions = {
  advanceWeek() {
    _update(s => {
      const gs = s.gameState
      let w = gs.week + 1, y = gs.year
      if (w > 52) { w = 1; y++ }
      return { ...s, gameState: { ...gs, week: w, year: y } }
    })
  },
  updatePlayer(p)    { _update(s => ({ ...s, players: s.players.map(x => x.id === p.id ? { ...x, ...p } : x) })) },
  addPlayer(p)       { _update(s => ({ ...s, players: [...s.players, p], clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount + 1 } })) },
  removePlayer(p)    { _update(s => ({ ...s, players: s.players.filter(x => x.id !== p.id), clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount - 1 } })) },
  updateCoach(c)     { _update(s => ({ ...s, coaches: s.coaches.map(x => x.id === c.id ? { ...x, ...c } : x) })) },
  addCoach(c)        { _update(s => ({ ...s, coaches: [...s.coaches, c], clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount + 1 } })) },
  removeCoach(c)     { _update(s => ({ ...s, coaches: s.coaches.filter(x => x.id !== c.id), clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount - 1 } })) },
  addSession(day, session) { _update(s => ({ ...s, schedule: { ...s.schedule, [day]: [...(s.schedule[day] || []), session] } })) },
  removeSession(id)  {
    _update(s => {
      const ns = {}
      Object.keys(s.schedule).forEach(d => { ns[d] = (s.schedule[d] || []).filter(x => x.id !== id) })
      return { ...s, schedule: ns }
    })
  },
  updateFacility(f)  { _update(s => ({ ...s, facilities: s.facilities.map(x => x.id === f.id ? { ...x, ...f } : x) })) },
  addFacility(f)     { _update(s => ({ ...s, facilities: [...s.facilities, f] })) },
  enterEvent(e)      { _update(s => ({ ...s, myEntries: [...s.myEntries, e] })) },
  withdrawEvent(e)   { _update(s => ({ ...s, myEntries: s.myEntries.filter(x => x.eventId !== e.eventId) })) },
  addTransaction(tx) { _update(s => ({ ...s, transactions: [...s.transactions, tx], finance: { ...s.finance, cash: s.finance.cash + (tx.type === 'income' ? tx.amount : -tx.amount) } })) },
  updateFinance(d)   { _update(s => ({ ...s, finance: { ...s.finance, ...d } })) },
  updateGameState(d) { _update(s => ({ ...s, gameState: { ...s.gameState, ...d } })) },
  updateClubStats(d) { _update(s => ({ ...s, clubStats: { ...s.clubStats, ...d } })) },
  addNews(n)         { _update(s => ({ ...s, recentNews: [n, ...s.recentNews].slice(0, 10) })) },
  loadSave(d)        { _update(d) },
}

// Hook：监听 EventTarget 上的 change 事件
export function useStore() {
  const [s, setS] = useState(_state)
  useEffect(() => {
    function handler(e) { setS(e.detail) }
    bus.addEventListener('change', handler)
    return () => bus.removeEventListener('change', handler)
  }, [])
  return s
}

export function useGameState()  { return useStore().gameState  }
export function useClubStats()  { return useStore().clubStats  }
export function usePlayers()    { return useStore().players    }
export function useCoaches()    { return useStore().coaches    }
export function useFacilities() { return useStore().facilities }
export function useSchedule()   { return useStore().schedule   }
export function useFinance()    { return useStore().finance    }
export function useFullState()  { return useStore()            }
