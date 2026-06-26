import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import AcessoPendente from '@/pages/AcessoPendente'
import AuthCallback from '@/pages/AuthCallback'
import AdminLayout from '@/components/layout/AdminLayout'
import AdminDashboard from '@/pages/admin/Dashboard'
import Catalogo from '@/pages/admin/Catalogo'
import Configuracoes from '@/pages/admin/Configuracoes'
import ImportarPrecos from '@/pages/admin/ImportarPrecos'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, perfil, perfilAtivo, loading } = useAuthStore()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (!perfilAtivo || perfil === 'pendente') return <Navigate to="/acesso-pendente" replace />

  return <>{children}</>
}

function TiRoute({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuthStore()
  if (loading) return null
  if (perfil !== 'ti') return <Navigate to="/admin" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/acesso-pendente" element={<AcessoPendente />} />

      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="configuracoes" element={<TiRoute><Configuracoes /></TiRoute>} />
        <Route path="importar-precos" element={<ImportarPrecos />} />
      </Route>

      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
