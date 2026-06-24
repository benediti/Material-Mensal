import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'

// layouts
import SupervisoraLayout from '@/components/layout/SupervisoraLayout'
import ComprasLayout from '@/components/layout/ComprasLayout'
import DiretoriaLayout from '@/components/layout/DiretoriaLayout'
import AdminLayout from '@/components/layout/AdminLayout'

// páginas supervisora
import Dashboard from '@/pages/supervisora/Dashboard'
import NovoPedido from '@/pages/supervisora/NovoPedido'
import MeusPedidos from '@/pages/supervisora/MeusPedidos'

// páginas compras
import ComprasDashboard from '@/pages/compras/Dashboard'

// páginas diretoria
import DiretoriaDashboard from '@/pages/diretoria/Dashboard'

// páginas admin
import AdminDashboard from '@/pages/admin/Dashboard'
import Catalogo from '@/pages/admin/Catalogo'

type Role = 'supervisora' | 'compras' | 'diretoria' | 'ti'

function PrivateRoute({
  children,
  role,
}: {
  children: React.ReactNode
  role?: Role | Role[]
}) {
  const { user, perfil } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (role) {
    const roles = Array.isArray(role) ? role : [role]
    if (!roles.includes(perfil as Role)) return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* ── Supervisora ── */}
      <Route
        path="/"
        element={
          <PrivateRoute role="supervisora">
            <SupervisoraLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="novo-pedido" element={<NovoPedido />} />
        <Route path="meus-pedidos" element={<MeusPedidos />} />
      </Route>

      {/* ── Compras ── */}
      <Route
        path="/compras"
        element={
          <PrivateRoute role="compras">
            <ComprasLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<ComprasDashboard />} />
      </Route>

      {/* ── Diretoria ── */}
      <Route
        path="/diretoria"
        element={
          <PrivateRoute role="diretoria">
            <DiretoriaLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DiretoriaDashboard />} />
      </Route>

      {/* ── Admin (TI) ── */}
      <Route
        path="/admin"
        element={
          <PrivateRoute role="ti">
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="catalogo" element={<Catalogo />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
