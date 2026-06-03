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

// ── 模块级状态 ────────────────────────────────────────
let _state = {
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

// 订阅者列表：每个元素是一个 React setState 函数
const _setters = new Set()

function _update(updater) {
  _state = typeof updater === 'function' ? updater(_state) : { ..._state, ...updater }
  // 通知所有订阅的组件重新渲染，传入新的 state 引用
  _setters.forEach(set => set(_state))
}

// ── Hook：订阅全局 state ──────────────────────────────
export function useStore() {
  const [localState, setLocalState] = useState(_state)

  useEffect(() => {
    // 组件挂载时：同步最新状态（防止挂载前有更新），并注册订阅
    setLocalState(_state)
    _setters.add(setLocalState)
    return () => {
      // 组件卸载时：取消订阅
      _setters.delete(setLocalState)
    }
  }, []) // 空依赖，只在挂载/卸载时执行

  return localState
}

// ── Actions ───────────────────────────────────────────
export const gameActions = {
  advanceWeek() {
    _update(s => {
      const gs = s.gameState
      let newWeek = gs.week + 1
      let newYear = gs.year
      if (newWeek > 52) { newWeek = 1; newYear++ }
      return { ...s, gameState: { ...gs, week: newWeek, year: newYear } }
    })
  },
  updatePlayer(player) {
    _update(s => ({ ...s, players: s.players.map(p => p.id === player.id ? { ...p, ...player } : p) }))
  },
  addPlayer(player) {
    _update(s => ({ ...s, players: [...s.players, player], clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount + 1 } }))
  },
  removePlayer(player) {
    _update(s => ({ ...s, players: s.players.filter(p => p.id !== player.id), clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount - 1 } }))
  },
  updateCoach(coach) {
    _update(s => ({ ...s, coaches: s.coaches.map(c => c.id === coach.id ? { ...c, ...coach } : c) }))
  },
  addCoach(coach) {
    _update(s => ({ ...s, coaches: [...s.coaches, coach], clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount + 1 } }))
  },
  removeCoach(coach) {
    _update(s => ({ ...s, coaches: s.coaches.filter(c => c.id !== coach.id), clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount - 1 } }))
  },
  addSession(day, session) {
    _update(s => ({ ...s, schedule: { ...s.schedule, [day]: [...(s.schedule[day] || []), session] } }))
  },
  removeSession(sessionId) {
    _update(s => {
      const newSched = {}
      Object.keys(s.schedule).forEach(d => {
        newSched[d] = (s.schedule[d] || []).filter(ss => ss.id !== sessionId)
      })
      return { ...s, schedule: newSched }
    })
  },
  updateFacility(facility) {
    _update(s => ({ ...s, facilities: s.facilities.map(f => f.id === facility.id ? { ...f, ...facility } : f) }))
  },
  addFacility(facility) {
    _update(s => ({ ...s, facilities: [...s.facilities, facility] }))
  },
  enterEvent(entry)      { _update(s => ({ ...s, myEntries: [...s.myEntries, entry] })) },
  withdrawEvent(entry)   { _update(s => ({ ...s, myEntries: s.myEntries.filter(e => e.eventId !== entry.eventId) })) },
  addTransaction(tx) {
    _update(s => ({
      ...s,
      transactions: [...s.transactions, tx],
      finance: { ...s.finance, cash: s.finance.cash + (tx.type === 'income' ? tx.amount : -tx.amount) },
    }))
  },
  updateFinance(data)   { _update(s => ({ ...s, finance:    { ...s.finance,    ...data } })) },
  updateGameState(data) { _update(s => ({ ...s, gameState:  { ...s.gameState,  ...data } })) },
  updateClubStats(data) { _update(s => ({ ...s, clubStats:  { ...s.clubStats,  ...data } })) },
  addNews(news)         { _update(s => ({ ...s, recentNews: [news, ...s.recentNews].slice(0, 10) })) },
  loadSave(saveData)    { _update(saveData) },
}

// ── 便捷 hooks（从 useStore 解构）────────────────────
export function useGameState()  { return useStore().gameState  }
export function useClubStats()  { return useStore().clubStats  }
export function usePlayers()    { return useStore().players    }
export function useCoaches()    { return useStore().coaches    }
export function useFacilities() { return useStore().facilities }
export function useSchedule()   { return useStore().schedule   }
export function useFinance()    { return useStore().finance    }
export function useFullState()  { return useStore()            }
