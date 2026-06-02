import { useNavigate } from 'react-router-dom'

const pageNames = {
  '/players':    { title: '球员管理',   icon: 'ti-users'              },
  '/coaches':    { title: '教练团队',   icon: 'ti-whistle'            },
  '/schedule':   { title: '训练安排',   icon: 'ti-calendar-week'      },
  '/facilities': { title: '俱乐部设施', icon: 'ti-building-community' },
  '/finance':    { title: '财务收支',   icon: 'ti-chart-bar'          },
  '/events':     { title: '赛事管理',   icon: 'ti-trophy'             },
  '/settings':   { title: '设置',       icon: 'ti-settings'           },
}

export default function PlaceholderPage({ path }) {
  const navigate = useNavigate()
  const info = pageNames[path] || { title: '页面', icon: 'ti-file' }

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: 'var(--forest)',
        padding: '48px 22px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(245,237,218,0.1)',
            border: '0.5px solid rgba(245,237,218,0.2)',
            borderRadius: '8px',
            width: '34px', height: '34px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--gold-pale)',
            cursor: 'pointer',
            fontSize: '18px',
          }}
        >
          <i className="ti ti-arrow-left" aria-hidden="true" />
        </button>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--gold-pale)',
          letterSpacing: '0.04em',
        }}>
          {info.title}
        </h1>
      </div>

      {/* Coming soon */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '60px 24px',
        color: 'var(--ink-muted)',
      }}>
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '18px',
          background: 'rgba(28,58,26,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px',
          color: 'var(--forest)',
        }}>
          <i className={`ti ${info.icon}`} aria-hidden="true" />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--ink)', marginBottom: '6px' }}>
            {info.title}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            此页面正在开发中<br />敬请期待
          </p>
        </div>
      </div>

    </div>
  )
}
