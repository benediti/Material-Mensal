import { useAuthStore } from '@/stores/authStore'
import { Building2, ClipboardList, ChevronRight, UserCircle, LogOut, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SupervisoraDashboard() {
  const { user, perfil, signOut } = useAuthStore()
  const navigate = useNavigate()
  const nomeCompleto = user?.user_metadata?.full_name ?? user?.email ?? ''
  const primeiroNome = nomeCompleto.split(' ')[0]

  return (
    <>
      {/* Top App Bar */}
      <header className="bg-white fixed top-0 w-full z-50 border-b border-gray-200 flex justify-between items-center px-4 h-14 shadow-sm">
        <div className="flex items-center gap-2">
          {perfil === 'ti' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <ArrowLeft size={13} /> Admin
            </button>
          )}
          <h1 className="text-base font-bold text-blue-700">Material Mensal</h1>
        </div>
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Sair"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-5 pt-2">
        {/* Saudação */}
        <div>
          <p className="text-xs text-gray-400">Bem-vinda,</p>
          <h2 className="text-lg font-bold text-gray-800">{primeiroNome} 👋</h2>
        </div>

        {/* Cards de ação rápida */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/supervisora/setores')}
            className="bg-blue-600 rounded-xl p-4 text-white text-left active:scale-[0.97] transition-transform"
            style={{ boxShadow: '0px 4px 12px rgba(0, 88, 188, 0.25)' }}
          >
            <Building2 size={24} className="mb-3" />
            <p className="text-sm font-bold leading-snug">Novo Pedido</p>
            <p className="text-xs opacity-70 mt-0.5">Selecionar local</p>
          </button>

          <button
            onClick={() => navigate('/supervisora/pedidos')}
            className="bg-white border border-gray-200 rounded-xl p-4 text-left active:scale-[0.97] transition-transform"
            style={{ boxShadow: '0px 4px 12px rgba(0, 122, 255, 0.06)' }}
          >
            <ClipboardList size={24} className="mb-3 text-blue-600" />
            <p className="text-sm font-bold text-gray-800 leading-snug">Meus Pedidos</p>
            <p className="text-xs text-gray-400 mt-0.5">Histórico</p>
          </button>
        </div>

        {/* Atalho para setores */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          style={{ boxShadow: '0px 4px 12px rgba(0, 122, 255, 0.06)' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acesso rápido</p>
          </div>
          <button
            onClick={() => navigate('/supervisora/setores')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">Gestão de Limpeza</p>
              <p className="text-xs text-gray-400">Selecione o local do pedido</p>
            </div>
            <ChevronRight size={16} className="text-blue-500" />
          </button>
          <button
            onClick={() => navigate('/supervisora/perfil')}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-50"
          >
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <UserCircle size={18} className="text-gray-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-800">Meu Perfil</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>
        </div>
      </div>
    </>
  )
}
