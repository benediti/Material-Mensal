import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { LogOut, LayoutDashboard, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const NAV = [
  { to: '/compras', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/compras/catalogo', label: 'Catálogo', icon: BookOpen, end: false },
]

export default function ComprasLayout() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-primary text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="font-semibold text-base">Compras — Material</h1>
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="p-1.5 rounded-lg hover:bg-white/10"
          aria-label="Sair"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Nav tabs */}
      <nav className="bg-white border-b border-gray-100 px-4 flex gap-1 sticky top-[52px] z-10">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1"><Outlet /></main>
    </div>
  )
}
