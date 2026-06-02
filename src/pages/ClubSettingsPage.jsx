import { useState } from 'react'
import { calcCourtRentalIncome, rentRateLabel } from '../utils/courtRental'
import { gameState, clubStats } from '../data/mockData'
import styles from './ClubSettingsPage.module.css'

// ── 默认经营参数（存 localStorage）────────────────────
export const DEFAULT_CLUB_SETTINGS = {
  courtHourlyRate:    200,   // 场地每小时租金（元）
  privateCoachCut:    40,    // 俱乐部私教分成比例（%）
  groupClassFee:      80,    // 团课每人每小时收费（元）
  tacticsClassFee:    60,    // 战术课每人每小时收费
  membershipFeeWeekly: 300,  // 会员周费（元/人）
  levelProbBoost:     0.003, // 球员水平对私教概率的影响系数
  wealthCoachBoost:   0.4,   // 富裕球员偏好高级教练的权重加成
}

function getSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('tcm_club_settings'))
    return { ...DEFAULT_CLUB_SETTINGS, ...saved }
  } catch {
    return { ...DEFAULT_CLUB_SETTINGS }
  }
}

// ── Toggle ────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      className={`${styles.toggle} ${value ? styles.toggleOn : ''}`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <span className={styles.toggleThumb} />
    </button>
  )
}

// ── 数字输入行 ────────────────────────────────────────
function NumRow({ label, desc, value, onChange, min, max, step = 1, prefix = '', suffix = '' }) {
  return (
    <div className={styles.row}>
      <div className={styles.rowLeft}>
        <span className={styles.rowLabel}>{label}</span>
        {desc && <span className={styles.rowDesc}>{desc}</span>}
      </div>
      <div className={styles.numInput}>
        <button
          className={styles.numBtn}
          onClick={() => onChange(Math.max(min, value - step))}
        >−</button>
        <span className={styles.numVal}>{prefix}{value}{suffix}</span>
        <button
          className={styles.numBtn}
          onClick={() => onChange(Math.min(max, value + step))}
        >+</button>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <i className={`ti ${icon}`} />
        <span>{title}</span>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────
export default function ClubSettingsPage() {
  const [settings, setSettings] = useState(getSettings)
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

  // 实时预览本周外租收入
  const rentalPreview = calcCourtRentalIncome({
    courtCount:  clubStats.courtCount,
    prestige:    gameState.prestige,
    hourlyRate:  settings.courtHourlyRate,
    weekPrivateCounts: { mon:4, tue:3, wed:4, thu:3, fri:4, sat:2, sun:0 }, // 示例
    eventModifier: 0,
  })

  // 租金越高出租率越低（每涨50元降低约3%出租率）
  const rateAdjusted = Math.max(10, rentalPreview.rentRate - Math.floor((settings.courtHourlyRate - 200) / 50) * 3)
  const incomeAdjusted = Math.round(rentalPreview.totalRentableHours * (rateAdjusted / 100) * settings.courtHourlyRate)

  return (
    <div className={styles.page}>

      {/* 移动端 Header */}
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>俱乐部经营</h1>
      </header>

      <div className={styles.inner}>

        {/* ── 场地租赁设置 ── */}
        <Section title="场地租赁" icon="ti-rectangle">
          <NumRow
            label="场地每小时租金"
            desc="租金越高出租率越低，建议根据声望调整"
            value={settings.courtHourlyRate}
            onChange={v => update('courtHourlyRate', v)}
            min={50} max={1000} step={50}
            prefix="¥" suffix="/小时"
          />

          {/* 实时预览 */}
          <div className={styles.previewCard}>
            <div className={styles.previewTitle}>本周外租收入预估</div>
            <div className={styles.previewGrid}>
              <div className={styles.previewItem}>
                <span className={styles.previewVal}>¥{incomeAdjusted.toLocaleString()}</span>
                <span className={styles.previewLbl}>预估收入</span>
              </div>
              <div className={styles.previewItem}>
                <span className={styles.previewVal}>{rateAdjusted}%</span>
                <span className={styles.previewLbl}>出租率</span>
              </div>
              <div className={styles.previewItem}>
                <span className={`${styles.previewVal} ${styles[`rate_${rentRateLabel(rateAdjusted)}`]}`}>
                  {rentRateLabel(rateAdjusted)}
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

          {/* 时段说明 */}
          <div className={styles.timeTable}>
            <div className={styles.timeTableTitle}>场地使用规则</div>
            {[
              { time: '06:00 – 10:00', use: '私教专用 + 可外租', tag: 'rent', tagLabel: '可租' },
              { time: '10:00 – 12:00', use: '俱乐部团课专用',     tag: 'club', tagLabel: '俱乐部' },
              { time: '12:00 – 17:00', use: '团课 + 可外租',      tag: 'rent', tagLabel: '可租' },
              { time: '17:00 – 19:00', use: '俱乐部团课专用',     tag: 'club', tagLabel: '俱乐部' },
              { time: '19:00 – 22:00', use: '团课 + 可外租',      tag: 'rent', tagLabel: '可租' },
            ].map((row, i) => (
              <div key={i} className={styles.timeRow}>
                <span className={styles.timeSlot}>{row.time}</span>
                <span className={styles.timeUse}>{row.use}</span>
                <span className={`${styles.timeTag} ${styles[`tag_${row.tag}`]}`}>{row.tagLabel}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 私教课设置 ── */}
        <Section title="私教课设置" icon="ti-user-star">
          <NumRow
            label="俱乐部私教分成"
            desc="俱乐部从每节私教课抽取的比例"
            value={settings.privateCoachCut}
            onChange={v => update('privateCoachCut', v)}
            min={10} max={70} step={5}
            suffix="%"
          />
          <div className={styles.row}>
            <div className={styles.rowLeft}>
              <span className={styles.rowLabel}>私教安排说明</span>
              <span className={styles.rowDesc}>
                系统根据球员家庭背景、水平自动安排私教，每节1小时，限06-10点
              </span>
            </div>
          </div>
          <div className={styles.ruleSummary}>
            {[
              { icon: 'ti-users',      text: `每天最多 ${clubStats.courtCount * 2} 场私教（球场数×2）` },
              { icon: 'ti-user-star',  text: `同时私教不超过 ${clubStats.coachCount} 人（教练数量上限）` },
              { icon: 'ti-heart',      text: '受伤球员或比赛周自动跳过私教' },
              { icon: 'ti-currency-yen', text: '富裕球员倾向预约高级教练' },
            ].map((r, i) => (
              <div key={i} className={styles.ruleItem}>
                <i className={`ti ${r.icon}`} />
                <span>{r.text}</span>
              </div>
            ))}
          </div>

          {/* 概率参数（高级设置） */}
          <details className={styles.advancedDetails}>
            <summary className={styles.advancedSummary}>高级参数调整</summary>
            <div className={styles.advancedBody}>
              <NumRow
                label="水平概率加成系数"
                desc="球员每点技术水平对私教概率的影响（默认0.003）"
                value={Math.round(settings.levelProbBoost * 1000)}
                onChange={v => update('levelProbBoost', v / 1000)}
                min={0} max={10} step={1}
                suffix="‰"
              />
              <NumRow
                label="富裕教练偏好权重"
                desc="富裕球员倾向高级教练的权重加成（默认0.4）"
                value={Math.round(settings.wealthCoachBoost * 10)}
                onChange={v => update('wealthCoachBoost', v / 10)}
                min={0} max={20} step={1}
                suffix="×0.1"
              />
            </div>
          </details>
        </Section>

        {/* ── 课程收费 ── */}
        <Section title="课程收费标准" icon="ti-currency-yen">
          <NumRow
            label="团课收费"
            desc="每人每小时团课费用"
            value={settings.groupClassFee}
            onChange={v => update('groupClassFee', v)}
            min={0} max={500} step={10}
            prefix="¥" suffix="/人/小时"
          />
          <NumRow
            label="战术课收费"
            desc="每人每小时战术分析课费用"
            value={settings.tacticsClassFee}
            onChange={v => update('tacticsClassFee', v)}
            min={0} max={300} step={10}
            prefix="¥" suffix="/人/小时"
          />
          <NumRow
            label="会员周费"
            desc="每名在籍球员每周缴纳的会员费"
            value={settings.membershipFeeWeekly}
            onChange={v => update('membershipFeeWeekly', v)}
            min={0} max={2000} step={50}
            prefix="¥" suffix="/人/周"
          />
        </Section>

        {/* 保存按钮 */}
        <button
          className={`${styles.saveBtn} ${saved ? styles.saveBtnDone : ''}`}
          onClick={handleSave}
        >
          {saved
            ? <><i className="ti ti-check" /> 已保存</>
            : <><i className="ti ti-device-floppy" /> 保存设置</>
          }
        </button>

        <div className={styles.footer}>
          经营设置仅影响收益计算，不影响球员训练数据
        </div>

      </div>
    </div>
  )
}
