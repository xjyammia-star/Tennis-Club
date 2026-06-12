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

// 贷款配置
const LOAN_OPTIONS = [
  { amount: 200000,  label: '小额贷款', annualRate: 0.12, minPrestige: 0    },
  { amount: 500000,  label: '中额贷款', annualRate: 0.15, minPrestige: 1000 },
  { amount: 1000000, label: '大额贷款', annualRate: 0.20, minPrestige: 3000 },
]
const TERM_OPTIONS = [
  { weeks: 13, label: '3个月（13周）' },
  { weeks: 26, label: '6个月（26周）' },
  { weeks: 52, label: '1年（52周）'   },
]

// 计算等额周还款额预览
function calcWeeklyPayment(amount, annualRate, termWeeks) {
  const r = annualRate / 52
  const factor = Math.pow(1 + r, termWeeks)
  return Math.round(amount * r * factor / (factor - 1))
}

// ── 贷款弹窗 ──────────────────────────────────────────
function LoanModal({ onClose, loan, prestige, cash, currentWeek, dispatch }) {
  const [selAmount, setSelAmount] = useState(0)    // LOAN_OPTIONS index
  const [selTerm,   setSelTerm]   = useState(1)    // TERM_OPTIONS index
  const [confirming, setConfirming] = useState(false)

  const opt  = LOAN_OPTIONS[selAmount]
  const term = TERM_OPTIONS[selTerm]
  const weeklyPay = calcWeeklyPayment(opt.amount, opt.annualRate, term.weeks)
  const totalPay  = weeklyPay * term.weeks
  const totalInterest = totalPay - opt.amount
  const unlocked = opt.minPrestige <= prestige

  // 贷款状态展示
  if (loan) {
    const isPending = loan.status === 'pending'
    const isActive  = loan.status === 'active'
    const weeksLeft = isActive ? loan.termWeeks - (loan.paidWeeks || 0) : null
    const remaining = loan.remainingPrincipal || 0

    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.loanPanel} onClick={e => e.stopPropagation()}>
          <div className={styles.loanHeader}>
            <span className={styles.loanTitle}>贷款管理</span>
            <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
          </div>
          <div className={styles.loanBody}>
            {isPending && (
              <div className={styles.loanStatusCard} style={{ borderColor: '#c9a84c' }}>
                <div className={styles.loanStatusIcon} style={{ color: '#c9a84c' }}>
                  <i className="ti ti-clock" />
                </div>
                <div>
                  <div className={styles.loanStatusTitle}>贷款审批中</div>
                  <div className={styles.loanStatusDesc}>
                    申请金额：{fmt(loan.amount)}<br />
                    预计第 {loan.approveWeek} 周公布结果（还需 {loan.approveWeek - currentWeek} 周）
                  </div>
                </div>
              </div>
            )}
            {isActive && (
              <>
                <div className={styles.loanStatusCard} style={{ borderColor: '#2a7a3a' }}>
                  <div className={styles.loanStatusIcon} style={{ color: '#2a7a3a' }}>
                    <i className="ti ti-credit-card" />
                  </div>
                  <div>
                    <div className={styles.loanStatusTitle}>还款中</div>
                    <div className={styles.loanStatusDesc}>
                      剩余本金：{fmt(remaining)}<br />
                      每周还款：{fmt(loan.weeklyPayment)}<br />
                      剩余期数：{weeksLeft} 周（第 {loan.endWeek} 周还清）
                    </div>
                  </div>
                </div>
                <div className={styles.loanProgressWrap}>
                  <div className={styles.loanProgressBar}>
                    <div
                      className={styles.loanProgressFill}
                      style={{ width: `${Math.round((loan.paidWeeks / loan.termWeeks) * 100)}%` }}
                    />
                  </div>
                  <span className={styles.loanProgressLabel}>
                    已还 {loan.paidWeeks} / {loan.termWeeks} 周
                  </span>
                </div>
                <div className={styles.loanEarlyRow}>
                  <div className={styles.loanEarlyInfo}>
                    <span className={styles.loanEarlyLabel}>提前还清</span>
                    <span className={styles.loanEarlyAmt}>{fmt(remaining)}</span>
                    <span className={styles.loanEarlyNote}>无违约金，立即结清</span>
                  </div>
                  <button
                    className={styles.btnEarlyRepay}
                    disabled={cash < remaining}
                    onClick={() => {
                      if (window.confirm(`确定提前还清贷款 ${fmt(remaining)}？`)) {
                        dispatch({ type: 'EARLY_REPAY_LOAN' })
                        onClose()
                      }
                    }}
                  >
                    立即还清
                  </button>
                </div>
              </>
            )}
          </div>
          <div className={styles.loanFooter}>
            <button className={styles.btnCancel} onClick={onClose}>关闭</button>
          </div>
        </div>
      </div>
    )
  }

  // 无贷款：申请界面
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.loanPanel} onClick={e => e.stopPropagation()}>
        <div className={styles.loanHeader}>
          <span className={styles.loanTitle}>申请贷款</span>
          <button className={styles.closeBtn} onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div className={styles.loanBody}>
          <p className={styles.loanNote}>
            提交后2周内公布审批结果（通过率90%）。审批通过后每周自动还款，无需手动操作。
          </p>

          {/* 贷款金额选择 */}
          <div className={styles.loanSectionTitle}>选择贷款金额</div>
          <div className={styles.loanOptions}>
            {LOAN_OPTIONS.map((o, i) => {
              const locked = o.minPrestige > prestige
              return (
                <button
                  key={i}
                  className={`${styles.loanOptBtn} ${selAmount === i ? styles.loanOptActive : ''} ${locked ? styles.loanOptLocked : ''}`}
                  onClick={() => !locked && setSelAmount(i)}
                  disabled={locked}
                >
                  <div className={styles.loanOptTop}>
                    <span className={styles.loanOptLabel}>{o.label}</span>
                    <span className={styles.loanOptAmt}>{fmt(o.amount)}</span>
                  </div>
                  <div className={styles.loanOptRate}>年利率 {(o.annualRate * 100).toFixed(0)}%</div>
                  {locked && (
                    <div className={styles.loanOptLockMsg}>
                      <i className="ti ti-lock" /> 需声望 ≥ {o.minPrestige.toLocaleString()}
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* 还款期选择 */}
          <div className={styles.loanSectionTitle} style={{ marginTop: 14 }}>选择还款期限</div>
          <div className={styles.termOptions}>
            {TERM_OPTIONS.map((t, i) => (
              <button
                key={i}
                className={`${styles.termBtn} ${selTerm === i ? styles.termBtnActive : ''}`}
                onClick={() => setSelTerm(i)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 还款预览 */}
          <div className={styles.loanPreview}>
            <div className={styles.loanPreviewRow}>
              <span>每周还款</span>
              <strong>{fmt(weeklyPay)}</strong>
            </div>
            <div className={styles.loanPreviewRow}>
              <span>还款总额</span>
              <strong>{fmt(totalPay)}</strong>
            </div>
            <div className={styles.loanPreviewRow}>
              <span>利息合计</span>
              <strong style={{ color: '#c0392b' }}>{fmt(totalInterest)}</strong>
            </div>
          </div>
        </div>

        <div className={styles.loanFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          {!confirming ? (
            <button
              className={styles.btnLoanApply}
              disabled={!unlocked}
              onClick={() => setConfirming(true)}
            >
              <i className="ti ti-send" /> 提交申请
            </button>
          ) : (
            <button
              className={styles.btnLoanConfirm}
              onClick={() => {
                dispatch({
                  type: 'APPLY_LOAN',
                  loanApp: {
                    amount:      opt.amount,
                    annualRate:  opt.annualRate,
                    termWeeks:   term.weeks,
                    applyWeek:   currentWeek,
                  },
                })
                onClose()
              }}
            >
              <i className="ti ti-check" /> 确认提交
            </button>
          )}
        </div>
      </div>
    </div>
  )
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
  const [tab, setTab]         = useState('week')
  const [showAd, setShowAd]   = useState(false)
  const [showLoan, setShowLoan] = useState(false)

  const { state, dispatch } = useGameCtx()
  const { finance, transactions, gameState, weeklyTrend = [], loan } = state
  const prestige   = gameState?.prestige  || 0
  const currentWeek = gameState?.week     || 1

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
            <span className={styles.cashSub}>
              {loan?.status === 'active'
                ? `还款中 · 剩余${fmt(loan.remainingPrincipal || 0)} · 每周¥${(loan.weeklyPayment || 0).toLocaleString()}`
                : loan?.status === 'pending'
                ? `贷款审批中（第${loan.approveWeek}周出结果）`
                : '无贷款'}
            </span>
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
          <button className={styles.loanBtn} onClick={() => setShowLoan(true)}>
            <i className="ti ti-credit-card" aria-hidden="true" />
            {loan?.status === 'active' ? '还款管理' : loan?.status === 'pending' ? '审批中…' : '申请贷款'}
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
      {showLoan && (
        <LoanModal
          onClose={() => setShowLoan(false)}
          loan={loan}
          prestige={prestige}
          cash={finance?.cash || 0}
          currentWeek={currentWeek}
          dispatch={dispatch}
        />
      )}
    </div>
  )
}
