import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function ComprasLayout() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
      <main className="flex-1"><Outlet /></main>
    </div>
  )
}
