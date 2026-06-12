import { useState, useEffect, useCallback } from 'react'
import { useGameCtx } from '../App'
import styles from './RankingsPage.module.css'

const TOURS = [
  { key: 'ATP',       label: 'ATP 男子',       tabClass: styles.tabAtp  },
  { key: 'WTA',       label: 'WTA 女子',       tabClass: styles.tabWta  },
  { key: 'ITF_JUNIOR',label: 'ITF 青少年',     tabClass: styles.tabItf  },
]

function RankChange({ change }) {
  if (change > 0) return (
    <span className={`${styles.rankChange} ${styles.rankUp}`}>
      <i className="ti ti-arrow-up" aria-hidden="true" />{change}
    </span>
  )
  if (change < 0) return (
    <span className={`${styles.rankChange} ${styles.rankDown}`}>
      <i className="ti ti-arrow-down" aria-hidden="true" />{Math.abs(change)}
    </span>
  )
  return <span className={`${styles.rankChange} ${styles.rankSame}`}>—</span>
}

function RankRow({ player, clubName }) {
  const isMine = !!player.is_club
  return (
    <div className={`${styles.row} ${isMine ? styles.rowMine : ''}`}>
      <div className={styles.colRank}>
        <span className={`${styles.rankNum} ${Number(player.ranking) <= 3 ? styles.top3 : ''}`}>
          {player.ranking}
        </span>
        <RankChange change={0} />
      </div>
      <div className={styles.colPlayer}>
        <div className={`${styles.avatar} ${isMine ? styles.avatarMine : ''}`}>
          {player.player_name?.charAt(0)}
        </div>
        <div className={styles.playerInfo}>
          <span className={styles.playerName}>{player.player_name}</span>
          <div className={styles.playerMeta}>
            <span>{player.age} 岁</span>
            {isMine && (
              <span className={styles.myClubTag}>
                <i className="ti ti-building" aria-hidden="true" />{clubName}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={styles.colNat}>{player.nationality || '—'}</div>
      <div className={styles.colPoints}>{Number(player.total_points)?.toLocaleString() ?? '—'}</div>
      <div className={styles.colAge}>{player.age}</div>
    </div>
  )
}

export default function RankingsPage() {
  const { state } = useGameCtx()
  const { players: myPlayers, gameState } = state
  const clubName = gameState.clubName

  const [tour,     setTour]     = useState('ATP')
  const [rankings, setRankings] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const [noData,   setNoData]   = useState(false)

  const fetchRankings = useCallback(async (selectedTour) => {
    setLoading(true)
    setError(null)
    setNoData(false)
    try {
      const userStr = localStorage.getItem('tcm_user')
      const user    = userStr ? JSON.parse(userStr) : null
      const saveSlot = parseInt(localStorage.getItem('tcm_save_slot') || '1', 10)

      if (!user?.id) {
        setNoData(true)
        return
      }

      const res = await fetch(
        `/api/game_rankings?userId=${user.id}&saveSlot=${saveSlot}&tour=${selectedTour}&limit=100`
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rows = data.players || []

      if (rows.length === 0) {
        setNoData(true)
        setRankings([])
      } else {
        setRankings(rows)
        setNoData(false)
      }
    } catch (err) {
      setError('排名数据加载失败，请稍后重试')
      console.error('rankings fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRankings(tour) }, [tour, fetchRankings])

  // 无 game_rankings 数据时（老存档或未初始化），降级显示：
  // 真实排名 + 本俱乐部球员前端合并（兼容模式）
  const fallbackRankings = (() => {
    if (!noData) return []
    const tourFilter = {
      ATP:        p => p.gender === 'male'   && p.age >= 18,
      WTA:        p => p.gender === 'female' && p.age >= 18,
      ITF_JUNIOR: p => p.age >= 14 && p.age < 18,
    }
    const fn = tourFilter[tour] || (() => false)
    return myPlayers
      .filter(p => fn(p) && p.points > 0)
      .sort((a, b) => b.points - a.points)
      .map((p, i) => ({
        ranking:      i + 1,
        player_id:    `club_${p.id}`,
        player_name:  p.name,
        age:          p.age,
        nationality:  '中国',
        total_points: p.points,
        is_club:      true,
      }))
  })()

  const displayList = noData ? fallbackRankings : rankings

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>世界排名</h1>
      </header>

      <div className={styles.inner}>
        <div className={styles.tabs}>
          {TOURS.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${t.tabClass} ${tour === t.key ? styles.tabActive : ''}`}
              onClick={() => setTour(t.key)}
            >{t.label}</button>
          ))}
        </div>

        <div className={styles.infoBanner}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>
            显示前100名 · 积分采用滚动52周规则 ·
            <span style={{ color: 'var(--forest)', fontWeight: 600 }}> 绿色高亮</span>为本俱乐部球员
          </span>
        </div>

        {loading && (
          <div className={styles.loadingWrap}>
            <i className="ti ti-loader-2" aria-hidden="true" />
            <span>加载排名数据中…</span>
          </div>
        )}

        {error && !loading && (
          <div className={styles.errorWrap}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <span>{error}</span>
            <button className={styles.retryBtn} onClick={() => fetchRankings(tour)}>重新加载</button>
          </div>
        )}

        {!loading && !error && noData && fallbackRankings.length === 0 && (
          <div className={styles.errorWrap}>
            <i className="ti ti-info-circle" aria-hidden="true" />
            <span>排名数据尚未初始化，请从新游戏开始或推进几周后查看。</span>
          </div>
        )}

        {!loading && !error && displayList.length > 0 && (
          <div className={styles.listCard}>
            <div className={styles.listHeader}>
              <span>排名</span>
              <span>球员</span>
              <span className={styles.colNat}>国籍</span>
              <span style={{ textAlign: 'right' }}>积分</span>
              <span style={{ textAlign: 'center' }}>年龄</span>
            </div>
            {displayList.map((player, idx) => (
              <div key={player.player_id || idx}>
                {idx > 0 && idx % 10 === 0 && <div className={styles.groupDivider} />}
                <RankRow player={player} clubName={clubName} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
