import { useEffect, useState, useMemo, useRef } from 'react'
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
  Upload,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react'

// ─── Constantes ────────────────────────────────────────────────────────────────
const BUCKET = 'mat-fotos'

const CATEGORIAS: { value: string; label: string }[] = [
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'higiene', label: 'Higiene' },
  { value: 'escritorio', label: 'Escritório' },
  { value: 'epi', label: 'EPI' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'copa', label: 'Copa / Cozinha' },
  { value: 'uniforme', label: 'Uniforme' },
  { value: 'outros', label: 'Outros' },
]

const UNIDADES = ['UN', 'CX', 'PCT', 'RL', 'FR', 'KG', 'L', 'PAR', 'JG', 'SC', 'BD', 'TB']

const CATEGORIAS_MAP = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label]))

type SortField = 'codigo_impakto' | 'descricao' | 'categoria'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'todos' | 'ativo' | 'inativo'

// ─── Tipos internos ─────────────────────────────────────────────────────────────
interface EditState {
  categoria: string
  unidade: string
}

// ─── Componente principal ───────────────────────────────────────────────────────
export default function Catalogo() {
  const [itens, setItens] = useState<MatCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // filtros
  const [busca, setBusca] = useState('')
  const [categoriaSel, setCategoriaSel] = useState('todas')
  const [statusSel, setStatusSel] = useState<StatusFilter>('todos')

  // ordenação
  const [sortField, setSortField] = useState<SortField>('codigo_impakto')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // operações em andamento
  const [toggling, setToggling] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<Set<number>>(new Set())

  // edição inline
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ categoria: '', unidade: '' })

  // modal foto
  const [fotoModal, setFotoModal] = useState<MatCatalogo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    setLoading(true)
    setErro(null)
    const { data, error } = await supabase
      .from('mat_catalogo')
      .select('*')
      .order('codigo_impakto', { ascending: true })

    if (error) setErro('Erro ao carregar catálogo: ' + error.message)
    else setItens(data ?? [])
    setLoading(false)
  }

  // ── toggle ativo ───────────────────────────────────────────────────────────
  async function toggleAtivo(item: MatCatalogo) {
    if (toggling.has(item.id)) return
    setToggling(prev => new Set(prev).add(item.id))
    const novoAtivo = !item.ativo
    const { error } = await supabase
      .from('mat_catalogo')
      .update({ ativo: novoAtivo, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (!error) setItens(prev => prev.map(i => i.id === item.id ? { ...i, ativo: novoAtivo } : i))
    setToggling(prev => { const n = new Set(prev); n.delete(item.id); return n })
  }

  // ── edição inline ──────────────────────────────────────────────────────────
  function iniciarEdicao(item: MatCatalogo) {
    setEditingId(item.id)
    setEditState({ categoria: item.categoria ?? 'outros', unidade: item.unidade })
  }

  function cancelarEdicao() {
    setEditingId(null)
    setEditState({ categoria: '', unidade: '' })
  }

  async function salvarEdicao(item: MatCatalogo) {
    if (saving.has(item.id)) return
    setSaving(prev => new Set(prev).add(item.id))
    const { error } = await supabase
      .from('mat_catalogo')
      .update({
        categoria: editState.categoria || null,
        unidade: editState.unidade,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
    if (!error) {
      setItens(prev =>
        prev.map(i =>
          i.id === item.id
            ? { ...i, categoria: editState.categoria || null, unidade: editState.unidade }
            : i
        )
      )
      setEditingId(null)
    }
    setSaving(prev => { const n = new Set(prev); n.delete(item.id); return n })
  }

  // ── upload de foto ─────────────────────────────────────────────────────────
  function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErro(null)

    // validação
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadErro('Somente JPG, PNG ou WEBP são aceitos.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadErro('Arquivo deve ter menos de 5 MB.')
      return
    }

    setUploadFile(file)
    const url = URL.createObjectURL(file)
    setUploadPreview(url)
  }

  async function confirmarUpload() {
    if (!uploadFile || !fotoModal || uploading) return
    setUploading(true)
    setUploadErro(null)

    const ext = uploadFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const storagePath = `catalogo/${fotoModal.id}_${fotoModal.codigo_impakto}.${ext}`

    // 1. upsert no bucket
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, uploadFile, { upsert: true, contentType: uploadFile.type })

    if (upErr) {
      setUploadErro('Erro no upload: ' + upErr.message)
      setUploading(false)
      return
    }

    // 2. gerar URL pública/assinada para thumb
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const thumbUrl = urlData?.publicUrl ?? null

    // 3. atualizar registro no banco
    const { error: dbErr } = await supabase
      .from('mat_catalogo')
      .update({
        foto_storage_path: storagePath,
        foto_thumb_url: thumbUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fotoModal.id)

    if (dbErr) {
      setUploadErro('Foto enviada mas erro ao salvar no banco: ' + dbErr.message)
      setUploading(false)
      return
    }

    // 4. atualizar estado local
    const itemAtualizado = {
      ...fotoModal,
      foto_storage_path: storagePath,
      foto_thumb_url: thumbUrl,
    }
    setItens(prev => prev.map(i => i.id === fotoModal.id ? itemAtualizado : i))
    setFotoModal(itemAtualizado)
    setUploadFile(null)
    setUploadPreview(null)
    setUploading(false)
  }

  async function removerFoto() {
    if (!fotoModal?.foto_storage_path || uploading) return
    setUploading(true)
    setUploadErro(null)

    // 1. remover do storage
    await supabase.storage.from(BUCKET).remove([fotoModal.foto_storage_path])

    // 2. limpar no banco
    const { error } = await supabase
      .from('mat_catalogo')
      .update({ foto_storage_path: null, foto_thumb_url: null, updated_at: new Date().toISOString() })
      .eq('id', fotoModal.id)

    if (!error) {
      const itemAtualizado = { ...fotoModal, foto_storage_path: null, foto_thumb_url: null }
      setItens(prev => prev.map(i => i.id === fotoModal.id ? itemAtualizado : i))
      setFotoModal(itemAtualizado)
    }
    setUploading(false)
  }

  function abrirModal(item: MatCatalogo) {
    setFotoModal(item)
    setUploadFile(null)
    setUploadPreview(null)
    setUploadErro(null)
  }

  function fecharModal() {
    if (uploading) return
    setFotoModal(null)
    setUploadFile(null)
    setUploadPreview(null)
    setUploadErro(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── dados derivados ────────────────────────────────────────────────────────
  const categoriasDisponiveis = useMemo(() => {
    const cats = new Set(itens.map(i => i.categoria ?? 'outros'))
    return Array.from(cats).sort()
  }, [itens])

  const totalAtivos = itens.filter(i => i.ativo).length
  const totalInativos = itens.length - totalAtivos
  const comFoto = itens.filter(i => !!i.foto_thumb_url).length

  const itensFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return itens
      .filter(i => {
        if (categoriaSel !== 'todas' && (i.categoria ?? 'outros') !== categoriaSel) return false
        if (statusSel === 'ativo' && !i.ativo) return false
        if (statusSel === 'inativo' && i.ativo) return false
        if (q) return i.codigo_impakto.toLowerCase().includes(q) || i.descricao.toLowerCase().includes(q)
        return true
      })
      .sort((a, b) => {
        const av = (a[sortField] ?? '').toLowerCase()
        const bv = (b[sortField] ?? '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [itens, busca, categoriaSel, statusSel, sortField, sortDir])

  // ── sort ───────────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-primary" />
      : <ChevronDown size={12} className="text-primary" />
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full">

      {/* ── Filtros ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 space-y-3 sticky top-[52px] z-10">
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

        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <select
            value={categoriaSel}
            onChange={e => setCategoriaSel(e.target.value)}
            className="shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todas">Todas categorias</option>
            {categoriasDisponiveis.map(c => (
              <option key={c} value={c}>{CATEGORIAS_MAP[c] ?? c}</option>
            ))}
          </select>

          {(['todos', 'ativo', 'inativo'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusSel(s)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                statusSel === s ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {s === 'todos' ? 'Todos' : s === 'ativo' ? `Ativos (${totalAtivos})` : `Inativos (${totalInativos})`}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{itensFiltrados.length} de {itens.length} itens</span>
          <span>{comFoto} com foto</span>
        </div>
      </div>

      {/* ── Erro ── */}
      {erro && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{erro}</div>
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
                <th className="w-12 px-3 py-2.5"></th>
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('codigo_impakto')}
                >
                  <span className="flex items-center gap-1">Código <SortIcon field="codigo_impakto" /></span>
                </th>
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none"
                  onClick={() => toggleSort('descricao')}
                >
                  <span className="flex items-center gap-1">Descrição <SortIcon field="descricao" /></span>
                </th>
                <th
                  className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort('categoria')}
                >
                  <span className="flex items-center gap-1">Categoria <SortIcon field="categoria" /></span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  UN
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Ativo
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {itensFiltrados.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Nenhum item encontrado.
                  </td>
                </tr>
              )}

              {itensFiltrados.map(item => {
                const isEditing = editingId === item.id
                const isSaving = saving.has(item.id)

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.ativo ? 'bg-white hover:bg-gray-50/80' : 'bg-gray-50/60 opacity-60 hover:opacity-80'
                    }`}
                  >
                    {/* Thumb */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => abrirModal(item)}
                        title="Gerenciar foto"
                        className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 hover:border-primary transition-colors"
                      >
                        {item.foto_thumb_url ? (
                          <img src={item.foto_thumb_url} alt={item.descricao} className="w-full h-full object-cover" loading="lazy" />
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

                    {/* Categoria — inline edit */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={editState.categoria}
                          onChange={e => setEditState(s => ({ ...s, categoria: e.target.value }))}
                          className="text-xs border border-primary rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                          autoFocus
                        >
                          {CATEGORIAS.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      ) : item.categoria ? (
                        <span
                          onClick={() => iniciarEdicao(item)}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors group"
                          title="Clique para editar"
                        >
                          {CATEGORIAS_MAP[item.categoria] ?? item.categoria}
                          <Pencil size={9} className="opacity-0 group-hover:opacity-60" />
                        </span>
                      ) : (
                        <button
                          onClick={() => iniciarEdicao(item)}
                          className="text-xs text-gray-300 hover:text-primary transition-colors"
                          title="Definir categoria"
                        >
                          + categoria
                        </button>
                      )}
                    </td>

                    {/* Unidade — inline edit */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <select
                          value={editState.unidade}
                          onChange={e => setEditState(s => ({ ...s, unidade: e.target.value }))}
                          className="text-xs border border-primary rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-20"
                        >
                          {UNIDADES.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={() => iniciarEdicao(item)}
                          className="text-xs text-gray-500 uppercase cursor-pointer hover:text-primary transition-colors"
                          title="Clique para editar"
                        >
                          {item.unidade}
                        </span>
                      )}
                    </td>

                    {/* Ativo + ações edição */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => salvarEdicao(item)}
                            disabled={isSaving}
                            className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-40"
                            aria-label="Salvar"
                          >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={cancelarEdicao}
                            disabled={isSaving}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40"
                            aria-label="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleAtivo(item)}
                            disabled={toggling.has(item.id)}
                            title={item.ativo ? 'Desativar' : 'Ativar'}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                            aria-label={item.ativo ? 'Desativar' : 'Ativar'}
                          >
                            {toggling.has(item.id)
                              ? <Loader2 size={15} className="animate-spin text-gray-400" />
                              : item.ativo
                                ? <CheckCircle2 size={17} className="text-green-500" />
                                : <XCircle size={17} className="text-gray-300" />
                            }
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal Foto ── */}
      {fotoModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={fecharModal}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-mono">{fotoModal.codigo_impakto}</p>
                <h3 className="text-sm font-semibold text-gray-800 mt-0.5 leading-snug max-w-[260px]">
                  {fotoModal.descricao}
                </h3>
              </div>
              <button
                onClick={fecharModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Prévia */}
            <div
              className="w-full aspect-square rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden relative cursor-pointer group"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploadPreview ? (
                <img src={uploadPreview} alt="prévia" className="w-full h-full object-contain" />
              ) : fotoModal.foto_thumb_url ? (
                <>
                  <img src={fotoModal.foto_thumb_url} alt={fotoModal.descricao} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload size={28} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-primary transition-colors">
                  <Upload size={32} />
                  <span className="text-xs font-medium">Toque para selecionar foto</span>
                  <span className="text-xs text-gray-300">JPG · PNG · WEBP · máx 5 MB</span>
                </div>
              )}
            </div>

            {/* Input file oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={onArquivoSelecionado}
            />

            {/* Erro upload */}
            {uploadErro && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{uploadErro}</p>
            )}

            {/* Ações */}
            <div className="flex gap-2">
              {/* Confirmar upload */}
              {uploadFile && (
                <button
                  onClick={confirmarUpload}
                  disabled={uploading}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {uploading
                    ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
                    : <><Upload size={16} /> Salvar foto</>
                  }
                </button>
              )}

              {/* Selecionar / trocar */}
              {!uploadFile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Upload size={16} />
                  {fotoModal.foto_thumb_url ? 'Trocar foto' : 'Selecionar foto'}
                </button>
              )}

              {/* Remover */}
              {fotoModal.foto_thumb_url && !uploadFile && (
                <button
                  onClick={removerFoto}
                  disabled={uploading}
                  className="px-4 py-3 rounded-xl bg-red-50 text-red-500 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-100 transition-colors"
                  aria-label="Remover foto"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              )}

              {/* Cancelar seleção */}
              {uploadFile && (
                <button
                  onClick={() => { setUploadFile(null); setUploadPreview(null); setUploadErro(null) }}
                  disabled={uploading}
                  className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold disabled:opacity-60"
                  aria-label="Cancelar seleção"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
