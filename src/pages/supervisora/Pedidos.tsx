import { ClipboardList } from 'lucide-react'

export default function SupervisoraPedidos() {
  return (
    <>
      <header className="bg-white fixed top-0 w-full z-50 border-b border-gray-200 flex items-center px-4 h-14 shadow-sm">
        <h1 className="text-base font-bold text-blue-700">Meus Pedidos</h1>
      </header>

      <div className="px-4 max-w-2xl mx-auto pt-2">
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
            <ClipboardList size={32} className="text-blue-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-500">Histórico de pedidos</p>
            <p className="text-sm mt-1">Em breve</p>
          </div>
        </div>
      </div>
    </>
  )
}
