import { useState, useMemo } from 'react'
import { formatCash } from '../data/mockData'
import { useGameCtx } from '../App'
import styles from './FinancePage.module.css'

// ── 工具 ──────────────────────────────────────────────
const CATEGORY_ICON = {
  court_rent:   'ti-calendar',
  group_class:  'ti-users',
  private_cut:  'ti-user-star',
  cafe:         'ti-coffee',
  physio:       'ti-first-aid-kit',
  sponsor:      'ti-star',
  coach_salary: 'ti-user-star',
  staff:        'ti-building',
  insurance:    'ti-shield',
  subsidy:      'ti-heart',
  ad:           'ti-speakerphone',
  prize:        'ti-trophy',
  facility:     'ti-building',
  other:        'ti-dots',
}

function fmt(n) {
  if (Math.abs(n) >= 10000) return `¥${(n / 10000).toFixed(1)}万`
  return `¥${n.toLocaleString()}`
}

// ── 迷你条形图（趋势） ────────────────────────────────
function TrendChart({ data }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]))
  const barH = 60

  return (
    <div className={styles.trendChart}>
      {data.map((d, i) => (
        <div key={i} className={styles.trendCol}>
          <div className={styles.trendBars}>
            <div
              className={styles.trendBarIncome}
              style={{ height: `${(d.income / maxVal) * barH}px` }}
            />
            <div
              className={styles.trendBarExpense}
              style={{ height: `${(d.expense / maxVal) * barH}px` }}
            />
          </div>
          <span className={styles.trendLabel}>{d.week.replace('第', '').replace('周', 'w')}</span>
        </div>
      ))}
    </div>
  )
}

// ── 分类占比条 ────────────────────────────────────────
function BreakdownBar({ items, color }) {
  return (
    <div className={styles.breakdownList}>
      {items.map((item, i) => (
        <div key={i} className={styles.breakdownRow}>
          <span className={styles.breakdownLabel}>{item.category}</span>
          <div className={styles.breakdownBarWrap}>
            <div
              className={styles.breakdownBarFill}
              style={{ width: `${item.pct}%`, background: color }}
            />
          </div>
          <span className={styles.breakdownPct}>{item.pct}%</span>
          <span className={styles.breakdownAmt}>{fmt(item.amount)}</span>
        </div>
      ))}
    </div>
  )
}

// ── 广告投放弹窗 ──────────────────────────────────────
function AdModal({ onClose }) {
  const [level, setLevel] = useState('basic')
  const opts = [
    { k: 'basic',  l: '初级广告', cost: 10000, desc: '本地推广，轻微提升声望和球员关注' },
    { k: 'mid',    l: '中级广告', cost: 50000, desc: '区域推广，明显提升声望，增加赞助商关注' },
    { k: 'high',   l: '高级广告', cost: 100000, desc: '全国推广，大幅提升声望，知名球员可能关注' },
  ]
  const sel = opts.find(o => o.k === level)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.adPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.adHeader}>
          <span className={styles.adTitle}>广告投放</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.adBody}>
          <p className={styles.adNote}>每月可投放一次，提升俱乐部声望和曝光度</p>
          <div className={styles.adOptions}>
            {opts.map(o => (
              <button
                key={o.k}
                className={`${styles.adBtn} ${level === o.k ? styles.adBtnActive : ''}`}
                onClick={() => setLevel(o.k)}
              >
                <div className={styles.adBtnTop}>
                  <span className={styles.adBtnLabel}>{o.l}</span>
                  <span className={styles.adBtnCost}>{fmt(o.cost)}</span>
                </div>
                <span className={styles.adBtnDesc}>{o.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.adFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button className={styles.btnAd} onClick={() => { alert(`投放${sel?.l}，花费${fmt(sel?.cost || 0)}（功能开发中）`); onClose() }}>
            <i className="ti ti-speakerphone" aria-hidden="true" /> 立即投放 {fmt(sel?.cost || 0)}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab]       = useState('week')
  const [showAd, setShowAd] = useState(false)

  // ✅ 从全局 state 读取实时财务数据
  const { state } = useGameCtx()
  const { finance, transactions, gameState, weeklyTrend = [] } = state

  const weekTransactions = transactions || []
  const incomeTotal  = weekTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenseTotal = weekTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netTotal     = incomeTotal - expenseTotal

  // 动态计算收支构成（从本周 transactions 生成）
  const CATEGORY_LABEL = {
    court_rent:   '场地外租', group_class: '团课收费', private_cut: '私教分成',
    cafe: '咖啡馆', physio: '理疗室', sponsor: '赞助收入',
    coach_salary: '教练薪资', staff: '员工成本', insurance: '球员保险',
    subsidy: '赞助补助', ad: '广告投放', prize: '比赛奖金',
    maintenance: '设施维护', other: '其他',
  }
  const incomeBreakdown = useMemo(() => {
    const incTx = weekTransactions.filter(t => t.type === 'income')
    const total = incTx.reduce((s, t) => s + t.amount, 0) || 1
    return incTx.map(t => ({
      category: CATEGORY_LABEL[t.category] || t.label,
      amount: t.amount,
      pct: Math.round(t.amount / total * 100),
    }))
  }, [weekTransactions])

  const expenseBreakdown = useMemo(() => {
    const expTx = weekTransactions.filter(t => t.type === 'expense')
    const total = expTx.reduce((s, t) => s + t.amount, 0) || 1
    return expTx.map(t => ({
      category: CATEGORY_LABEL[t.category] || t.label,
      amount: t.amount,
      pct: Math.round(t.amount / total * 100),
    }))
  }, [weekTransactions])

  return (
    <div className={styles.page}>

      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>财务收支</h1>
      </header>

      <div className={styles.inner}>

        {/* 资金卡 */}
        <div className={styles.cashCard}>
          <div className={styles.cashMain}>
            <span className={styles.cashLabel}>当前资金</span>
            <span className={styles.cashVal}>{formatCash(finance?.cash ?? 0)}</span>
            <span className={styles.cashSub}>{gameState?.loanMonthly > 0 ? `贷款 ¥${gameState.loanMonthly}/月` : '无贷款'}</span>
          </div>
          <div className={styles.cashStats}>
            <div className={styles.cashStatItem}>
              <span className={styles.cashStatVal} style={{ color: '#1a6010' }}>+{fmt(incomeTotal)}</span>
              <span className={styles.cashStatLbl}>本周收入</span>
            </div>
            <div className={styles.cashStatDiv} />
            <div className={styles.cashStatItem}>
              <span className={styles.cashStatVal} style={{ color: '#c0392b' }}>-{fmt(expenseTotal)}</span>
              <span className={styles.cashStatLbl}>本周支出</span>
            </div>
            <div className={styles.cashStatDiv} />
            <div className={styles.cashStatItem}>
              <span className={styles.cashStatVal} style={{ color: netTotal >= 0 ? '#1a6010' : '#c0392b' }}>
                {netTotal >= 0 ? '+' : ''}{fmt(netTotal)}
              </span>
              <span className={styles.cashStatLbl}>本周净额</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className={styles.actionBar}>
          <button className={styles.adBtn2} onClick={() => setShowAd(true)}>
            <i className="ti ti-speakerphone" aria-hidden="true" /> 广告投放
          </button>
          <button className={styles.loanBtn} onClick={() => alert('贷款功能开发中…')}>
            <i className="ti ti-credit-card" aria-hidden="true" /> 申请贷款
          </button>
        </div>

        {/* Tab */}
        <div className={styles.tabs}>
          {[
            { k: 'week',      l: '本周明细' },
            { k: 'breakdown', l: '收支构成' },
            { k: 'trend',     l: '走势图表' },
          ].map(({ k, l }) => (
            <button
              key={k}
              className={`${styles.tab} ${tab === k ? styles.tabActive : ''}`}
              onClick={() => setTab(k)}
            >{l}</button>
          ))}
        </div>

        {/* ── 本周明细 ── */}
        {tab === 'week' && (
          <div className={styles.transSection}>

            <div className={styles.transSectionHeader}>
              <span className={styles.transSectionTitle}>收入</span>
              <span className={styles.transSectionTotal} style={{ color: '#1a6010' }}>+{fmt(incomeTotal)}</span>
            </div>
            {weekTransactions.filter(t => t.type === 'income').map(t => (
              <div key={t.id} className={styles.transRow}>
                <div className={styles.transIcon} style={{ background: 'rgba(26,96,16,0.08)', color: '#1a6010' }}>
                  <i className={`ti ${CATEGORY_ICON[t.category] || 'ti-dots'}`} aria-hidden="true" />
                </div>
                <span className={styles.transLabel}>{t.label}</span>
                <span className={styles.transAmt} style={{ color: '#1a6010' }}>+{fmt(t.amount)}</span>
              </div>
            ))}

            <div className={styles.transSectionHeader} style={{ marginTop: 16 }}>
              <span className={styles.transSectionTitle}>支出</span>
              <span className={styles.transSectionTotal} style={{ color: '#c0392b' }}>-{fmt(expenseTotal)}</span>
            </div>
            {weekTransactions.filter(t => t.type === 'expense').map(t => (
              <div key={t.id} className={styles.transRow}>
                <div className={styles.transIcon} style={{ background: 'rgba(192,57,43,0.08)', color: '#c0392b' }}>
                  <i className={`ti ${CATEGORY_ICON[t.category] || 'ti-dots'}`} aria-hidden="true" />
                </div>
                <span className={styles.transLabel}>{t.label}</span>
                <span className={styles.transAmt} style={{ color: '#c0392b' }}>-{fmt(t.amount)}</span>
              </div>
            ))}

            {/* 净额行 */}
            <div className={styles.netRow}>
              <span className={styles.netLabel}>本周净额</span>
              <span className={styles.netVal} style={{ color: netTotal >= 0 ? '#1a6010' : '#c0392b' }}>
                {netTotal >= 0 ? '+' : ''}{fmt(netTotal)}
              </span>
            </div>
          </div>
        )}

        {/* ── 收支构成 ── */}
        {tab === 'breakdown' && (
          <div className={styles.breakdownSection}>
            <div className={styles.breakdownTitle}>
              <i className="ti ti-trending-up" aria-hidden="true" /> 收入构成
            </div>
            <BreakdownBar items={incomeBreakdown} color="var(--forest)" />

            <div className={styles.breakdownTitle} style={{ marginTop: 20 }}>
              <i className="ti ti-trending-down" aria-hidden="true" /> 支出构成
            </div>
            <BreakdownBar items={expenseBreakdown} color="#c0392b" />
          </div>
        )}

        {/* ── 走势图 ── */}
        {tab === 'trend' && (
          <div className={styles.trendSection}>
            {weeklyTrend.length === 0 ? (
              <div style={{textAlign:'center',color:'var(--ink-muted)',padding:'32px 0',fontSize:14}}>
                <i className="ti ti-chart-bar" style={{fontSize:32,display:'block',marginBottom:8}} />
                走势数据将在推进几周后显示
              </div>
            ) : (
              <>
                <div className={styles.trendLegend}>
                  <span className={styles.legendIncome}><span />收入</span>
                  <span className={styles.legendExpense}><span />支出</span>
                </div>
                <TrendChart data={weeklyTrend} />
                <div className={styles.trendStats}>
                  {weeklyTrend.map((d, i) => (
                    <div key={i} className={styles.trendStatRow}>
                      <span className={styles.trendStatWeek}>{d.week}</span>
                      <span style={{ color: '#1a6010' }}>+{fmt(d.income)}</span>
                      <span style={{ color: '#c0392b' }}>-{fmt(d.expense)}</span>
                      <span style={{ color: d.income - d.expense >= 0 ? '#1a6010' : '#c0392b', fontWeight: 500 }}>
                        {d.income - d.expense >= 0 ? '+' : ''}{fmt(d.income - d.expense)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {showAd && <AdModal onClose={() => setShowAd(false)} />}
    </div>
  )
}
