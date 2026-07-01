import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, Building2, ClipboardList, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const NAV = [
  { to: '/supervisora', icon: Home, label: 'Home', end: true },
  { to: '/supervisora/setores', icon: Building2, label: 'Setores' },
  { to: '/supervisora/pedidos', icon: ClipboardList, label: 'Pedidos' },
  { to: '/supervisora/perfil', icon: User, label: 'Perfil' },
]

export default function SupervisoraLayout() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] flex flex-col">
      <main className="flex-1 pb-24 pt-14">
        <Outlet context={{ handleSignOut }} />
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center bg-white h-20 border-t border-gray-200 shadow-md">
        {NAV.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-4 py-1 rounded-2xl transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-400 hover:bg-gray-100'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-[11px] font-semibold">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
