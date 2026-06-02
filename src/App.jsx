import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import Topbar from './components/Topbar'
import HomePage from './pages/HomePage'
import PlaceholderPage from './pages/PlaceholderPage'

const placeholderRoutes = [
  '/players',
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

        {/* Desktop sidebar — hidden on mobile via CSS */}
        <Sidebar />

        {/* Main content area */}
        <div className="main-area">

          {/* Desktop top bar — hidden on mobile via CSS */}
          <Topbar />

          <main className="page-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
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

        {/* Mobile bottom nav — hidden on desktop via CSS */}
        <BottomNav />

      </div>
    </BrowserRouter>
  )
}
