import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildableTypes,
  FACILITY_LEVELS,
  FACILITY_PRICES,
  MAINTENANCE_RATE,
  LEVEL_TRAIN_EFFECT,
  formatCash,
} from '../data/mockData'
import { useGameCtx } from '../App'
import styles from './FacilitiesPage.module.css'

// ── 工具 ──────────────────────────────────────────────
const LEVEL_COLOR = { 糟糕: styles.lvBad, 普通: styles.lvNormal, 高级: styles.lvGood, 顶级: styles.lvElite }
const CATEGORY_LABEL = { training: '训练设施', service: '服务设施', empty: '空地' }

const SERVICE_FATIGUE_RECOVERY = {
  locker:    { 糟糕: 2, 普通: 4,  高级: 6,  顶级: 8  },
  lounge:    { 糟糕: 2, 普通: 5,  高级: 8,  顶级: 12 },
  physio:    { 糟糕: 0, 普通: 3,  高级: 5,  顶级: 8  },
  dormitory: { 糟糕: 3, 普通: 5,  高级: 8,  顶级: 12 },
}
const SERVICE_TYPES = new Set(['locker', 'lounge', 'physio', 'dormitory', 'cafe', 'restaurant', 'shop'])

function upgradeCost(type, currentLevel) {
  const levels = FACILITY_LEVELS
  const idx = levels.indexOf(currentLevel)
  if (idx >= levels.length - 1) return null
  const nextLevel = levels[idx + 1]
  const prices = FACILITY_PRICES[type] || {}
  return (prices[nextLevel] - prices[currentLevel]) * 10000
}

function annualMaintenance(type, level) {
  const price = (FACILITY_PRICES[type]?.[level] || 0) * 10000
  return Math.round(price * (MAINTENANCE_RATE[type] || 0.1))
}

// ── 级别标签 ──────────────────────────────────────────
function LevelBadge({ level }) {
  if (!level) return null
  return (
    <span className={`${styles.levelBadge} ${LEVEL_COLOR[level] || ''}`}>
      {level}
    </span>
  )
}

// ── 训练效果条 ────────────────────────────────────────
function EffectBar({ level }) {
  if (!level) return null
  const pct = LEVEL_TRAIN_EFFECT[level] || 100
  return (
    <div className={styles.effectRow}>
      <span className={styles.effectLabel}>训练效果</span>
      <div className={styles.effectBarWrap}>
        <div className={styles.effectBarFill} style={{ width: `${pct}%` }} />
      </div>
      <span className={styles.effectVal}>{pct}%</span>
    </div>
  )
}

// ── 设施详情弹窗 ──────────────────────────────────────
function FacilityDetail({ facility, onClose, onUpgrade, onToggleMaintenance }) {
  const navigate = useNavigate()
  const isMax   = facility.level === '顶级'
  const isEmpty = facility.type === 'empty'
  const upCost  = !isEmpty && !isMax ? upgradeCost(facility.type, facility.level) : null
  const maint   = !isEmpty ? annualMaintenance(facility.type, facility.level) : 0
  const nextLevel = !isEmpty && !isMax
    ? FACILITY_LEVELS[FACILITY_LEVELS.indexOf(facility.level) + 1]
    : null

  // 装备店各级别效果说明
  const SHOP_LEVEL_EFFECT = {
    糟糕: { research: '仅可研发普通道具', points: '+3/周', slots: 2, unlock: '普通' },
    普通: { research: '可研发普通/精良道具', points: '+5/周', slots: 3, unlock: '精良' },
    高级: { research: '解锁卓越道具研发，研发时间-20%', points: '+12/周', slots: 4, unlock: '卓越' },
    顶级: { research: '解锁传奇道具研发，研发时间-35%', points: '+20/周', slots: 5, unlock: '传奇' },
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.detailPanel} onClick={e => e.stopPropagation()}>

        <div className={styles.detailHeader}>
          <div className={styles.detailIconWrap}>
            <i className={`ti ${facility.icon}`} aria-hidden="true" />
          </div>
          <div className={styles.detailHeaderInfo}>
            <div className={styles.detailName}>{facility.name}</div>
            <div className={styles.detailCategory}>{CATEGORY_LABEL[facility.category]}</div>
            {facility.level && <LevelBadge level={facility.level} />}
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.detailBody}>

          {/* 主要效果 */}
          <div className={styles.effectCard}>
            <div className={styles.effectCardTitle}>
              <i className="ti ti-bolt" aria-hidden="true" /> 主要效果
            </div>
            <p className={styles.effectDesc}>{facility.mainEffect}</p>
            {facility.level && <EffectBar level={facility.level} facilityType={facility.type} />}
          </div>

          {/* 财务信息 */}
          {!isEmpty && (
            <div className={styles.financeGrid}>
              <div className={styles.financeBox}>
                <span className={styles.financeVal}>
                  ¥{(maint / 10000).toFixed(1)}万
                </span>
                <span className={styles.financeLbl}>年维护费</span>
              </div>
              <div className={styles.financeBox}>
                <span className={`${styles.financeVal} ${facility.maintenancePaid ? styles.paidGreen : styles.paidRed}`}>
                  {facility.maintenancePaid ? '已缴纳' : '未缴纳'}
                </span>
                <span className={styles.financeLbl}>本年状态</span>
              </div>
              {upCost && (
                <div className={styles.financeBox}>
                  <span className={styles.financeVal}>¥{(upCost / 10000).toFixed(0)}万</span>
                  <span className={styles.financeLbl}>升级费用</span>
                </div>
              )}
              {isMax && (
                <div className={styles.financeBox}>
                  <span className={styles.financeVal} style={{ color: '#9a6e0a' }}>顶级</span>
                  <span className={styles.financeLbl}>已满级</span>
                </div>
              )}
            </div>
          )}

          {/* 维护费提示 */}
          {!isEmpty && !facility.maintenancePaid && (
            <div className={styles.warnBox}>
              <i className="ti ti-alert-triangle" aria-hidden="true" />
              <span>未缴维护费：第2年+5%，第3年+10%，第4年设施降级</span>
            </div>
          )}

          {/* 级别对比（升级前后） */}
          {nextLevel && (() => {
            const fatigue = SERVICE_FATIGUE_RECOVERY[facility.type]
            const curVal  = fatigue
              ? `每天 -${fatigue[facility.level] || 0} 疲劳`
              : `${LEVEL_TRAIN_EFFECT[facility.level] || 100}%`
            const nextVal = fatigue
              ? `每天 -${fatigue[nextLevel] || 0} 疲劳`
              : `${LEVEL_TRAIN_EFFECT[nextLevel] || 100}%`
            const curLbl  = fatigue ? '当前疲劳恢复' : '当前训练效果'
            const nextLbl = fatigue ? '升级后疲劳恢复' : '升级后训练效果'
            return (
              <div className={styles.upgradePreview}>
                <div className={styles.upgradePreviewTitle}>升级效果对比</div>
                <div className={styles.compareRow}>
                  <div className={styles.compareCol}>
                    <LevelBadge level={facility.level} />
                    <span className={styles.compareEff}>{curVal}</span>
                    <span className={styles.compareLbl}>{curLbl}</span>
                  </div>
                  <div className={styles.compareArrow}>
                    <i className="ti ti-arrow-right" aria-hidden="true" />
                  </div>
                  <div className={styles.compareCol}>
                    <LevelBadge level={nextLevel} />
                    <span className={`${styles.compareEff} ${styles.compareEffUp}`}>
                      {nextVal}
                    </span>
                    <span className={styles.compareLbl}>{nextLbl}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* 装备店专属：各级别效果说明 */}
          {facility.type === 'shop' && (
            <div className={styles.effectCard} style={{ marginTop: 12 }}>
              <div className={styles.effectCardTitle}>
                <i className="ti ti-flask" aria-hidden="true" /> 装备研发能力
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-mid)', lineHeight: 1.8 }}>
                <div>📦 当前等级（{facility.level}）：{SHOP_LEVEL_EFFECT[facility.level]?.research}</div>
                <div>🔬 研发点数加成：{SHOP_LEVEL_EFFECT[facility.level]?.points}</div>
                <div>📋 同时研发项目：{SHOP_LEVEL_EFFECT[facility.level]?.slots} 个</div>
                {nextLevel && (
                  <div style={{ marginTop: 6, color: 'var(--forest)', fontWeight: 500 }}>
                    ↑ 升级后解锁：{SHOP_LEVEL_EFFECT[nextLevel]?.unlock}级道具研发
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className={styles.actionRow}>
            {/* 装备店专属：进入装备店按钮 */}
            {facility.type === 'shop' && (
              <button
                className={styles.btnUpgrade}
                style={{ background: 'var(--gold)', color: 'var(--ink)' }}
                onClick={() => { onClose(); navigate('/shop') }}
              >
                <i className="ti ti-shopping-bag" aria-hidden="true" /> 进入装备店
              </button>
            )}
            {!isEmpty && !facility.maintenancePaid && (
              <button
                className={styles.btnPay}
                onClick={() => { onToggleMaintenance(facility.id); onClose() }}
              >
                <i className="ti ti-credit-card" aria-hidden="true" /> 缴纳维护费 ¥{(maint/10000).toFixed(1)}万
              </button>
            )}
            {upCost && (
              <button
                className={styles.btnUpgrade}
                onClick={() => { onUpgrade(facility.id); onClose() }}
              >
                <i className="ti ti-arrow-up" aria-hidden="true" />
                升级至{nextLevel} — ¥{(upCost / 10000).toFixed(0)}万
              </button>
            )}
            {isMax && (
              <div className={styles.maxNote}>
                <i className="ti ti-trophy" aria-hidden="true" /> 已达顶级，无法继续升级
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── 空地建设弹窗 ──────────────────────────────────────
function BuildModal({ emptyId, onClose, onBuild }) {
  const [selected, setSelected] = useState(null)
  const [level, setLevel]       = useState('普通')

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.buildPanel} onClick={e => e.stopPropagation()}>

        <div className={styles.buildHeader}>
          <span className={styles.buildTitle}>新建设施</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.buildBody}>

          {/* 设施类型 */}
          <div className={styles.buildField}>
            <label className={styles.buildLabel}>选择设施类型</label>
            <div className={styles.buildGrid}>
              {buildableTypes.map(bt => (
                <button
                  key={bt.type}
                  className={`${styles.buildTypeBtn} ${selected?.type === bt.type ? styles.buildTypeBtnActive : ''}`}
                  onClick={() => setSelected(bt)}
                >
                  <i className={`ti ${bt.icon}`} aria-hidden="true" />
                  <span>{bt.name}</span>
                  <span className={styles.buildTypeDesc}>{bt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 初始级别 */}
          {selected && (
            <div className={styles.buildField}>
              <label className={styles.buildLabel}>初始级别</label>
              <div className={styles.levelRow}>
                {FACILITY_LEVELS.map(lv => {
                  const p = FACILITY_PRICES[selected.type]?.[lv]
                  return (
                    <button
                      key={lv}
                      className={`${styles.levelBtn} ${level === lv ? styles.levelBtnActive : ''}`}
                      onClick={() => setLevel(lv)}
                    >
                      <span>{lv}</span>
                      <span className={styles.levelPrice}>¥{p}万</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 费用说明 */}
          {selected && (
            <div className={styles.costNote}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              <span>
                空地开发费 ¥10万 + {selected.name}（{level}）¥{FACILITY_PRICES[selected.type]?.[level]}万
                = 合计 <strong>¥{((FACILITY_PRICES[selected.type]?.[level] || 0) + 10)}万</strong>
              </span>
            </div>
          )}

        </div>

        <div className={styles.buildFooter}>
          <button className={styles.btnCancel} onClick={onClose}>取消</button>
          <button
            className={styles.btnBuild}
            disabled={!selected}
            onClick={() => {
              if (!selected) return
              onBuild(emptyId, selected, level)
              onClose()
            }}
          >
            <i className="ti ti-hammer" aria-hidden="true" />
            {selected ? `建造 — ¥${(FACILITY_PRICES[selected.type]?.[level] || 0) + 10}万` : '请先选择设施'}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── 设施卡片 ──────────────────────────────────────────
function FacilityCard({ facility, onClick }) {
  const isEmpty = facility.type === 'empty'
  const isUnpaid = !isEmpty && !facility.maintenancePaid

  return (
    <div
      className={`${styles.card} ${isEmpty ? styles.cardEmpty : ''} ${isUnpaid ? styles.cardUnpaid : ''}`}
      onClick={() => onClick(facility)}
    >
      <div className={styles.cardTop}>
        <div className={`${styles.cardIcon} ${isEmpty ? styles.cardIconEmpty : ''}`}>
          <i className={`ti ${facility.icon}`} aria-hidden="true" />
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.cardNameRow}>
            <span className={styles.cardName}>{facility.name}</span>
            {facility.level && <LevelBadge level={facility.level} />}
          </div>
          <div className={styles.cardEffect}>{facility.mainEffect}</div>
          {isUnpaid && (
            <div className={styles.unpaidWarn}>
              <i className="ti ti-alert-triangle" aria-hidden="true" /> 维护费未缴
            </div>
          )}
        </div>
        <i className="ti ti-chevron-right" style={{ color: 'var(--ink-faint)', fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
      </div>

      {/* 训练效果条（非空地、非服务设施） */}
      {facility.level && facility.category === 'training' && (
        <EffectBar level={facility.level} facilityType={facility.type} />
      )}
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function FacilitiesPage() {
  // ✅ 从全局 GameCtx 读取设施数据
  const { state, dispatch } = useGameCtx()
  const facilityList = state.facilities || []

  const [selected, setSelected]       = useState(null)
  const [buildTarget, setBuildTarget] = useState(null)
  const [filterCat, setFilterCat]     = useState('all')

  // 分组
  const grouped = useMemo(() => {
    const cats = ['training', 'service', 'empty']
    const result = {}
    cats.forEach(cat => {
      result[cat] = facilityList.filter(f =>
        f.category === cat &&
        (filterCat === 'all' || filterCat === cat)
      )
    })
    return result
  }, [facilityList, filterCat])

  // 统计
  const stats = useMemo(() => {
    const real = facilityList.filter(f => f.type !== 'empty')
    const unpaid = real.filter(f => !f.maintenancePaid)
    const courts = facilityList.filter(f =>
      ['hard_court','clay_court','grass_court'].includes(f.type)
    )
    const totalMaint = real.reduce((s, f) => s + annualMaintenance(f.type, f.level), 0)
    return { total: real.length, unpaid: unpaid.length, courts: courts.length, totalMaint }
  }, [facilityList])

  // ✅ 升级：UPDATE_FACILITY 改级别 + ADD_TRANSACTION 记账 + DEDUCT_CASH 即时扣款
  function handleUpgrade(id) {
    const facility = facilityList.find(f => f.id === id)
    if (!facility) return
    const idx = FACILITY_LEVELS.indexOf(facility.level)
    if (idx >= FACILITY_LEVELS.length - 1) return
    const newLevel = FACILITY_LEVELS[idx + 1]
    const cost = upgradeCost(facility.type, facility.level)
    dispatch({ type: 'UPDATE_FACILITY', facility: { ...facility, level: newLevel } })
    if (cost) {
      dispatch({
        type: 'ADD_TRANSACTION',
        tx: { id: `tx_${Date.now()}`, category: 'facility', type: 'expense', amount: cost, label: `升级${facility.name}至${newLevel}`, _week: state.gameState?.week ?? 1 },
      })
      dispatch({ type: 'DEDUCT_CASH', amount: cost })
    }
  }

  // ✅ 缴纳维护费：UPDATE_FACILITY 标记已缴 + ADD_TRANSACTION 记账 + DEDUCT_CASH 即时扣款
  function handleToggleMaintenance(id) {
    const facility = facilityList.find(f => f.id === id)
    if (!facility) return
    const maint = annualMaintenance(facility.type, facility.level)
    dispatch({ type: 'UPDATE_FACILITY', facility: { ...facility, maintenancePaid: !facility.maintenancePaid } })
    if (!facility.maintenancePaid && maint > 0) {
      dispatch({
        type: 'ADD_TRANSACTION',
        tx: { id: `tx_${Date.now()}`, category: 'facility', type: 'expense', amount: maint, label: `缴纳${facility.name}年维护费`, _week: state.gameState?.week ?? 1 },
      })
      // ✅ 即时扣款
      dispatch({ type: 'DEDUCT_CASH', amount: maint })
    }
  }

  // ✅ 新建设施：UPDATE_FACILITY 替换空地 + ADD_TRANSACTION 记账 + DEDUCT_CASH 即时扣款
  function handleBuild(emptyId, buildType, level) {
    const buildPrice = ((FACILITY_PRICES[buildType.type]?.[level] || 0) + 10) * 10000
    const newFacility = {
      id: emptyId,
      type: buildType.type,
      category: buildType.category,
      name: buildType.name,
      level,
      mainEffect: buildType.desc,
      icon: buildType.icon,
      maintenancePaid: true,
    }
    dispatch({ type: 'UPDATE_FACILITY', facility: newFacility })
    dispatch({
      type: 'ADD_TRANSACTION',
      tx: { id: `tx_${Date.now()}`, category: 'facility', type: 'expense', amount: buildPrice, label: `建造${buildType.name}（${level}）`, _week: state.gameState?.week ?? 1 },
    })
    // ✅ 即时扣款
    dispatch({ type: 'DEDUCT_CASH', amount: buildPrice })
  }

  const renderSection = (cat) => {
    const list = grouped[cat]
    if (!list || list.length === 0) return null
    return (
      <div key={cat} className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>{CATEGORY_LABEL[cat]}</span>
          <span className={styles.sectionCount}>{list.length}</span>
        </div>
        <div className={styles.cardGrid}>
          {list.map(f => (
            <FacilityCard
              key={f.id}
              facility={f}
              onClick={f.type === 'empty'
                ? () => setBuildTarget(f.id)
                : setSelected
              }
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* 移动端 Header */}
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>俱乐部设施</h1>
      </header>

      <div className={styles.inner}>

        {/* 概览 */}
        <div className={styles.summaryRow}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.total}</span>
            <span className={styles.summaryLabel}>设施总数</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>{stats.courts}</span>
            <span className={styles.summaryLabel}>球场数量</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={`${styles.summaryVal} ${stats.unpaid > 0 ? styles.summaryWarn : ''}`}>
              {stats.unpaid}
            </span>
            <span className={styles.summaryLabel}>维护费未缴</span>
          </div>
          <div className={styles.summaryDiv} />
          <div className={styles.summaryItem}>
            <span className={styles.summaryVal}>¥{(stats.totalMaint / 10000).toFixed(0)}万</span>
            <span className={styles.summaryLabel}>年维护总额</span>
          </div>
        </div>

        {/* 筛选 */}
        <div className={styles.filterRow}>
          {[
            { v: 'all',      l: '全部' },
            { v: 'training', l: '训练设施' },
            { v: 'service',  l: '服务设施' },
            { v: 'empty',    l: '空地' },
          ].map(({ v, l }) => (
            <button
              key={v}
              className={`${styles.filterBtn} ${filterCat === v ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterCat(v)}
            >{l}</button>
          ))}
        </div>

        {/* 维护费提醒 */}
        {stats.unpaid > 0 && (
          <div className={styles.warnBanner}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <span>有 {stats.unpaid} 处设施维护费未缴纳，长期拖欠将导致设施降级</span>
          </div>
        )}

        {/* 设施列表 */}
        {['training', 'service', 'empty'].map(cat =>
          (filterCat === 'all' || filterCat === cat) ? renderSection(cat) : null
        )}

      </div>

      {/* 详情弹窗 */}
      {selected && (
        <FacilityDetail
          facility={selected}
          onClose={() => setSelected(null)}
          onUpgrade={handleUpgrade}
          onToggleMaintenance={handleToggleMaintenance}
        />
      )}

      {/* 建设弹窗 */}
      {buildTarget && (
        <BuildModal
          emptyId={buildTarget}
          onClose={() => setBuildTarget(null)}
          onBuild={handleBuild}
        />
      )}

    </div>
  )
}
