import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import { UserCircle, Mail, LogOut } from 'lucide-react'

export default function SupervisoraPerfil() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const nome = user?.user_metadata?.full_name ?? '—'
  const email = user?.email ?? '—'

  return (
    <>
      <header className="bg-white fixed top-0 w-full z-50 border-b border-gray-200 flex items-center justify-between px-4 h-14 shadow-sm">
        <h1 className="text-base font-bold text-blue-700">Meu Perfil</h1>
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-4 pt-2">
        {/* Avatar */}
        <div className="flex flex-col items-center py-6 gap-2">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
            <UserCircle size={52} className="text-blue-600" />
          </div>
          <p className="text-base font-bold text-gray-800">{nome}</p>
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-0.5 rounded-full">
            Supervisora
          </span>
        </div>

        {/* Info */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          style={{ boxShadow: '0px 4px 12px rgba(0, 122, 255, 0.06)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
            <Mail size={16} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">E-mail</p>
              <p className="text-sm text-gray-700">{email}</p>
            </div>
          </div>
        </div>

        {/* Sair */}
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all"
        >
          <LogOut size={16} />
          Sair da conta
        </button>
      </div>
    </>
  )
}
