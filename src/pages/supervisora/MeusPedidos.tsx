import { ClipboardList } from 'lucide-react'

export default function MeusPedidos() {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Meus Pedidos</h2>
      <div className="flex flex-col items-center text-center py-12">
        <ClipboardList size={48} className="text-gray-200 mb-3" />
        <p className="text-sm font-medium text-gray-600">Nenhum pedido ainda</p>
        <p className="text-xs text-gray-400 mt-1">Seus pedidos aparecerão aqui</p>
      </div>
    </div>
  )
}
