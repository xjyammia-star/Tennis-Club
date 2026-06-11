// ══════════════════════════════════════════════════════
// 装备店页面
// 功能：研发系统 / 货架购买 / 仓库使用
// ══════════════════════════════════════════════════════

import { useState } from 'react'
import { useGameCtx } from '../App'
import { ITEM_DEFS, ITEM_CATEGORIES, getItemsByCategory } from '../data/itemDefs'
import styles from './ShopPage.module.css'

// ── 装备店等级对研发系统的限制 ───────────────────────
const SHOP_LEVEL_CONFIG = {
  糟糕: { maxRarity: 'common',    maxSlots: 2, researchSpeedMult: 1.0, extraPoints: 3  },
  普通: { maxRarity: 'rare',      maxSlots: 3, researchSpeedMult: 1.0, extraPoints: 5  },
  高级: { maxRarity: 'epic',      maxSlots: 4, researchSpeedMult: 0.8, extraPoints: 12 },
  顶级: { maxRarity: 'legendary', maxSlots: 5, researchSpeedMult: 0.65, extraPoints: 20 },
}
const RARITY_ORDER_IDX = { common: 0, rare: 1, epic: 2, legendary: 3 }
const RESEARCH_POINT_COST = {
  common:    100,
  rare:      250,
  epic:      500,
  legendary: 1000,
}
const RARITY_CFG = {
  legendary: { label: '传奇', badgeClass: 'legendary', dotClass: 'dotLegendary' },
  epic:      { label: '卓越', badgeClass: 'epic',      dotClass: 'dotEpic'      },
  rare:      { label: '精良', badgeClass: 'rare',      dotClass: 'dotRare'      },
  common:    { label: '普通', badgeClass: 'common',    dotClass: 'dotCommon'    },
}

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common']

const CATEGORY_TABS = [
  { key: 'recovery',  label: '恢复系列', icon: 'ti-heart-rate-monitor' },
  { key: 'combat',    label: '竞技系列', icon: 'ti-trophy'              },
  { key: 'growth',    label: '成长系列', icon: 'ti-trending-up'         },
  { key: 'facility',  label: '设施系列', icon: 'ti-building'            },
]

// ── 生成唯一实例 ID ───────────────────────────────────
function genInstanceId() {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── 效果文字简化显示 ──────────────────────────────────
function effectSummary(effect, duration) {
  const parts = []
  if (effect.fatigue)               parts.push(`疲劳 ${effect.fatigue > 0 ? '+' : ''}${effect.fatigue}`)
  if (effect.fatigueRecoveryPerDay) parts.push(`每天恢复 +${effect.fatigueRecoveryPerDay}`)
  if (effect.fatigueGainMult)       parts.push(`疲劳增量 ×${effect.fatigueGainMult}`)
  if (effect.expMult)               parts.push(`经验 ×${effect.expMult}`)
  if (effect.skillChanceMult)       parts.push(`领悟率 ×${effect.skillChanceMult}`)
  if (effect.extraSkillCheck)       parts.push('额外领悟检测 ×1')
  if (effect.instantSkill)          parts.push('立即领悟 1 个技能')
  if (effect.seasonExpMult)         parts.push(`本赛季经验 ×${effect.seasonExpMult}`)
  if (effect.attrBonus)             parts.push(`弱势属性 +${effect.attrBonus}（永久）`)
  if (effect.combatPower)           parts.push(`比赛战力 +${effect.combatPower}`)
  if (effect.winProbBonus)          parts.push(`胜率 +${Math.round(effect.winProbBonus * 100)}%`)
  if (effect.tacticsBonus)          parts.push(`战术属性 +${effect.tacticsBonus}`)
  if (effect.preventInjury)         parts.push('防止轻伤')
  if (effect.loyalty)               parts.push(`忠诚度 ${effect.loyalty > 0 ? '+' : ''}${effect.loyalty}`)
  if (effect.prestige)              parts.push(`声望 +${effect.prestige}（赢球后）`)
  if (effect.healAccel && effect.healAccel < 100) parts.push(`伤病恢复 ×${effect.healAccel}`)
  if (effect.healAccel >= 100)      parts.push('立即消除轻伤')
  if (effect.maintenanceMult)       parts.push(`维护费 ×${effect.maintenanceMult}`)
  if (effect.facilityRepair)        parts.push('修复一处糟糕设施')
  if (effect.serviceRecoveryBonus)  parts.push(`服务恢复加成 ×${effect.serviceRecoveryBonus}`)
  if (effect.courtEffectBonus)      parts.push(`训练效果 +${effect.courtEffectBonus}%`)
  if (effect.operationCostMult)     parts.push(`运营成本 ×${effect.operationCostMult}`)
  if (effect.balanceBoost)          parts.push('弱势属性经验 +5%')
  if (effect.youthOnly)             parts.push('仅限 18岁以下')

  let text = parts.join('，')
  if (typeof duration === 'number' && duration > 0) text += `（持续 ${duration} 周）`
  if (duration === 'event') text += '（整个赛事有效）'
  return text
}

// ══════════════════════════════════════════════════════
// 主页面
// ══════════════════════════════════════════════════════
export default function ShopPage() {
  const { state, dispatch } = useGameCtx()
  const { research, inventory, activeFacilityItems, players, finance, gameState } = state

  // ── 装备店设施检查 ──────────────────────────────────
  const shopFacility = (state.facilities || []).find(f => f.type === 'shop')
  const shopLevel    = shopFacility?.level || null
  const shopConfig   = shopLevel ? SHOP_LEVEL_CONFIG[shopLevel] : null

  const [activeTab,   setActiveTab]   = useState('recovery')
  const [activeView,  setActiveView]  = useState('shop')   // 'shop' | 'research' | 'inventory'
  const [useModal,    setUseModal]    = useState(null)      // { invItem, itemDef }
  const [selectedPid, setSelectedPid] = useState(null)
  const [notification, setNotification] = useState(null)   // { text, ok }

  const currentResearch     = research || { points: 0, pointsPerWeek: 3, activeProjects: [], completedItems: [] }
  const completedItems      = currentResearch.completedItems || []
  const activeProjects      = currentResearch.activeProjects || []
  const currentInventory    = inventory || []
  const cash                = finance?.cash ?? 0
  const currentWeek         = gameState?.week ?? 1

  // ── 通知条 ──────────────────────────────────────────
  function showNotification(text, ok = true) {
    setNotification({ text, ok })
    setTimeout(() => setNotification(null), 2500)
  }

  // ── 开始研发 ─────────────────────────────────────────
  function handleStartResearch(itemDef) {
    if (activeProjects.length >= 3) {
      showNotification('同时最多只能进行 3 个研发项目', false)
      return
    }
    if (activeProjects.find(p => p.itemId === itemDef.id)) {
      showNotification('该项目已在研发中', false)
      return
    }
    const cost = RESEARCH_POINT_COST[itemDef.rarity] || 100
    if (currentResearch.points < cost) {
      showNotification(`研发点数不足（需要 ${cost} 点，当前 ${currentResearch.points} 点）`, false)
      return
    }
    dispatch({
      type: 'START_RESEARCH',
      project: { itemId: itemDef.id, requiredWeeks: itemDef.researchWeeks, pointCost: cost },
    })
    showNotification(`已开始研发「${itemDef.name}」，消耗 ${cost} 点，预计 ${itemDef.researchWeeks} 周完成`)
  }

  // ── 购买道具 ─────────────────────────────────────────
  function handleBuy(itemDef) {
    if (cash < itemDef.price) {
      showNotification('资金不足，无法购买', false)
      return
    }
    // 检查仓库上限
    const sameItemCount = currentInventory.filter(i => i.itemId === itemDef.id).length
    if (sameItemCount >= (itemDef.maxStock || 5)) {
      showNotification(`「${itemDef.name}」仓库已满（上限 ${itemDef.maxStock} 件）`, false)
      return
    }
    dispatch({
      type: 'BUY_ITEM',
      itemId:     itemDef.id,
      price:      itemDef.price,
      instanceId: genInstanceId(),
    })
    showNotification(`购买成功！「${itemDef.name}」已加入仓库`)
  }

  // ── 打开使用弹窗 ──────────────────────────────────────
  function handleOpenUseModal(invItem) {
    const itemDef = ITEM_DEFS.find(d => d.id === invItem.itemId)
    if (!itemDef) return
    setUseModal({ invItem, itemDef })
    setSelectedPid(itemDef.category === 'facility' ? null : null)
  }

  // ── 确认使用 ─────────────────────────────────────────
  function handleConfirmUse() {
    if (!useModal) return
    const { invItem, itemDef } = useModal
    const isFacility = itemDef.category === 'facility'

    if (!isFacility && !selectedPid) {
      showNotification('请先选择目标球员', false)
      return
    }

    dispatch({
      type:       'USE_ITEM',
      instanceId: invItem.instanceId,
      playerId:   isFacility ? null : selectedPid,
      itemDef,
    })
    setUseModal(null)
    setSelectedPid(null)
    showNotification(`「${itemDef.name}」使用成功！`)
  }

  // ── 当前 tab 的道具列表（按稀有度排序）────────────────
  const tabItems = getItemsByCategory(activeTab)
    .slice()
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity))

  // 仓库里当前 tab 的道具
  const inventoryOfTab = currentInventory.filter(inv => {
    const def = ITEM_DEFS.find(d => d.id === inv.itemId)
    return def?.category === activeTab
  })

  // ── 无装备店时显示引导页 ────────────────────────────
  if (!shopFacility) {
    return (
      <div className={styles.page}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 20px', textAlign: 'center',
        }}>
          <i className="ti ti-shopping-bag" style={{
            fontSize: 48, color: 'var(--cream-dark)', marginBottom: 16,
          }} />
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 8 }}>
            装备店尚未建造
          </div>
          <div style={{ fontSize: 14, color: 'var(--ink-muted)', lineHeight: 1.7, maxWidth: 280 }}>
            前往「俱乐部设施」页面，在空地上建造装备店，即可解锁道具研发与购买功能。
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>

      {/* 通知条 */}
      {notification && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: notification.ok ? 'var(--forest)' : '#c0392b',
          color: 'var(--gold-pale)', padding: '8px 18px', borderRadius: 20,
          fontSize: 13, zIndex: 300, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {notification.text}
        </div>
      )}

      {/* 标题 */}
      <div className={styles.header}>
        <div className={styles.title}>
          <i className="ti ti-shopping-bag" />
          装备店
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['shop','research','inventory'].map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              style={{
                padding: '5px 12px', borderRadius: 14, fontSize: 12, cursor: 'pointer',
                border: activeView === v ? 'none' : '1px solid var(--cream-dark)',
                background: activeView === v ? 'var(--forest)' : 'var(--white)',
                color: activeView === v ? 'var(--gold-pale)' : 'var(--ink-muted)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              { v === 'shop' ? '货架' : v === 'research' ? '研发' : `仓库(${currentInventory.length})` }
            </button>
          ))}
        </div>
      </div>

      {/* 研发点数状态栏 */}
      <div className={styles.researchBar}>
        <div className={styles.researchPointsBlock}>
          <i className="ti ti-flask" />
          <div>
            <div className={styles.researchLabel}>研发点数</div>
            <div className={styles.researchPoints}>{currentResearch.points} / 2000</div>
            <div className={styles.researchRate}>每周约 +{(() => {
              const COACH_PTS = { assistant: 0, normal: 5, senior: 12, elite: 20 }
              const FAC_PTS   = { 普通: 3, 高级: 8, 顶级: 15 }
              let est = 10
              ;(state.coaches || []).forEach(c => { est += COACH_PTS[c.level] || 0 })
              ;(state.facilities || []).forEach(f => { if (f.type !== 'empty' && f.level) est += FAC_PTS[f.level] || 0 })
              est += Math.floor((gameState?.prestige || 0) / 1000) * 5
              return est
            })()} 点（上限2000）</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 12, color: 'var(--gold-pale)', opacity: 0.7, marginBottom: 4 }}>
            装备店等级
          </div>
          <div style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 600 }}>
            {shopLevel}装备店
          </div>
          <div style={{ fontSize: 11, color: 'var(--gold-pale)', opacity: 0.6, marginTop: 2 }}>
            最高研发：{shopConfig ? { common:'普通', rare:'精良', epic:'卓越', legendary:'传奇' }[shopConfig.maxRarity] : '—'}
            · 并行{shopConfig?.maxSlots ?? 3}项
          </div>
        </div>
          {activeProjects.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--gold-pale)', opacity: 0.5 }}>暂无</div>
            : activeProjects.map(proj => {
              const def = ITEM_DEFS.find(d => d.id === proj.itemId)
              return (
                <div key={proj.itemId} style={{ fontSize: 12, color: 'var(--gold-pale)', marginBottom: 2 }}>
                  {def?.name ?? proj.itemId} — {proj.progressWeeks}/{proj.requiredWeeks} 周
                </div>
              )
            })
          }
        </div>
        <div style={{ fontSize: 12, color: 'var(--gold-pale)', opacity: 0.7 }}>
          已解锁 {completedItems.length} 种
        </div>
      </div>

      {/* 分类 Tab */}
      <div className={styles.tabs}>
        {CATEGORY_TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <i className={t.icon} style={{ marginRight: 4 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 货架视图 ── */}
      {activeView === 'shop' && (
        <div className={styles.shopPanel}>
          <div className={styles.sectionTitle}>
            <i className="ti ti-tag" />
            {CATEGORY_TABS.find(t => t.key === activeTab)?.label} — 研发完成后可购买
          </div>
          {tabItems.map(itemDef => {
            const rCfg       = RARITY_CFG[itemDef.rarity]
            const isUnlocked = completedItems.includes(itemDef.id)
            const inProgress = activeProjects.find(p => p.itemId === itemDef.id)
            const stockCount = currentInventory.filter(i => i.itemId === itemDef.id).length
            const atMax      = stockCount >= (itemDef.maxStock || 5)
            const canAfford  = cash >= itemDef.price

            return (
              <div key={itemDef.id} className={styles.shopItemCard}
                style={{ opacity: isUnlocked ? 1 : 0.6 }}
              >
                <div className={styles.shopItemHeader}>
                  <span className={`${styles.rarityBadge} ${styles[rCfg.badgeClass]}`}>
                    {rCfg.label}
                  </span>
                  <span className={styles.shopItemName}>{itemDef.name}</span>
                  <span className={styles.shopItemPrice}>¥{itemDef.price.toLocaleString()}</span>
                </div>
                <div className={styles.shopItemEffect}>
                  {effectSummary(itemDef.effect, itemDef.duration)}
                </div>
                <div className={styles.shopItemFooter}>
                  <div className={styles.shopItemMeta}>
                    <span>仓库 {stockCount}/{itemDef.maxStock}</span>
                    {itemDef.cooldownWeeks > 0 && <span>冷却 {itemDef.cooldownWeeks} 周</span>}
                    {itemDef.combatOnly && <span>🎾 赛事专用</span>}
                  </div>
                  {isUnlocked ? (
                    <button
                      className={styles.buyBtn}
                      disabled={atMax || !canAfford}
                      onClick={() => handleBuy(itemDef)}
                    >
                      {atMax ? '库存已满' : !canAfford ? '资金不足' : '购买'}
                    </button>
                  ) : inProgress ? (
                    <span className={styles.inProgressTag}>
                      研发中 {inProgress.progressWeeks}/{inProgress.requiredWeeks}周
                    </span>
                  ) : (
                    <span className={styles.lockedMsg}>
                      <i className="ti ti-lock" style={{ marginRight: 4 }} />
                      需先研发（{itemDef.researchWeeks} 周）
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 研发视图 ── */}
      {activeView === 'research' && (
        <div className={styles.researchPanel}>

          {/* 进行中的项目 */}
          {activeProjects.length > 0 && (
            <>
              <div className={styles.sectionTitle}>
                <i className="ti ti-loader" />
                研发进行中（{activeProjects.length}/3）
              </div>
              {activeProjects.map(proj => {
                const def = ITEM_DEFS.find(d => d.id === proj.itemId)
                const pct = Math.round((proj.progressWeeks / proj.requiredWeeks) * 100)
                return (
                  <div key={proj.itemId} className={styles.researchProjectCard}>
                    <div className={styles.projectHeader}>
                      <span className={styles.projectName}>{def?.name ?? proj.itemId}</span>
                      <span className={styles.projectWeeks}>
                        {proj.progressWeeks}/{proj.requiredWeeks} 周 ({pct}%)
                      </span>
                    </div>
                    <div className={styles.progressBarBg}>
                      <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={styles.projectMeta}>
                      {def && effectSummary(def.effect, def.duration)}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* 可研发的道具列表 */}
          <div className={styles.sectionTitle}>
            <i className="ti ti-flask" />
            {CATEGORY_TABS.find(t => t.key === activeTab)?.label} — 选择研发项目
          </div>
          <div className={styles.researchableList}>
            {tabItems.map(itemDef => {
              const rCfg         = RARITY_CFG[itemDef.rarity]
              const isDone       = completedItems.includes(itemDef.id)
              const inProgress   = activeProjects.find(p => p.itemId === itemDef.id)
              const maxSlots     = shopConfig?.maxSlots ?? 3
              const isFull       = activeProjects.length >= maxSlots
              const cost         = RESEARCH_POINT_COST[itemDef.rarity] || 100
              const canAffordPts = currentResearch.points >= cost
              // 装备店等级限制：稀有度超出当前装备店上限则锁定
              const maxRarity    = shopConfig?.maxRarity ?? 'rare'
              const isRarityLocked = RARITY_ORDER_IDX[itemDef.rarity] > RARITY_ORDER_IDX[maxRarity]
              const disabled     = isDone || !!inProgress || isFull || !canAffordPts || isRarityLocked

              return (
                <div
                  key={itemDef.id}
                  className={`${styles.researchableItem} ${disabled ? styles.disabled : ''}`}
                >
                  <div className={`${styles.rarityDot} ${styles[rCfg.dotClass]}`} />
                  <div className={styles.itemBasicInfo}>
                    <div className={styles.itemName}>{itemDef.name}</div>
                    <div className={styles.itemWeeks}>
                      {isDone ? '已完成' : `${itemDef.researchWeeks} 周`} · {rCfg.label}
                      {!isDone && !inProgress && !isRarityLocked && (
                        <span style={{
                          marginLeft: 6,
                          color: canAffordPts ? 'var(--forest)' : 'var(--red-soft)',
                          fontWeight: 500,
                        }}>
                          · {cost} 点
                        </span>
                      )}
                      {isRarityLocked && (
                        <span style={{ marginLeft: 6, color: 'var(--ink-muted)' }}>
                          · 需升级装备店
                        </span>
                      )}
                    </div>
                  </div>
                  {isDone ? (
                    <span className={styles.doneTag}>✓ 已解锁</span>
                  ) : isRarityLocked ? (
                    <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                      <i className="ti ti-lock" style={{ marginRight: 3 }} />
                      {rCfg.label}锁定
                    </span>
                  ) : inProgress ? (
                    <span className={styles.inProgressTag}>研发中</span>
                  ) : (
                    <button
                      className={styles.startBtn}
                      disabled={isFull || !canAffordPts}
                      onClick={() => handleStartResearch(itemDef)}
                    >
                      {isFull ? '队列已满' : !canAffordPts ? '点数不足' : '开始研发'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 仓库视图 ── */}
      {activeView === 'inventory' && (
        <div className={styles.inventorySection}>
          <div className={styles.sectionTitle}>
            <i className="ti ti-package" />
            {CATEGORY_TABS.find(t => t.key === activeTab)?.label} 仓库
            （共 {currentInventory.length} 件）
          </div>
          {inventoryOfTab.length === 0 ? (
            <div className={styles.emptyInventory}>
              <i className="ti ti-box-off" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: 'var(--cream-dark)' }} />
              该系列仓库暂无道具
            </div>
          ) : (
            <div className={styles.inventoryGrid}>
              {inventoryOfTab.map(invItem => {
                const def  = ITEM_DEFS.find(d => d.id === invItem.itemId)
                if (!def) return null
                const rCfg = RARITY_CFG[def.rarity]
                return (
                  <div key={invItem.instanceId} className={styles.inventoryCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <div className={`${styles.rarityDot} ${styles[rCfg.dotClass]}`} />
                      <span className={`${styles.rarityBadge} ${styles[rCfg.badgeClass]}`}
                        style={{ fontSize: 10, padding: '1px 6px' }}>
                        {rCfg.label}
                      </span>
                    </div>
                    <div className={styles.inventoryItemName}>{def.name}</div>
                    <div className={styles.inventoryItemEffect}>
                      {effectSummary(def.effect, def.duration)}
                    </div>
                    <button
                      className={styles.useBtn}
                      onClick={() => handleOpenUseModal(invItem)}
                    >
                      使用
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* 生效中的设施道具 */}
          {(activeFacilityItems || []).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className={styles.sectionTitle}>
                <i className="ti ti-sparkles" />
                当前生效中的设施道具
              </div>
              <div className={styles.inventoryGrid}>
                {(activeFacilityItems || []).map(item => {
                  const def = ITEM_DEFS.find(d => d.id === item.itemId)
                  if (!def) return null
                  const weeksLeft = typeof item.duration === 'number'
                    ? item.duration - (currentWeek - item.usedWeek)
                    : '赛事结束'
                  return (
                    <div key={item.instanceId} className={styles.inventoryCard}
                      style={{ borderColor: 'var(--gold)', borderWidth: 1.5 }}>
                      <div className={styles.inventoryItemName}>{def.name}</div>
                      <div className={styles.inventoryItemEffect}>
                        {effectSummary(def.effect, def.duration)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--forest)', marginTop: 4 }}>
                        剩余：{weeksLeft} 周
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 使用道具弹窗 ── */}
      {useModal && (() => {
        const { invItem, itemDef } = useModal
        const isFacility = itemDef.category === 'facility'
        const rCfg = RARITY_CFG[itemDef.rarity]

        return (
          <div className={styles.modalOverlay} onClick={() => setUseModal(null)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span className={`${styles.rarityBadge} ${styles[rCfg.badgeClass]}`}>
                  {rCfg.label}
                </span>
                <div className={styles.modalTitle}>{itemDef.name}</div>
              </div>
              <div className={styles.modalSubtitle}>
                {isFacility
                  ? '设施道具将对全俱乐部生效，无需选择球员'
                  : '请选择要使用此道具的球员'
                }
              </div>

              <div className={styles.modalEffect}>
                {effectSummary(itemDef.effect, itemDef.duration)}
              </div>

              {!isFacility && (
                <div className={styles.playerSelectList}>
                  {players.map(p => {
                    const cooldownEnd   = p.cooldowns?.[itemDef.id] ?? 0
                    const onCooldown    = cooldownEnd > currentWeek
                    const inMatch       = p.inMatch
                    const isCombatItem  = itemDef.combatOnly
                    // 竞技系列道具：只有参赛周（inMatch）才能使用；但使用前那周报名后才inMatch
                    // 所以这里改为：inMatch 球员不可在赛中使用（赛前使用）
                    const notYetInMatch = isCombatItem && inMatch
                    const disabled      = onCooldown || notYetInMatch
                    const isSelected    = selectedPid === p.id

                    return (
                      <div
                        key={p.id}
                        className={`${styles.playerSelectItem}
                          ${isSelected ? styles.playerSelectItemActive : ''}
                          ${disabled   ? styles.playerSelectItemDisabled : ''}`}
                        onClick={() => !disabled && setSelectedPid(p.id)}
                      >
                        <div className={styles.playerAvatar}>
                          {p.name.slice(0, 1)}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className={styles.playerSelectName}>{p.name}</div>
                          <div className={styles.playerSelectMeta}>
                            疲劳 {p.fatigue} · {p.health === 'healthy' ? '健康' : p.health === 'minor' ? '轻伤' : '重伤'}
                            {inMatch && ' · 比赛中'}
                          </div>
                          {onCooldown && (
                            <div className={styles.cooldownNote}>
                              冷却中（还需 {cooldownEnd - currentWeek} 周）
                            </div>
                          )}
                          {notYetInMatch && (
                            <div className={styles.cooldownNote}>
                              赛事专用道具需在赛前使用
                            </div>
                          )}
                        </div>
                        {isSelected && <i className="ti ti-check" style={{ color: 'var(--forest)' }} />}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className={styles.modalActions}>
                <button className={styles.modalCancelBtn} onClick={() => setUseModal(null)}>
                  取消
                </button>
                <button
                  className={styles.modalConfirmBtn}
                  disabled={!isFacility && !selectedPid}
                  onClick={handleConfirmUse}
                >
                  确认使用
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
