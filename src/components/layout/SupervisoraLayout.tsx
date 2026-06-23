import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, PlusCircle, ClipboardList, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function SupervisoraLayout() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-semibold text-base">Equippe Material</h1>
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Sair"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex">
        {[
          { to: '/', icon: Home, label: 'Início' },
          { to: '/novo-pedido', icon: PlusCircle, label: 'Novo Pedido' },
          { to: '/meus-pedidos', icon: ClipboardList, label: 'Pedidos' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
