import { useState, useEffect, useCallback } from 'react'
import { useGameCtx } from '../App'
import styles from './RankingsPage.module.css'

// ── 巡回赛配置 ────────────────────────────────────────
const TOURS = [
  { key: 'ATP',          label: 'ATP 男子',       tabClass: styles.tabAtp  },
  { key: 'WTA',          label: 'WTA 女子',       tabClass: styles.tabWta  },
  { key: 'ITF_JUNIOR_M', label: 'ITF 男子青少年', tabClass: styles.tabItf  },
  { key: 'ITF_JUNIOR_F', label: 'ITF 女子青少年', tabClass: styles.tabItfF },
]

// ✅ ITF 年龄范围修正为 14-17岁（14岁以下不参与ITF青少年赛）
const TOUR_FILTER = {
  ATP:          p => p.gender === 'male'   && p.age >= 18,
  WTA:          p => p.gender === 'female' && p.age >= 18,
  ITF_JUNIOR_M: p => p.gender === 'male'   && p.age >= 14 && p.age < 18,
  ITF_JUNIOR_F: p => p.gender === 'female' && p.age >= 14 && p.age < 18,
}

// ── 排名变化图标 ──────────────────────────────────────
function RankChange({ change }) {
  if (change > 0) {
    return (
      <span className={`${styles.rankChange} ${styles.rankUp}`}>
        <i className="ti ti-arrow-up" aria-hidden="true" />
        {change}
      </span>
    )
  }
  if (change < 0) {
    return (
      <span className={`${styles.rankChange} ${styles.rankDown}`}>
        <i className="ti ti-arrow-down" aria-hidden="true" />
        {Math.abs(change)}
      </span>
    )
  }
  return <span className={`${styles.rankChange} ${styles.rankSame}`}>—</span>
}

// ── 单行排名条目 ──────────────────────────────────────
function RankRow({ player, isMine, clubName }) {
  return (
    <div className={`${styles.row} ${isMine ? styles.rowMine : ''}`}>
      <div className={styles.colRank}>
        <span className={`${styles.rankNum} ${player.ranking <= 3 ? styles.top3 : ''}`}>
          {player.ranking}
        </span>
        <RankChange change={player.rankChange} />
      </div>

      <div className={styles.colPlayer}>
        <div className={`${styles.avatar} ${isMine ? styles.avatarMine : ''}`}>
          {player.name.charAt(0)}
        </div>
        <div className={styles.playerInfo}>
          <span className={styles.playerName}>{player.name}</span>
          <div className={styles.playerMeta}>
            <span>{player.age} 岁</span>
            {isMine && (
              <span className={styles.myClubTag}>
                <i className="ti ti-building" aria-hidden="true" />
                {clubName}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.colNat}>{player.nationality || '—'}</div>
      <div className={styles.colPoints}>{player.points?.toLocaleString() ?? '—'}</div>
      <div className={styles.colAge}>{player.age}</div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function RankingsPage() {
  const { state } = useGameCtx()
  const { players: myPlayers, gameState } = state
  const clubName = gameState.clubName

  const [tour, setTour]       = useState('ATP')
  const [rankings, setRankings] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const fetchRankings = useCallback(async (selectedTour) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/rankings?tour=${selectedTour}&limit=100`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRankings(data.players || [])
    } catch (err) {
      setError('排名数据加载失败，请稍后重试')
      console.error('rankings fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRankings(tour)
  }, [tour, fetchRankings])

  const filterFn = TOUR_FILTER[tour] || (() => false)

  const myRankedPlayers   = myPlayers.filter(p => filterFn(p) && p.points > 0)
  const myUnrankedPlayers = myPlayers.filter(p => filterFn(p) && !(p.points > 0))

  const merged = [
    ...rankings.map(p => ({ ...p, _source: 'world', _key: `world_${p.id}` })),
    ...myRankedPlayers.map(p => ({
      id:          `mine_${p.id}`,
      name:        p.name,
      age:         p.age,
      nationality: '中国',
      points:      p.points,
      gender:      p.gender,
      tour,
      rankChange:  0,
      _source:     'mine',
      _key:        `mine_${p.id}`,
    })),
  ]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 100)
    .map((p, idx) => ({ ...p, ranking: idx + 1 }))

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
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.infoBanner}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>
            显示前100名 · 排名变化为近一个月数据 ·
            <span style={{ color: 'var(--forest)', fontWeight: 600 }}> 绿色高亮</span>
            {' '}为本俱乐部球员
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
            <button className={styles.retryBtn} onClick={() => fetchRankings(tour)}>
              重新加载
            </button>
          </div>
        )}

        {!loading && !error && merged.length > 0 && (
          <div className={styles.listCard}>
            <div className={styles.listHeader}>
              <span>排名</span>
              <span>球员</span>
              <span className={styles.colNat}>国籍</span>
              <span style={{ textAlign: 'right' }}>积分</span>
              <span style={{ textAlign: 'center' }}>年龄</span>
            </div>

            {merged.map((player, idx) => (
              <div key={player._key}>
                {idx > 0 && idx % 10 === 0 && <div className={styles.groupDivider} />}
                <RankRow
                  player={player}
                  isMine={player._source === 'mine'}
                  clubName={clubName}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && myUnrankedPlayers.length > 0 && (
          <div className={styles.myPlayersSection}>
            <div className={styles.myPlayersSectionTitle}>
              <i className="ti ti-users" aria-hidden="true" />
              本俱乐部 · 暂无积分球员（{myUnrankedPlayers.length} 人）
            </div>
            {myUnrankedPlayers.map(p => (
              <div key={p.id} className={styles.myPlayersRow}>
                <div>
                  <div className={styles.myPlayersName}>{p.name}</div>
                  <div className={styles.myPlayersMeta}>
                    {p.age} 岁 · {p.gender === 'male' ? '男' : '女'}
                  </div>
                </div>
                <span className={styles.colNat}>中国</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-faint)' }}>0</span>
                <span className={styles.noRankTag} style={{ textAlign: 'center' }}>未上榜</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
