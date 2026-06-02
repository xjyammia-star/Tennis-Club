import { useState } from 'react'
import { DEFAULT_CLUB_SETTINGS, getClubSettings } from '../utils/clubSettings'
import { calcCourtRentalIncome, rentRateLabel } from '../utils/courtRental'
import { gameState, clubStats } from '../data/mockData'
import styles from './ClubSettingsPage.module.css'

function Section({ title, icon, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}><i className={`ti ${icon}`} /><span>{title}</span></div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

function NumRow({ label, desc, value, onChange, min, max, step=1, prefix='', suffix='', right }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>
        <span className={styles.rowLabel}>{label}</span>
        {desc && <span className={styles.rowDesc}>{desc}</span>}
      </div>
      {right || (
        <div className={styles.numInput}>
          <button className={styles.numBtn} onClick={() => onChange(Math.max(min, value - step))}>−</button>
          <span className={styles.numVal}>{prefix}{value}{suffix}</span>
          <button className={styles.numBtn} onClick={() => onChange(Math.min(max, value + step))}>+</button>
        </div>
      )}
    </div>
  )
}

// 私教费用行（带级别标签）
function PrivateFeeRow({ levelLabel, levelColor, value, onChange }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>
        <div className={styles.rowLabelRow}>
          <span className={styles.levelBadge} style={{ background: levelColor + '18', color: levelColor, borderColor: levelColor + '40' }}>
            {levelLabel}
          </span>
          <span className={styles.rowLabel}>私教费用</span>
        </div>
        <span className={styles.rowDesc}>
          俱乐部收入 ¥{Math.round(value * 40 / 100)}/节（按40%分成）
        </span>
      </div>
      <div className={styles.numInput}>
        <button className={styles.numBtn} onClick={() => onChange(Math.max(50, value - 50))}>−</button>
        <span className={styles.numVal}>¥{value}/小时</span>
        <button className={styles.numBtn} onClick={() => onChange(Math.min(2000, value + 50))}>+</button>
      </div>
    </div>
  )
}

export default function ClubSettingsPage() {
  const [settings, setSettings] = useState(getClubSettings)
  const [saved, setSaved] = useState(false)

  function update(key, val) {
    setSettings(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  function handleSave() {
    localStorage.setItem('tcm_club_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const rentalPreview = calcCourtRentalIncome({
    courtCount: clubStats.courtCount,
    prestige:   gameState.prestige,
    hourlyRate: settings.courtHourlyRate,
    weekPrivateCounts: { mon:4, tue:3, wed:4, thu:3, fri:4, sat:2, sun:0 },
    eventModifier: 0,
  })
  const rateAdj   = Math.max(10, rentalPreview.rentRate - Math.floor((settings.courtHourlyRate - 200) / 50) * 3)
  const incomeAdj = Math.round(rentalPreview.totalRentableHours * (rateAdj / 100) * settings.courtHourlyRate)

  // 预估本周私教总收入（示例：假设每周约20节私教）
  const privateIncomePreview = Math.round(
    (settings.privateFeeElite     * 0.02 +
     settings.privateFeeSenior    * 0.08 +
     settings.privateFeeNormal    * 0.08 +
     settings.privateFeeeAssistant * 0.02) * settings.privateCoachCut / 100 * 20
  )

  return (
    <div className={styles.page}>
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>俱乐部经营</h1>
      </header>
      <div className={styles.inner}>

        {/* ── 场地租赁 ── */}
        <Section title="场地租赁" icon="ti-rectangle">
          <NumRow
            label="场地每小时租金" desc="租金越高出租率越低，建议根据声望调整"
            value={settings.courtHourlyRate} onChange={v => update('courtHourlyRate', v)}
            min={50} max={1000} step={50} prefix="¥" suffix="/小时"
          />
          <div className={styles.previewCard}>
            <div className={styles.previewTitle}>本周外租收入预估</div>
            <div className={styles.previewGrid}>
              <div className={styles.previewItem}>
                <span className={styles.previewVal}>¥{incomeAdj.toLocaleString()}</span>
                <span className={styles.previewLbl}>预估收入</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewVal}>{rateAdj}%</span>
                <span className={styles.previewLbl}>出租率</span>
              </div>
              <div className={styles.previewItem}>
                <span className={`${styles.previewVal} ${styles[`rate_${rentRateLabel(rateAdj)}`]}`}>
                  {rentRateLabel(rateAdj)}
                </span>
                <span className={styles.previewLbl}>场地热度</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewVal}>{rentalPreview.totalRentableHours}h</span>
                <span className={styles.previewLbl}>可租总时长</span>
              </div>
            </div>
            <div className={styles.previewNote}>
              <i className="ti ti-info-circle" />
              声望加成 +{rentalPreview.prestigeBonus}%，实际出租率受随机事件影响
            </div>
          </div>
          <div className={styles.timeTable}>
            <div className={styles.timeTableTitle}>场地使用规则</div>
            {[
              { time: '06:00–10:00', use: '私教专用 + 可外租', tag: 'rent' },
              { time: '10:00–12:00', use: '俱乐部团课专用',     tag: 'club' },
              { time: '12:00–17:00', use: '团课 + 可外租',      tag: 'rent' },
              { time: '17:00–19:00', use: '俱乐部团课专用',     tag: 'club' },
              { time: '19:00–22:00', use: '团课 + 可外租',      tag: 'rent' },
            ].map((r, i) => (
              <div key={i} className={styles.timeRow}>
                <span className={styles.timeSlot}>{r.time}</span>
                <span className={styles.timeUse}>{r.use}</span>
                <span className={`${styles.timeTag} ${styles[`tag_${r.tag}`]}`}>
                  {r.tag === 'rent' ? '可租' : '俱乐部'}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 私教课设置 ── */}
        <Section title="私教课设置" icon="ti-user-star">
          <NumRow
            label="俱乐部私教分成" desc="俱乐部从每节私教课收入中抽取的比例，剩余归教练"
            value={settings.privateCoachCut} onChange={v => update('privateCoachCut', v)}
            min={10} max={70} step={5} suffix="%"
          />

          {/* 按级别设置私教费用 */}
          <div className={styles.feeSection}>
            <div className={styles.feeSectionTitle}>各级别私教费用（每节1小时）</div>
            <PrivateFeeRow
              levelLabel="顶级教练" levelColor="#c9a84c"
              value={settings.privateFeeElite}
              onChange={v => update('privateFeeElite', v)}
            />
            <PrivateFeeRow
              levelLabel="高级教练" levelColor="#2a7a5a"
              value={settings.privateFeeSenior}
              onChange={v => update('privateFeeSenior', v)}
            />
            <PrivateFeeRow
              levelLabel="普通教练" levelColor="#2a5fa8"
              value={settings.privateFeeNormal}
              onChange={v => update('privateFeeNormal', v)}
            />
            <PrivateFeeRow
              levelLabel="助教" levelColor="#8a9688"
              value={settings.privateFeeeAssistant}
              onChange={v => update('privateFeeeAssistant', v)}
            />
          </div>

          {/* 预估私教收入 */}
          <div className={styles.previewCard}>
            <div className={styles.previewTitle}>本周私教收入预估</div>
            <div className={styles.feePreviewRow}>
              <div className={styles.feePreviewItem}>
                <span className={styles.previewVal} style={{ color: '#1a6010' }}>
                  ¥{privateIncomePreview.toLocaleString()}
                </span>
                <span className={styles.previewLbl}>俱乐部分成（{settings.privateCoachCut}%）</span>
              </div>
              <div className={styles.feePreviewItem}>
                <span className={styles.previewVal}>
                  ¥{(privateIncomePreview / settings.privateCoachCut * (100 - settings.privateCoachCut)).toLocaleString('zh', {maximumFractionDigits:0})}
                </span>
                <span className={styles.previewLbl}>教练收入（{100 - settings.privateCoachCut}%）</span>
              </div>
            </div>
            <div className={styles.previewNote}>
              <i className="ti ti-info-circle" />
              基于当前私教安排估算，实际以每周结算为准
            </div>
          </div>

          <div className={styles.ruleSummary}>
            {[
              { icon: 'ti-users',        text: `每天最多 ${clubStats.courtCount * 2} 场私教（球场数×2）` },
              { icon: 'ti-user-star',    text: `同时私教不超过 ${clubStats.coachCount} 人（教练数量上限）` },
              { icon: 'ti-heart',        text: '受伤球员或比赛周自动跳过' },
              { icon: 'ti-award',        text: '富裕球员倾向预约高级教练' },
            ].map((r, i) => (
              <div key={i} className={styles.ruleItem}>
                <i className={`ti ${r.icon}`} /><span>{r.text}</span>
              </div>
            ))}
          </div>

          <details className={styles.advancedDetails}>
            <summary className={styles.advancedSummary}>高级参数调整</summary>
            <div className={styles.advancedBody}>
              <NumRow
                label="水平概率加成系数" desc="球员每点技术水平对私教概率的影响"
                value={Math.round(settings.levelProbBoost * 1000)}
                onChange={v => update('levelProbBoost', v / 1000)}
                min={0} max={10} step={1} suffix="‰"
              />
              <NumRow
                label="富裕教练偏好权重" desc="富裕球员倾向高级教练的权重加成"
                value={Math.round(settings.wealthCoachBoost * 10)}
                onChange={v => update('wealthCoachBoost', v / 10)}
                min={0} max={20} step={1} suffix="×0.1"
              />
            </div>
          </details>
        </Section>

        {/* ── 团课收费 ── */}
        <Section title="团课收费标准" icon="ti-currency-yen">
          <NumRow
            label="球场团课" desc="每人每小时收费"
            value={settings.groupClassFee} onChange={v => update('groupClassFee', v)}
            min={0} max={500} step={10} prefix="¥" suffix="/人/小时"
          />
          <NumRow
            label="体能团课" desc="每人每小时收费"
            value={settings.fitnessClassFee} onChange={v => update('fitnessClassFee', v)}
            min={0} max={500} step={10} prefix="¥" suffix="/人/小时"
          />
          <NumRow
            label="战术分析课" desc="每人每小时收费"
            value={settings.tacticsClassFee} onChange={v => update('tacticsClassFee', v)}
            min={0} max={300} step={10} prefix="¥" suffix="/人/小时"
          />
        </Section>

        <button
          className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
          onClick={handleSave}
        >
          {saved
            ? <><i className="ti ti-check" /> 已保存</>
            : <><i className="ti ti-device-floppy" /> 保存设置</>
          }
        </button>
        <div className={styles.footer}>经营设置仅影响收益计算，不影响球员训练数据</div>
      </div>
    </div>
  )
}
