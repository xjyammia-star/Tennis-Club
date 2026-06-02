import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Topbar from './components/Topbar'
import HomePage from './pages/HomePage'
import PlayersPage from './pages/PlayersPage'
import PlaceholderPage from './pages/PlaceholderPage'

const placeholderRoutes = [
  '/coaches',
  '/schedule',
  '/facilities',
  '/finance',
  '/events',
  '/settings',
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">

        {/* Desktop sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="main-area">

          {/* Desktop top bar */}
          <Topbar />

          <main className="page-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/players" element={<PlayersPage />} />
              {placeholderRoutes.map(path => (
                <Route
                  key={path}
                  path={path}
                  element={<PlaceholderPage path={path} />}
                />
              ))}
            </Routes>
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />

      </div>
    </BrowserRouter>
  )
}
