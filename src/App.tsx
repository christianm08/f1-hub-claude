// Shell: HashRouter (funziona da qualsiasi hosting statico), 13 route lazy, SettingsProvider + ToastProvider.
import { lazy } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from './store/settings'
import { ToastProvider } from './design'
import { Layout } from './components/Layout'

const Home = lazy(() => import('./pages/Home'))
const Calendar = lazy(() => import('./pages/Calendar'))
const RaceDetail = lazy(() => import('./pages/RaceDetail'))
const Results = lazy(() => import('./pages/Results'))
const Drivers = lazy(() => import('./pages/Drivers'))
const DriverDetail = lazy(() => import('./pages/DriverDetail'))
const Teams = lazy(() => import('./pages/Teams'))
const TeamDetail = lazy(() => import('./pages/TeamDetail'))
const Circuits = lazy(() => import('./pages/Circuits'))
const Standings = lazy(() => import('./pages/Standings'))
const RaceCenter = lazy(() => import('./pages/RaceCenter'))
const News = lazy(() => import('./pages/News'))
const Settings = lazy(() => import('./pages/Settings'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <SettingsProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="calendario" element={<Calendar />} />
              <Route path="gara/:season/:round" element={<RaceDetail />} />
              <Route path="risultati" element={<Results />} />
              <Route path="piloti" element={<Drivers />} />
              <Route path="piloti/:driverId" element={<DriverDetail />} />
              <Route path="team" element={<Teams />} />
              <Route path="team/:constructorId" element={<TeamDetail />} />
              <Route path="circuiti" element={<Circuits />} />
              <Route path="classifiche" element={<Standings />} />
              <Route path="live" element={<RaceCenter />} />
              <Route path="news" element={<News />} />
              <Route path="impostazioni" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </SettingsProvider>
  )
}
