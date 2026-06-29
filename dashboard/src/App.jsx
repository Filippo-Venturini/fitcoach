import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Home } from './pages/Home'
import { Clients } from './pages/Clients'
import { ClientDetail } from './pages/ClientDetail'
import { Catalog } from './pages/Catalog'
import { NewWorkoutProgram } from './pages/NewWorkoutProgram'
import { UsefulFiles } from './pages/UsefulFiles'
import { Settings } from './pages/Settings'
import { SetPassword } from './pages/SetPassword'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function AuthRedirectHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const params = new URLSearchParams(hash.replace('#', ''))
    const type = params.get('type')
    if (type === 'invite' || type === 'recovery') {
      navigate('/set-password' + hash, { replace: true })
    }
  }, [])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AuthRedirectHandler />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              {/* La pagina "Nuovo programma" occupa tutta la finestra (senza sidebar) */}
              <Route path="clients/:id/programs/new" element={<NewWorkoutProgram />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="files" element={<UsefulFiles />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
