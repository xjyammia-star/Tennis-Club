import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Topbar from './components/Topbar'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import CoachesPage from './pages/CoachesPage'
import RecruitPage from './pages/RecruitPage'
import SchedulePage from './pages/SchedulePage'
import PlaceholderPage from './pages/PlaceholderPage'

const placeholderRoutes = [
  '/facilities',
  '/finance',
  '/events',
  '/settings',
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-area">
          <Topbar />
          <main className="page-content">
            <Routes>
              <Route path="/"          element={<HomePage />}     />
              <Route path="/players"   element={<PlayersPage />}  />
              <Route path="/coaches"   element={<CoachesPage />}  />
              <Route path="/recruit"   element={<RecruitPage />}  />
              <Route path="/schedule"  element={<SchedulePage />} />
              {placeholderRoutes.map(path => (
                <Route key={path} path={path} element={<PlaceholderPage path={path} />} />
              ))}
            </Routes>
          </main>
        </div>
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
