import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, Package, Loader2, FileText, Printer } from 'lucide-react'

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

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_CURTO = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatComp(c: string, curto = true) {
  const [yyyy, mm] = c.split('-')
  const lista = curto ? MESES_CURTO : MESES
  return `${lista[parseInt(mm) - 1]}/${yyyy}`
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
  const [preparandoImpressao, setPreparandoImpressao] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

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
    const pedido = pedidos.find(p => p.id === pedidoId)
    if (!pedido) return

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

  async function imprimir() {
    setPreparandoImpressao(true)

    // Carrega itens de todos os pedidos que ainda não têm
    const semItens = pedidos.filter(p => !p.itens)
    if (semItens.length > 0) {
      const ids = semItens.map(p => p.id)
      const { data } = await supabase
        .from('mat_pedido_item')
        .select('id, pedido_id, quantidade, catalogo:catalogo_id(codigo_impakto, descricao, unidade, preco_impakto)')
        .in('pedido_id', ids)
        .order('pedido_id')

      const itensPorPedido: Record<number, ItemPedido[]> = {}
      for (const item of (data as any[]) ?? []) {
        if (!itensPorPedido[item.pedido_id]) itensPorPedido[item.pedido_id] = []
        itensPorPedido[item.pedido_id].push(item)
      }

      setPedidos(prev => prev.map(p => ({
        ...p,
        itens: p.itens ?? itensPorPedido[p.id] ?? [],
        expanded: true,
      })))
    } else {
      setPedidos(prev => prev.map(p => ({ ...p, expanded: true })))
    }

    setPreparandoImpressao(false)
    setTimeout(() => window.print(), 100)
  }

  const totalGeral = pedidos.reduce((s, p) => s + p.total, 0)
  const totalItens = pedidos.reduce((s, p) => s + p.itens_count, 0)
  const dataImpressao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <>
      {/* CSS de impressão inline */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: fixed; inset: 0; padding: 24px; font-family: sans-serif; }
          .no-print { display: none !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="p-4 space-y-4">
        {/* Cabeçalho da página */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Relatório de Pedidos</h2>
          {pedidos.length > 0 && !loadingPedidos && (
            <button
              onClick={imprimir}
              disabled={preparandoImpressao}
              className="no-print flex items-center gap-2 bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {preparandoImpressao
                ? <Loader2 size={15} className="animate-spin" />
                : <Printer size={15} />}
              {preparandoImpressao ? 'Preparando...' : 'Imprimir / PDF'}
            </button>
          )}
        </div>

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
            <div className="no-print flex gap-2 overflow-x-auto pb-1">
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
              <div className="grid grid-cols-3 gap-3 no-print">
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

            {/* Lista interativa */}
            {loadingPedidos ? (
              <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
            ) : pedidos.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">Nenhum pedido em {formatComp(competencia)}</p>
            ) : (
              <>
                {/* Área de impressão — oculta na tela, visível no print */}
                <div id="print-area" ref={printRef} className="hidden print:block">
                  <div style={{ marginBottom: 20, borderBottom: '2px solid #1d4ed8', paddingBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#6b7280', marginBottom: 2 }}>EQUIPPE · MATERIAL MENSAL</p>
                        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e40af', margin: 0 }}>
                          Relatório de Pedidos — {formatComp(competencia, false)}
                        </h1>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 10, color: '#6b7280' }}>
                        <p>Emitido em {dataImpressao}</p>
                        <p>{pedidos.length} pedidos · {totalItens} itens</p>
                        <p style={{ fontWeight: 700, color: '#166534', fontSize: 12 }}>
                          Total: {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {pedidos.map((pedido) => (
                    <div key={pedido.id} className="print-break" style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: '#eff6ff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 12, color: '#1e3a8a', margin: 0 }}>{pedido.setor_nome}</p>
                          <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Cód. {pedido.setor_codigo} · {pedido.itens_count} itens</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 700, fontSize: 13, color: '#1e3a8a', margin: 0 }}>
                            {pedido.total > 0 ? pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                          </p>
                          <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{STATUS_LABEL[pedido.status] ?? pedido.status}</p>
                        </div>
                      </div>
                      {pedido.itens && pedido.itens.length > 0 && (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                          <thead>
                            <tr style={{ background: '#f9fafb' }}>
                              <th style={{ padding: '4px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Produto</th>
                              <th style={{ padding: '4px 10px', textAlign: 'center', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: 60 }}>Qtd</th>
                              <th style={{ padding: '4px 10px', textAlign: 'center', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: 50 }}>Un</th>
                              <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: 80 }}>Vlr Unit</th>
                              <th style={{ padding: '4px 10px', textAlign: 'right', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: 80 }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pedido.itens.map((item, idx) => (
                              <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                                <td style={{ padding: '4px 10px', color: '#374151', borderBottom: '1px solid #f3f4f6' }}>
                                  {item.catalogo?.descricao ?? '—'}
                                  <span style={{ color: '#9ca3af', marginLeft: 6, fontFamily: 'monospace' }}>{item.catalogo?.codigo_impakto}</span>
                                </td>
                                <td style={{ padding: '4px 10px', textAlign: 'center', fontWeight: 600, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>{item.quantidade}</td>
                                <td style={{ padding: '4px 10px', textAlign: 'center', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>{item.catalogo?.unidade}</td>
                                <td style={{ padding: '4px 10px', textAlign: 'right', color: '#6b7280', borderBottom: '1px solid #f3f4f6' }}>
                                  {item.catalogo?.preco_impakto != null
                                    ? item.catalogo.preco_impakto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    : '—'}
                                </td>
                                <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 600, color: '#111827', borderBottom: '1px solid #f3f4f6' }}>
                                  {item.catalogo?.preco_impakto != null
                                    ? (item.catalogo.preco_impakto * item.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: '#eff6ff' }}>
                              <td colSpan={4} style={{ padding: '5px 10px', fontWeight: 700, fontSize: 11, color: '#1e3a8a', textAlign: 'right' }}>Subtotal</td>
                              <td style={{ padding: '5px 10px', fontWeight: 700, fontSize: 11, color: '#1e3a8a', textAlign: 'right' }}>
                                {pedido.total > 0 ? pedido.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      )}
                    </div>
                  ))}

                  {/* Rodapé do relatório */}
                  <div style={{ marginTop: 24, borderTop: '2px solid #1d4ed8', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280' }}>
                    <p>Equippe · Sistema de Material Mensal</p>
                    <p style={{ fontWeight: 700, color: '#166534', fontSize: 13 }}>
                      TOTAL GERAL: {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                {/* Lista interativa (visível na tela) */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden no-print"
                  style={{ boxShadow: '0px 4px 12px rgba(0,122,255,0.06)' }}>
                  {pedidos.map((pedido, i) => (
                    <div key={pedido.id} className={i > 0 ? 'border-t border-gray-100' : ''}>
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
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
