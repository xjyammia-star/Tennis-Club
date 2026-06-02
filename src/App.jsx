import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Topbar from './components/Topbar'
import LandingPage from './pages/LandingPage'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import CoachesPage from './pages/CoachesPage'
import RecruitPage from './pages/RecruitPage'
import SchedulePage from './pages/SchedulePage'
import FacilitiesPage from './pages/FacilitiesPage'
import EventsPage from './pages/EventsPage'
import FinancePage from './pages/FinancePage'
import SettingsPage from './pages/SettingsPage'

// 游戏内页面外壳（有侧边栏/底导）
function GameShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="page-content">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 默认跳转到登录界面 */}
        <Route path="/" element={<Navigate to="/landing" replace />} />

        {/* 登录界面 */}
        <Route path="/landing" element={<LandingPage />} />

        {/* 游戏主界面 */}
        <Route path="/home"       element={<GameShell><HomePage /></GameShell>} />
        <Route path="/players"    element={<GameShell><PlayersPage /></GameShell>} />
        <Route path="/coaches"    element={<GameShell><CoachesPage /></GameShell>} />
        <Route path="/recruit"    element={<GameShell><RecruitPage /></GameShell>} />
        <Route path="/schedule"   element={<GameShell><SchedulePage /></GameShell>} />
        <Route path="/facilities" element={<GameShell><FacilitiesPage /></GameShell>} />
        <Route path="/events"     element={<GameShell><EventsPage /></GameShell>} />
        <Route path="/finance"    element={<GameShell><FinancePage /></GameShell>} />
        <Route path="/settings"   element={<GameShell><SettingsPage /></GameShell>} />
      </Routes>
    </BrowserRouter>
  )
}
