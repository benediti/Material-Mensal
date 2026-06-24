import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Settings, BookOpen, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Painel' },
  { to: '/admin/catalogo', icon: BookOpen, label: 'Catálogo' },
  { to: '/admin/configuracoes', icon: Settings, label: 'Config' },
]

export default function AdminLayout() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Settings size={18} className="opacity-80" />
          <h1 className="font-semibold text-base">Equippe · Admin</h1>
        </div>
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Sair"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Nav bottom */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex shadow-md">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
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
