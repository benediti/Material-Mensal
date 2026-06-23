import { useAuthStore } from '@/stores/authStore'
import { PlusCircle, ClipboardList, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Olá! 👋</h2>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/novo-pedido')}
          className="card flex flex-col items-center gap-2 py-5 hover:shadow-md transition-shadow active:scale-95"
        >
          <PlusCircle size={24} className="text-primary" />
          <span className="text-sm font-medium text-gray-700">Novo Pedido</span>
        </button>
        <button
          onClick={() => navigate('/meus-pedidos')}
          className="card flex flex-col items-center gap-2 py-5 hover:shadow-md transition-shadow active:scale-95"
        >
          <ClipboardList size={24} className="text-primary" />
          <span className="text-sm font-medium text-gray-700">Meus Pedidos</span>
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700">Pedidos recentes</h3>
        </div>
        <p className="text-sm text-gray-400 text-center py-4">Nenhum pedido ainda. Crie o primeiro! 🗂️</p>
      </div>
    </div>
  )
}
