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
import ClubSettingsPage from './pages/ClubSettingsPage'

// GameShell 移到组件外部定义，避免每次渲染重新创建导致子组件重新挂载
// 这样 Sidebar 始终是同一个实例，context 变化能正确触发重渲染
function GameLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="page-content">
          <Routes>
            <Route path="/home"          element={<HomePage />}        />
            <Route path="/players"       element={<PlayersPage />}     />
            <Route path="/coaches"       element={<CoachesPage />}     />
            <Route path="/recruit"       element={<RecruitPage />}     />
            <Route path="/schedule"      element={<SchedulePage />}    />
            <Route path="/facilities"    element={<FacilitiesPage />}  />
            <Route path="/events"        element={<EventsPage />}      />
            <Route path="/finance"       element={<FinancePage />}     />
            <Route path="/settings"      element={<SettingsPage />}    />
            <Route path="/club-settings" element={<ClubSettingsPage />}/>
          </Routes>
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
        <Route path="/"        element={<Navigate to="/landing" replace />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/*"       element={<GameLayout />} />
      </Routes>
    </BrowserRouter>
  )
}
