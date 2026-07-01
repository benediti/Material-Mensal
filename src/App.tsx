import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import AcessoPendente from '@/pages/AcessoPendente'
import AuthCallback from '@/pages/AuthCallback'

// Admin
import AdminLayout from '@/components/layout/AdminLayout'
import AdminDashboard from '@/pages/admin/Dashboard'
import Catalogo from '@/pages/admin/Catalogo'
import Configuracoes from '@/pages/admin/Configuracoes'
import ImportarPrecos from '@/pages/admin/ImportarPrecos'

// Supervisora
import SupervisoraLayout from '@/components/layout/SupervisoraLayout'
import SupervisoraDashboard from '@/pages/supervisora/Dashboard'
import Setores from '@/pages/supervisora/Setores'
import NovoPedido from '@/pages/supervisora/NovoPedido'
import SupervisoraPedidos from '@/pages/supervisora/Pedidos'
import SupervisoraPerfil from '@/pages/supervisora/Perfil'

const ADMIN_PERFIS = ['ti', 'compras', 'diretoria']

/** Redireciona para a área correta conforme o perfil */
function RootRedirect() {
  const { user, perfil, perfilAtivo, loading } = useAuthStore()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Carregando...</p>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />
  if (!perfilAtivo || perfil === 'pendente') return <Navigate to="/acesso-pendente" replace />
  if (perfil === 'supervisora') return <Navigate to="/supervisora" replace />
  return <Navigate to="/admin" replace />
}

/** Protege rotas que exigem login e perfil ativo */
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

/** Protege rotas exclusivas de TI */
function TiRoute({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuthStore()
  if (loading) return null
  if (perfil !== 'ti') return <Navigate to="/admin" replace />
  return <>{children}</>
}

/** Protege rotas de admin (ti, compras, diretoria) */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuthStore()
  if (loading) return null
  if (!perfil || !ADMIN_PERFIS.includes(perfil)) return <Navigate to="/supervisora" replace />
  return <>{children}</>
}

/** Protege rotas de supervisora */
function SupervisoraRoute({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuthStore()
  if (loading) return null
  if (perfil !== 'supervisora') return <Navigate to="/admin" replace />
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

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </PrivateRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="configuracoes" element={<TiRoute><Configuracoes /></TiRoute>} />
        <Route path="importar-precos" element={<ImportarPrecos />} />
      </Route>

      {/* Supervisora */}
      <Route
        path="/supervisora"
        element={
          <PrivateRoute>
            <SupervisoraRoute>
              <SupervisoraLayout />
            </SupervisoraRoute>
          </PrivateRoute>
        }
      >
        <Route index element={<SupervisoraDashboard />} />
        <Route path="setores" element={<Setores />} />
        <Route path="pedido/:setorId" element={<NovoPedido />} />
        <Route path="pedidos" element={<SupervisoraPedidos />} />
        <Route path="perfil" element={<SupervisoraPerfil />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
