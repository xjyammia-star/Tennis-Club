// 全局状态管理 — 最简单可靠的方案
// 直接把 React setState 函数存在 Set 里，状态变化时直接调用

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

// ─── 唯一 store 对象，挂在 window 上防止模块被打包两次 ───
// 这是解决 Vite/Webpack 模块缓存问题的关键
if (!window.__TCM_STORE__) {
  window.__TCM_STORE__ = {
    state: {
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
    },
    setters: new Set(),
  }
}

const store = window.__TCM_STORE__

function update(updater) {
  store.state = typeof updater === 'function' ? updater(store.state) : { ...store.state, ...updater }
  // 直接调用每个订阅组件的 React setState
  store.setters.forEach(set => set(store.state))
}

// ─── Actions ────────────────────────────────────────────
export const gameActions = {
  advanceWeek() {
    update(s => {
      const gs = s.gameState
      let w = gs.week + 1, y = gs.year
      if (w > 52) { w = 1; y++ }
      return { ...s, gameState: { ...gs, week: w, year: y } }
    })
  },
  updatePlayer(p)    { update(s => ({ ...s, players: s.players.map(x => x.id === p.id ? { ...x, ...p } : x) })) },
  addPlayer(p)       { update(s => ({ ...s, players: [...s.players, p], clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount + 1 } })) },
  removePlayer(p)    { update(s => ({ ...s, players: s.players.filter(x => x.id !== p.id), clubStats: { ...s.clubStats, playerCount: s.clubStats.playerCount - 1 } })) },
  updateCoach(c)     { update(s => ({ ...s, coaches: s.coaches.map(x => x.id === c.id ? { ...x, ...c } : x) })) },
  addCoach(c)        { update(s => ({ ...s, coaches: [...s.coaches, c], clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount + 1 } })) },
  removeCoach(c)     { update(s => ({ ...s, coaches: s.coaches.filter(x => x.id !== c.id), clubStats: { ...s.clubStats, coachCount: s.clubStats.coachCount - 1 } })) },
  addSession(day, session) { update(s => ({ ...s, schedule: { ...s.schedule, [day]: [...(s.schedule[day] || []), session] } })) },
  removeSession(id)  {
    update(s => {
      const ns = {}
      Object.keys(s.schedule).forEach(d => { ns[d] = (s.schedule[d] || []).filter(x => x.id !== id) })
      return { ...s, schedule: ns }
    })
  },
  updateFacility(f)  { update(s => ({ ...s, facilities: s.facilities.map(x => x.id === f.id ? { ...x, ...f } : x) })) },
  addFacility(f)     { update(s => ({ ...s, facilities: [...s.facilities, f] })) },
  enterEvent(e)      { update(s => ({ ...s, myEntries: [...s.myEntries, e] })) },
  withdrawEvent(e)   { update(s => ({ ...s, myEntries: s.myEntries.filter(x => x.eventId !== e.eventId) })) },
  addTransaction(tx) { update(s => ({ ...s, transactions: [...s.transactions, tx], finance: { ...s.finance, cash: s.finance.cash + (tx.type === 'income' ? tx.amount : -tx.amount) } })) },
  updateFinance(d)   { update(s => ({ ...s, finance: { ...s.finance, ...d } })) },
  updateGameState(d) { update(s => ({ ...s, gameState: { ...s.gameState, ...d } })) },
  updateClubStats(d) { update(s => ({ ...s, clubStats: { ...s.clubStats, ...d } })) },
  addNews(n)         { update(s => ({ ...s, recentNews: [n, ...s.recentNews].slice(0, 10) })) },
  loadSave(d)        { update(d) },
}

// ─── Hook ────────────────────────────────────────────────
export function useStore() {
  const [s, setS] = useState(() => store.state)

  useEffect(() => {
    // 挂载时同步最新状态
    setS(store.state)
    // 注册订阅
    store.setters.add(setS)
    return () => store.setters.delete(setS)
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
