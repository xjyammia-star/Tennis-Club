import { useState, useEffect, useCallback } from 'react'
import { useGameCtx } from '../App'
import styles from './RankingsPage.module.css'

// ── 巡回赛配置 ────────────────────────────────────────
const TOURS = [
  { key: 'ATP',        label: 'ATP 男子',   tabClass: styles.tabAtp  },
  { key: 'WTA',        label: 'WTA 女子',   tabClass: styles.tabWta  },
  { key: 'ITF_JUNIOR', label: 'ITF 青少年', tabClass: styles.tabItf  },
]

// 巡回赛对应的球员性别过滤
const TOUR_GENDER = { ATP: 'male', WTA: 'female', ITF_JUNIOR: null }

// ── 排名变化图标 ──────────────────────────────────────
function RankChange({ change }) {
  if (change > 0) {
    // rankChange = lastMonth - current，正数代表上月排名更靠后 = 本月上升
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
      {/* 排名 + 变化 */}
      <div className={styles.colRank}>
        <span className={`${styles.rankNum} ${player.ranking <= 3 ? styles.top3 : ''}`}>
          {player.ranking}
        </span>
        <RankChange change={player.rankChange} />
      </div>

      {/* 球员信息 */}
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

      {/* 国籍 */}
      <div className={styles.colNat}>{player.nationality || '—'}</div>

      {/* 积分 */}
      <div className={styles.colPoints}>{player.points?.toLocaleString() ?? '—'}</div>

      {/* 年龄（在大屏显示） */}
      <div className={styles.colAge}>{player.age}</div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function RankingsPage() {
  const { state } = useGameCtx()
  const { players: myPlayers, gameState } = state
  const clubName = gameState.clubName

  const [tour, setTour]         = useState('ATP')
  const [rankings, setRankings] = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  // ── 拉取排名数据 ──────────────────────────────────
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

  // ── 把俱乐部球员「插入」到排名列表 ───────────────
  // 策略：
  // 1. 找出本巡回赛对应性别的我方球员（有积分/排名的）
  // 2. 合并进世界排名列表，按积分重新排序，取前100
  // 3. 没有积分的我方球员单独展示在列表下方
  const tourGender = TOUR_GENDER[tour]  // null = ITF不过滤性别

  // 有排名的我方球员（参与当前巡回赛）
  const myRankedPlayers = myPlayers.filter(p => {
    if (!p.points || p.points <= 0) return false
    if (tourGender && p.gender !== tourGender) return false
    if (tour === 'ITF_JUNIOR' && p.age >= 18) return false
    if (tour !== 'ITF_JUNIOR' && p.age < 18) return false
    return true
  })

  // 没有积分的我方球员（显示在列表下方）
  const myUnrankedPlayers = myPlayers.filter(p => {
    if (p.points && p.points > 0) return false
    if (tourGender && p.gender !== tourGender) return false
    if (tour === 'ITF_JUNIOR' && p.age >= 18) return false
    if (tour !== 'ITF_JUNIOR' && p.age < 18) return false
    return true
  })

  // 合并：世界球员 + 我方有积分球员，按积分降序排列
  const myPlayerIds = new Set(myRankedPlayers.map(p => `mine_${p.id}`))

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
      rankChange:  0,   // 俱乐部球员暂无历史数据，显示 —
      _source:     'mine',
      _key:        `mine_${p.id}`,
    })),
  ]
  .sort((a, b) => (b.points || 0) - (a.points || 0))
  .slice(0, 100)
  .map((p, idx) => ({ ...p, ranking: idx + 1 }))

  // 标记我方球员在合并后列表中的位置
  const isMineInTop100 = (p) => p._source === 'mine'

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>世界排名</h1>
      </header>

      <div className={styles.inner}>

        {/* 巡回赛 Tab */}
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

        {/* 说明条 */}
        <div className={styles.infoBanner}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>
            显示前100名 · 排名变化为近一个月数据 ·
            <span style={{ color: 'var(--forest)', fontWeight: 600 }}> 绿色高亮</span>
            {' '}为本俱乐部球员
          </span>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className={styles.loadingWrap}>
            <i className="ti ti-loader-2" aria-hidden="true" />
            <span>加载排名数据中…</span>
          </div>
        )}

        {/* 错误 */}
        {error && !loading && (
          <div className={styles.errorWrap}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <span>{error}</span>
            <button className={styles.retryBtn} onClick={() => fetchRankings(tour)}>
              重新加载
            </button>
          </div>
        )}

        {/* 排名列表 */}
        {!loading && !error && merged.length > 0 && (
          <div className={styles.listCard}>
            {/* 表头 */}
            <div className={styles.listHeader}>
              <span>排名</span>
              <span>球员</span>
              <span className={styles.colNat}>国籍</span>
              <span style={{ textAlign: 'right' }}>积分</span>
              <span style={{ textAlign: 'center' }}>年龄</span>
            </div>

            {/* 数据行 */}
            {merged.map((player, idx) => (
              <div key={player._key}>
                {/* 每10名加一条视觉分隔线 */}
                {idx > 0 && idx % 10 === 0 && (
                  <div className={styles.groupDivider} />
                )}
                <RankRow
                  player={player}
                  isMine={isMineInTop100(player)}
                  clubName={clubName}
                />
              </div>
            ))}
          </div>
        )}

        {/* 俱乐部球员未进前100 / 尚无积分的，列表下方单独展示 */}
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
