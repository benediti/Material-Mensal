import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import LoginPage from '@/pages/LoginPage'
import SupervisoraLayout from '@/components/layout/SupervisoraLayout'
import Dashboard from '@/pages/supervisora/Dashboard'
import NovoPedido from '@/pages/supervisora/NovoPedido'
import MeusPedidos from '@/pages/supervisora/MeusPedidos'
import ComprasLayout from '@/components/layout/ComprasLayout'
import ComprasDashboard from '@/pages/compras/Dashboard'
import DiretoriaLayout from '@/components/layout/DiretoriaLayout'
import DiretoriaDashboard from '@/pages/diretoria/Dashboard'

function PrivateRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, perfil } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  if (role && perfil !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Supervisora */}
      <Route path="/" element={<PrivateRoute role="supervisora"><SupervisoraLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="novo-pedido" element={<NovoPedido />} />
        <Route path="meus-pedidos" element={<MeusPedidos />} />
      </Route>

      {/* Compras */}
      <Route path="/compras" element={<PrivateRoute role="compras"><ComprasLayout /></PrivateRoute>}>
        <Route index element={<ComprasDashboard />} />
      </Route>

      {/* Diretoria */}
      <Route path="/diretoria" element={<PrivateRoute role="diretoria"><DiretoriaLayout /></PrivateRoute>}>
        <Route index element={<DiretoriaDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
