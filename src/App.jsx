import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
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

// 读取本地登录状态
function getUser() {
  try { return JSON.parse(localStorage.getItem('tcm_user')) } catch { return null }
}

// 游戏内页面外壳（有侧边栏/底导）
function GameShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="page-content">
          <Routes>
            <Route path="/"           element={<HomePage />}       />
            <Route path="/players"    element={<PlayersPage />}    />
            <Route path="/coaches"    element={<CoachesPage />}    />
            <Route path="/recruit"    element={<RecruitPage />}    />
            <Route path="/schedule"   element={<SchedulePage />}   />
            <Route path="/facilities" element={<FacilitiesPage />} />
            <Route path="/events"     element={<EventsPage />}     />
            <Route path="/finance"    element={<FinancePage />}    />
            <Route path="/settings"   element={<SettingsPage />}   />
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
        {/* 登录界面 */}
        <Route path="/landing" element={<LandingPage />} />

        {/* 游戏主界面 */}
        <Route path="/*" element={<GameShell />} />
      </Routes>
    </BrowserRouter>
  )
}
