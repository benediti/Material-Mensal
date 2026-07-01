import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, Package, Loader2, FileText } from 'lucide-react'

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
  status: string
  centro_custo_id: number
  setor_nome: string
  setor_codigo: string
  total: number
  itens_count: number
  itens?: ItemPedido[]
  expanded?: boolean
}

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatComp(c: string) {
  const [yyyy, mm] = c.split('-')
  return `${MESES[parseInt(mm) - 1]}/${yyyy}`
}

const STATUS_STYLE: Record<string, string> = {
  concluido: 'text-green-700 bg-green-100',
  aprovado: 'text-green-600 bg-green-50',
  aguarda_aprovacao: 'text-amber-600 bg-amber-50',
  rascunho: 'text-gray-500 bg-gray-100',
  cancelado: 'text-red-600 bg-red-50',
}
const STATUS_LABEL: Record<string, string> = {
  concluido: 'Concluído',
  aprovado: 'Aprovado',
  aguarda_aprovacao: 'Aguarda aprovação',
  rascunho: 'Rascunho',
  cancelado: 'Cancelado',
}

export default function AdminPedidos() {
  const [competencias, setCompetencias] = useState<string[]>([])
  const [competencia, setCompetencia] = useState<string>('')
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loadingComp, setLoadingComp] = useState(true)
  const [loadingPedidos, setLoadingPedidos] = useState(false)
  const [loadingItens, setLoadingItens] = useState<number | null>(null)

  useEffect(() => {
    async function carregarCompetencias() {
      const { data } = await supabase
        .from('mat_pedido')
        .select('competencia')
        .order('competencia', { ascending: false })
      const uniq = [...new Set((data ?? []).map(r => r.competencia))]
      setCompetencias(uniq)
      if (uniq.length > 0) setCompetencia(uniq[0])
      setLoadingComp(false)
    }
    carregarCompetencias()
  }, [])

  useEffect(() => {
    if (!competencia) return
    async function carregarPedidos() {
      setLoadingPedidos(true)
      setPedidos([])

      const { data: pedidosData } = await supabase
        .from('mat_pedido')
        .select('id, status, centro_custo_id')
        .eq('competencia', competencia)
        .order('id')

      if (!pedidosData || pedidosData.length === 0) {
        setLoadingPedidos(false)
        return
      }

      const centroCustoIds = [...new Set(pedidosData.map(p => p.centro_custo_id))]
      const pedidoIds = pedidosData.map(p => p.id)

      const [{ data: setores }, { data: itensSumario }] = await Promise.all([
        supabase
          .from('mat_setor_dpara')
          .select('centro_custo_id, nome_externo, codigo_externo')
          .in('centro_custo_id', centroCustoIds),
        supabase
          .from('mat_pedido_item')
          .select('pedido_id, quantidade, catalogo:catalogo_id(preco_impakto)')
          .in('pedido_id', pedidoIds),
      ])

      const setorMap: Record<number, { nome: string; codigo: string }> = {}
      for (const s of setores ?? []) {
        setorMap[s.centro_custo_id] = { nome: s.nome_externo, codigo: s.codigo_externo }
      }

      const totaisPorPedido: Record<number, { total: number; count: number }> = {}
      for (const item of (itensSumario as any[]) ?? []) {
        const preco = item.catalogo?.preco_impakto ?? 0
        if (!totaisPorPedido[item.pedido_id]) totaisPorPedido[item.pedido_id] = { total: 0, count: 0 }
        totaisPorPedido[item.pedido_id].total += preco * item.quantidade
        totaisPorPedido[item.pedido_id].count += 1
      }

      const lista: Pedido[] = pedidosData.map(p => ({
        id: p.id,
        status: p.status,
        centro_custo_id: p.centro_custo_id,
        setor_nome: setorMap[p.centro_custo_id]?.nome ?? `Centro ${p.centro_custo_id}`,
        setor_codigo: setorMap[p.centro_custo_id]?.codigo ?? '—',
        total: totaisPorPedido[p.id]?.total ?? 0,
        itens_count: totaisPorPedido[p.id]?.count ?? 0,
        expanded: false,
      }))

      setPedidos(lista)
      setLoadingPedidos(false)
    }
    carregarPedidos()
  }, [competencia])

  async function toggleExpand(pedidoId: number) {
    const idx = pedidos.findIndex(p => p.id === pedidoId)
    if (idx === -1) return

    const pedido = pedidos[idx]

    if (pedido.expanded) {
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, expanded: false } : p))
      return
    }

    if (pedido.itens) {
      setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, expanded: true } : p))
      return
    }

    setLoadingItens(pedidoId)
    const { data } = await supabase
      .from('mat_pedido_item')
      .select('id, quantidade, catalogo:catalogo_id(codigo_impakto, descricao, unidade, preco_impakto)')
      .eq('pedido_id', pedidoId)
      .order('id')

    setPedidos(prev => prev.map(p =>
      p.id === pedidoId
        ? { ...p, expanded: true, itens: (data as unknown as ItemPedido[]) ?? [] }
        : p
    ))
    setLoadingItens(null)
  }

  const totalGeral = pedidos.reduce((s, p) => s + p.total, 0)
  const totalItens = pedidos.reduce((s, p) => s + p.itens_count, 0)

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Relatório de Pedidos</h2>

      {loadingComp ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
      ) : competencias.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum pedido importado ainda.</p>
        </div>
      ) : (
        <>
          {/* Filtro de competência */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {competencias.map(c => (
              <button
                key={c}
                onClick={() => setCompetencia(c)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  c === competencia
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {formatComp(c)}
              </button>
            ))}
          </div>

          {/* Resumo */}
          {!loadingPedidos && pedidos.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pedidos', valor: pedidos.length, cor: 'text-blue-700 bg-blue-50' },
                { label: 'Itens', valor: totalItens, cor: 'text-gray-700 bg-gray-50' },
                { label: 'Total estimado', valor: totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), cor: 'text-green-700 bg-green-50' },
              ].map(({ label, valor, cor }) => (
                <div key={label} className={`rounded-xl p-3 text-center ${cor}`}>
                  <p className="text-base font-bold">{valor}</p>
                  <p className="text-xs mt-0.5 opacity-70">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Lista */}
          {loadingPedidos ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
          ) : pedidos.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Nenhum pedido em {formatComp(competencia)}</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              style={{ boxShadow: '0px 4px 12px rgba(0,122,255,0.06)' }}>
              {pedidos.map((pedido, i) => (
                <div key={pedido.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
                  {/* Linha do pedido */}
                  <button
                    onClick={() => toggleExpand(pedido.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="shrink-0 text-gray-400">
                      {loadingItens === pedido.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : pedido.expanded
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{pedido.setor_nome}</p>
                      <p className="text-xs text-gray-400">
                        Cód. {pedido.setor_codigo} · {pedido.itens_count} {pedido.itens_count === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      {pedido.total > 0 && (
                        <p className="text-sm font-bold text-gray-700">
                          {pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[pedido.status] ?? 'text-gray-500 bg-gray-100'}`}>
                        {STATUS_LABEL[pedido.status] ?? pedido.status}
                      </span>
                    </div>
                  </button>

                  {/* Itens expandidos */}
                  {pedido.expanded && pedido.itens && (
                    <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                      {pedido.itens.length === 0 ? (
                        <p className="px-8 py-3 text-xs text-gray-400">Nenhum item registrado</p>
                      ) : (
                        pedido.itens.map(item => (
                          <div key={item.id} className="px-8 py-2.5 flex items-center gap-3">
                            <Package size={12} className="text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-700 leading-snug line-clamp-2">
                                {item.catalogo?.descricao ?? '—'}
                              </p>
                              <p className="text-xs text-gray-400 font-mono">{item.catalogo?.codigo_impakto}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs font-semibold text-gray-600">
                                {item.quantidade} {item.catalogo?.unidade}
                              </p>
                              {item.catalogo?.preco_impakto != null && (
                                <p className="text-xs text-gray-400">
                                  {(item.catalogo.preco_impakto * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
