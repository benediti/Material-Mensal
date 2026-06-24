import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatCatalogo } from '@/types/mat'
import {
  Search,
  ImageOff,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
} from 'lucide-react'

// ─── helpers ─────────────────────────────────────────────────────────────────
const CATEGORIAS_LABEL: Record<string, string> = {
  limpeza: 'Limpeza',
  higiene: 'Higiene',
  escritorio: 'Escritório',
  epi: 'EPI',
  manutencao: 'Manutenção',
  copa: 'Copa / Cozinha',
  uniforme: 'Uniforme',
  outros: 'Outros',
}

type SortField = 'codigo_impakto' | 'descricao' | 'categoria'
type SortDir = 'asc' | 'desc'

// ─── componente ──────────────────────────────────────────────────────────────
export default function Catalogo() {
  const [itens, setItens] = useState<MatCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // filtros
  const [busca, setBusca] = useState('')
  const [categoriaSel, setCategoriaSel] = useState('todas')
  const [statusSel, setStatusSel] = useState<'todos' | 'ativo' | 'inativo'>('todos')

  // ordenação
  const [sortField, setSortField] = useState<SortField>('codigo_impakto')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // toggling
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  // modal foto (futuro)
  const [fotoModal, setFotoModal] = useState<MatCatalogo | null>(null)

  // ── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setErro(null)
      const { data, error } = await supabase
        .from('mat_catalogo')
        .select('*')
        .order('codigo_impakto', { ascending: true })

      if (error) {
        setErro('Erro ao carregar catálogo: ' + error.message)
      } else {
        setItens(data ?? [])
      }
      setLoading(false)
    }
    carregar()
  }, [])

  // ── toggle ativo/inativo ───────────────────────────────────────────────────
  async function toggleAtivo(item: MatCatalogo) {
    if (toggling.has(item.id)) return
    setToggling(prev => new Set(prev).add(item.id))

    const novoAtivo = !item.ativo
    const { error } = await supabase
      .from('mat_catalogo')
      .update({ ativo: novoAtivo, updated_at: new Date().toISOString() })
      .eq('id', item.id)

    if (!error) {
      setItens(prev =>
        prev.map(i => (i.id === item.id ? { ...i, ativo: novoAtivo } : i))
      )
    }
    setToggling(prev => {
      const next = new Set(prev)
      next.delete(item.id)
      return next
    })
  }

  // ── categorias disponíveis ─────────────────────────────────────────────────
  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set(itens.map(i => i.categoria ?? 'outros'))
    return Array.from(cats).sort()
  }, [itens])

  // ── lista filtrada e ordenada ──────────────────────────────────────────────
  const itensFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return itens
      .filter(i => {
        if (categoriaSel !== 'todas' && (i.categoria ?? 'outros') !== categoriaSel) return false
        if (statusSel === 'ativo' && !i.ativo) return false
        if (statusSel === 'inativo' && i.ativo) return false
        if (q) {
          return (
            i.codigo_impakto.toLowerCase().includes(q) ||
            i.descricao.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        const av = (a[sortField] ?? '').toLowerCase()
        const bv = (b[sortField] ?? '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [itens, busca, categoriaSel, statusSel, sortField, sortDir])

  // ── contadores ─────────────────────────────────────────────────────────────
  const totalAtivos = itens.filter(i => i.ativo).length
  const totalInativos = itens.length - totalAtivos

  // ── sort helper ────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-primary" />
    ) : (
      <ChevronDown size={12} className="text-primary" />
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">
      {/* ── Topo / filtros ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 space-y-3 sticky top-[52px] z-10">
        {/* Busca */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Buscar código ou descrição…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>

        {/* Filtros linha */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {/* Categoria */}
          <select
            value={categoriaSel}
            onChange={e => setCategoriaSel(e.target.value)}
            className="shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todas">Todas categorias</option>
            {categoriasDisponiveis.map(c => (
              <option key={c} value={c}>
                {CATEGORIAS_LABEL[c] ?? c}
              </option>
            ))}
          </select>

          {/* Status */}
          {(['todos', 'ativo', 'inativo'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusSel(s)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                statusSel === s
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {s === 'todos' ? 'Todos' : s === 'ativo' ? `Ativos (${totalAtivos})` : `Inativos (${totalInativos})`}
            </button>
          ))}
        </div>

        {/* Contador resultado */}
        <p className="text-xs text-gray-400">
          {itensFiltrados.length} de {itens.length} itens
        </p>
      </div>

      {/* ── Estado de erro ── */}
      {erro && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {erro}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {/* ── Tabela ── */}
      {!loading && (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {/* Foto */}
                <th className="w-12 px-3 py-2.5"></th>

                {/* Código */}
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('codigo_impakto')}
                >
                  <span className="flex items-center gap-1">
                    Código <SortIcon field="codigo_impakto" />
                  </span>
                </th>

                {/* Descrição */}
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none"
                  onClick={() => toggleSort('descricao')}
                >
                  <span className="flex items-center gap-1">
                    Descrição <SortIcon field="descricao" />
                  </span>
                </th>

                {/* Categoria */}
                <th
                  className="hidden sm:table-cell px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('categoria')}
                >
                  <span className="flex items-center gap-1">
                    Categoria <SortIcon field="categoria" />
                  </span>
                </th>

                {/* UN */}
                <th className="hidden sm:table-cell px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  UN
                </th>

                {/* Ativo */}
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Ativo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum item encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}

              {itensFiltrados.map(item => (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    item.ativo ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/60 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Thumb foto */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setFotoModal(item)}
                      title="Gerenciar foto"
                      className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 hover:border-primary transition-colors"
                    >
                      {item.foto_thumb_url ? (
                        <img
                          src={item.foto_thumb_url}
                          alt={item.descricao}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageOff size={14} className="text-gray-300" />
                      )}
                    </button>
                  </td>

                  {/* Código */}
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">
                    {item.codigo_impakto}
                  </td>

                  {/* Descrição */}
                  <td className="px-3 py-2 text-gray-800 text-xs leading-snug">
                    {item.descricao}
                  </td>

                  {/* Categoria */}
                  <td className="hidden sm:table-cell px-3 py-2">
                    {item.categoria ? (
                      <span className="inline-block bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full">
                        {CATEGORIAS_LABEL[item.categoria] ?? item.categoria}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>

                  {/* Unidade */}
                  <td className="hidden sm:table-cell px-3 py-2 text-xs text-gray-500 uppercase">
                    {item.unidade}
                  </td>

                  {/* Toggle ativo */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleAtivo(item)}
                      disabled={toggling.has(item.id)}
                      title={item.ativo ? 'Desativar item' : 'Ativar item'}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                      aria-label={item.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {toggling.has(item.id) ? (
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                      ) : item.ativo ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <XCircle size={18} className="text-gray-300" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal foto (placeholder para upload futuro) ── */}
      {fotoModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0"
          onClick={() => setFotoModal(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-mono">{fotoModal.codigo_impakto}</p>
                <h3 className="text-sm font-semibold text-gray-800 mt-0.5 leading-snug">
                  {fotoModal.descricao}
                </h3>
              </div>
              <button
                onClick={() => setFotoModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Prévia */}
            <div className="w-full aspect-square rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden">
              {fotoModal.foto_thumb_url ? (
                <img
                  src={fotoModal.foto_thumb_url}
                  alt={fotoModal.descricao}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-300">
                  <ImageOff size={40} />
                  <span className="text-xs">Sem foto</span>
                </div>
              )}
            </div>

            {/* Upload — em breve */}
            <button
              disabled
              className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
            >
              📎 Upload de foto — em breve
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
