import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatSetorDpara } from '@/types/mat'
import { ArrowLeft, ShoppingCart, Loader2 } from 'lucide-react'

export default function NovoPedido() {
  const { setorId } = useParams()
  const navigate = useNavigate()
  const [setor, setSetor] = useState<MatSetorDpara | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      if (!setorId) return
      const { data } = await supabase
        .from('mat_setor_dpara')
        .select('*')
        .eq('id', setorId)
        .single()
      setSetor(data)
      setLoading(false)
    }
    carregar()
  }, [setorId])

  return (
    <>
      <header className="bg-white fixed top-0 w-full z-50 border-b border-gray-200 flex items-center gap-2 px-4 h-14 shadow-sm">
        <button
          onClick={() => navigate('/supervisora/setores')}
          className="p-2 rounded-full text-blue-700 hover:bg-blue-50 transition-colors active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-blue-700 truncate">
          {loading ? 'Carregando...' : (setor?.nome_externo ?? 'Pedido')}
        </h1>
      </header>

      <div className="px-4 max-w-2xl mx-auto pt-2">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={28} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={32} className="text-blue-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-500">Montar pedido</p>
              <p className="text-sm mt-1 text-gray-400">{setor?.nome_externo}</p>
              <p className="text-xs mt-3 text-blue-400">Em desenvolvimento</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
