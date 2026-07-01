import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatSetorDpara } from '@/types/mat'
import {
  ArrowLeft, ShoppingCart, Loader2, ClipboardList, Calendar,
  Package, RefreshCw, Plus, CheckCircle2,
} from 'lucide-react'

interface ItemPedido {
  id: number
  quantidade: number
  catalogo: {
    codigo_impakto: string
    descricao: string
    unidade: string
    preco_impakto: number | null
  } | null
}

interface Pedido {
  id: number
  competencia: string
  status: string
  created_at: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'text-gray-500 bg-gray-100' },
  refinamento: { label: 'Em refinamento', color: 'text-blue-600 bg-blue-50' },
  aguarda_aprovacao: { label: 'Aguarda aprovação', color: 'text-amber-600 bg-amber-50' },
  aprovado: { label: 'Aprovado', color: 'text-green-600 bg-green-50' },
  consolidado: { label: 'Consolidado', color: 'text-teal-600 bg-teal-50' },
  concluido: { label: 'Concluído', color: 'text-green-700 bg-green-100' },
  cancelado: { label: 'Cancelado', color: 'text-red-600 bg-red-50' },
}

function formatCompetencia(c: string): string {
  const [yyyy, mm] = c.split('-')
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${meses[parseInt(mm) - 1] ?? mm}/${yyyy}`
}

export default function NovoPedido() {
  const { setorId } = useParams()
  const navigate = useNavigate()

  const [setor, setSetor] = useState<MatSetorDpara | null>(null)
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [itens, setItens] = useState<ItemPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [semPedido, setSemPedido] = useState(false)

  useEffect(() => {
    async function carregar() {
      if (!setorId) return

      const { data: setorData } = await supabase
        .from('mat_setor_dpara')
        .select('*')
        .eq('id', setorId)
        .single()

      if (!setorData) { setLoading(false); return }
      setSetor(setorData)

      const { data: pedidos } = await supabase
        .from('mat_pedido')
        .select('id, competencia, status, created_at')
        .eq('setor_dpara_id', setorId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (!pedidos || pedidos.length === 0) {
        setSemPedido(true)
        setLoading(false)
        return
      }

      const ultimoPedido = pedidos[0]
      setPedido(ultimoPedido)

      const { data: itensData } = await supabase
        .from('mat_pedido_item')
        .select('id, quantidade, catalogo:catalogo_id(codigo_impakto, descricao, unidade, preco_impakto)')
        .eq('pedido_id', ultimoPedido.id)
        .order('id')

      setItens((itensData as unknown as ItemPedido[]) ?? [])
      setLoading(false)
    }
    carregar()
  }, [setorId])

  const totalPedido = itens.reduce((sum, item) => {
    const preco = item.catalogo?.preco_impakto ?? 0
    return sum + preco * item.quantidade
  }, 0)

  const statusInfo = pedido ? (STATUS_LABEL[pedido.status] ?? { label: pedido.status, color: 'text-gray-500 bg-gray-100' }) : null

  return (
    <>
      <header className="bg-white fixed top-0 w-full z-50 border-b border-gray-200 flex items-center gap-2 px-4 h-14 shadow-sm">
        <button
          onClick={() => navigate('/supervisora/setores')}
          className="p-2 rounded-full text-blue-700 hover:bg-blue-50 transition-colors active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-blue-700 truncate flex-1">
          {loading ? 'Carregando...' : (setor?.nome_externo ?? 'Pedido')}
        </h1>
        {setor && (
          <span className="text-xs text-gray-400 font-mono shrink-0">#{setor.codigo_externo}</span>
        )}
      </header>

      <div className="px-4 max-w-2xl mx-auto pt-2 pb-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 size={28} className="animate-spin text-blue-600" />
          </div>
        ) : semPedido ? (
          /* Nenhum pedido anterior */
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={32} className="text-blue-300" />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Nenhum pedido anterior</p>
              <p className="text-sm text-gray-400 mt-1">Este local ainda não possui histórico de pedidos.</p>
            </div>
            <button
              className="mt-2 flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-transform opacity-50 cursor-not-allowed"
              disabled
            >
              <Plus size={16} /> Fazer Primeiro Pedido
            </button>
            <p className="text-xs text-gray-400">Em desenvolvimento</p>
          </div>
        ) : (
          /* Último pedido */
          <div className="space-y-4">

            {/* Card de info do pedido */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
              style={{ boxShadow: '0px 4px 12px rgba(0, 122, 255, 0.06)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-500">
                  <ClipboardList size={16} />
                  <span className="text-sm font-semibold text-gray-700">Último pedido</span>
                </div>
                {statusInfo && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {pedido && formatCompetencia(pedido.competencia)}
                </span>
                <span className="flex items-center gap-1">
                  <Package size={12} />
                  {itens.length} {itens.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {totalPedido > 0 && (
                <div className="pt-1 border-t border-gray-100">
                  <p className="text-xs text-gray-400">Valor estimado</p>
                  <p className="text-lg font-bold text-blue-700">
                    {totalPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              )}
            </div>

            {/* Lista de itens */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              style={{ boxShadow: '0px 4px 12px rgba(0, 122, 255, 0.06)' }}>
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Itens do pedido</p>
              </div>
              <div className="divide-y divide-gray-50">
                {itens.map(item => (
                  <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 leading-snug line-clamp-2">
                        {item.catalogo?.descricao ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">{item.catalogo?.codigo_impakto}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-700">
                        {item.quantidade} <span className="font-normal text-gray-400">{item.catalogo?.unidade}</span>
                      </p>
                      {item.catalogo?.preco_impakto != null && (
                        <p className="text-xs text-gray-400">
                          {(item.catalogo.preco_impakto * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status concluído */}
            {pedido?.status === 'concluido' && (
              <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <CheckCircle2 size={14} className="shrink-0" />
                Este pedido foi concluído e entregue.
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-3 pt-2">
              <button
                disabled
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-400 text-sm font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <RefreshCw size={16} /> Repetir Pedido
              </button>
              <button
                disabled
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              >
                <Plus size={16} /> Novo Pedido
              </button>
            </div>
            <p className="text-center text-xs text-gray-400">Criação de pedidos em breve</p>
          </div>
        )}
      </div>
    </>
  )
}
