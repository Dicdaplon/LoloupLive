import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Paroles from './pages/Paroles'
import Info from './pages/Info'
import AppLayout from './components/AppLayout'
import Grilles from './pages/Grilles'

export default function App() {
  return (
    <div>

      {/* Affiche la page selon l’URL */}
      <Routes>
        <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/paroles" element={<Paroles />} />
         <Route path="/info" element={<Info />} />
         <Route path="/grilles" element={<Grilles />} />
         </Route>
      </Routes>
    </div>
  )
}
