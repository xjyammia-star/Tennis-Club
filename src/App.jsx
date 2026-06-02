import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BottomNav from './components/BottomNav'
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
        <BottomNav />
      </div>
    </BrowserRouter>
  )
}
