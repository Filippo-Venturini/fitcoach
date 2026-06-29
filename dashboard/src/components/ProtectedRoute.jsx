import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy-900">
        <div className="text-gold-500 font-heading text-2xl font-bold italic animate-pulse">
          CARICAMENTO...
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Secondo layer: se il profilo è caricato e non è un PT, logout e redirect
  if (profile && profile.role !== 'pt') {
    return <Navigate to="/login" replace />
  }

  return children
}
