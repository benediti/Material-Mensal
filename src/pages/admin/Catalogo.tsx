import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatCatalogo } from '@/types/mat'
import {
  Search, ImageOff, CheckCircle2, XCircle, ChevronUp, ChevronDown,
  Loader2, Upload, Trash2, Pencil, Check, X, FileText, Plus,
} from 'lucide-react'

const BUCKET = 'mat-fotos'

// Redimensiona para no máximo 800px no lado maior e converte para WebP
function comprimirImagem(file: File, maxDim = 800, quality = 0.82): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error('Falha ao comprimir imagem')); return }
          resolve({ blob, previewUrl: URL.createObjectURL(blob) })
        },
        'image/webp',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Falha ao carregar imagem')) }
    img.src = objectUrl
  })
}

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

interface EditState {
  categoria: string
  unidade: string
}

// ─── Drawer edição / criação do produto ────────────────────────────────────────
interface DrawerEditProps {
  item: MatCatalogo | null   // null = modo criação
  onClose: () => void
  onSaved: (updated: MatCatalogo) => void
}

function DrawerProduto({ item, onClose, onSaved }: DrawerEditProps) {
  const isNew = item === null

  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState(isNew ? '' : (item.nome_custom ?? item.descricao))
  const [uso, setUso] = useState(isNew ? '' : (item.descricao_uso ?? ''))
  const [categoria, setCategoria] = useState(isNew ? 'outros' : (item.categoria ?? 'outros'))
  const [unidade, setUnidade] = useState(isNew ? 'UN' : item.unidade)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (isNew && !codigo.trim()) { setErro('Informe o código do produto.'); return }
    if (!nome.trim()) { setErro('Informe o nome do produto.'); return }

    setSaving(true)
    setErro(null)

    if (isNew) {
      // Verifica código duplicado
      const { data: exist } = await supabase
        .from('mat_catalogo')
        .select('id')
        .eq('codigo_impakto', codigo.trim().toUpperCase())
        .maybeSingle()
      if (exist) { setErro('Já existe um produto com esse código.'); setSaving(false); return }

      const { data, error } = await supabase
        .from('mat_catalogo')
        .insert({
          codigo_impakto: codigo.trim().toUpperCase(),
          descricao: nome.trim(),
          nome_custom: nome.trim(),
          descricao_uso: uso.trim() || null,
          categoria: categoria || null,
          unidade,
          ativo: true,
        })
        .select()
        .single()

      if (error) { setErro('Erro ao criar: ' + error.message); setSaving(false); return }
      onSaved(data)
    } else {
      const { error } = await supabase
        .from('mat_catalogo')
        .update({
          nome_custom: nome.trim() || null,
          descricao_uso: uso.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      if (error) { setErro('Erro ao salvar: ' + error.message); setSaving(false); return }
      onSaved({ ...item, nome_custom: nome.trim() || null, descricao_uso: uso.trim() || null })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">
              {isNew ? '➕ Novo produto' : 'Editar produto'}
            </h2>
            {!isNew && (
              <p className="text-xs text-gray-400 font-mono mt-0.5">{item.codigo_impakto}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1" aria-label="Fechar">×</button>
        </div>

        {/* Código — somente no modo criação */}
        {isNew && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Código do produto <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={codigo}
              onChange={e => setCodigo(e.target.value.toUpperCase())}
              maxLength={30}
              placeholder="Ex: LIM-001"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
        )}

        {/* Nome */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Nome do produto <span className="text-red-400">*</span>
            {!isNew && <span className="ml-1 font-normal text-gray-400">(como aparece para as supervisoras)</span>}
          </label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            maxLength={120}
            placeholder={isNew ? 'Ex: Detergente Neutro 500ml' : item.descricao}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
          <p className="text-right text-xs text-gray-300 mt-0.5">{nome.length}/120</p>
        </div>

        {/* Descrição de uso */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Descrição de uso
            <span className="ml-1 font-normal text-gray-400">(dica de como/quando usar)</span>
          </label>
          <textarea
            value={uso}
            onChange={e => setUso(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Ex: Usar somente em banheiros. Diluir 1 parte em 10 de água."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
          />
          <p className="text-right text-xs text-gray-300 mt-0.5">{uso.length}/300</p>
        </div>

        {/* Categoria + Unidade — somente no modo criação */}
        {isNew && (
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Unidade</label>
              <select
                value={unidade}
                onChange={e => setUnidade(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              >
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Erro */}
        {erro && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}

        {/* Ações */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving
              ? <><Loader2 size={16} className="animate-spin" /> Salvando…</>
              : isNew
                ? <><Plus size={16} /> Criar produto</>
                : <><Check size={16} /> Salvar</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────────
export default function Catalogo() {
  const [itens, setItens] = useState<MatCatalogo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const [busca, setBusca] = useState('')
  const [categoriaSel, setCategoriaSel] = useState('todas')
  const [statusSel, setStatusSel] = useState<StatusFilter>('todos')
  const [sortField, setSortField] = useState<SortField>('codigo_impakto')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [toggling, setToggling] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState<Set<number>>(new Set())

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ categoria: '', unidade: '' })

  // Drawer edição/criação — null = fechado, 'new' = novo, MatCatalogo = editar
  const [drawerItem, setDrawerItem] = useState<MatCatalogo | 'new' | null>(null)

  // Modal foto
  const [fotoModal, setFotoModal] = useState<MatCatalogo | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErro, setUploadErro] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<Blob | null>(null)
  const [uploadInfo, setUploadInfo] = useState<{ originalKB: number; comprimidoKB: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { carregar() }, [])

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

  async function toggleAtivo(item: MatCatalogo) {
    if (toggling.has(item.id)) return
    setToggling(prev => new Set(prev).add(item.id))
    const novoAtivo = !item.ativo
    const { error } = await supabase.from('mat_catalogo').update({ ativo: novoAtivo, updated_at: new Date().toISOString() }).eq('id', item.id)
    if (!error) setItens(prev => prev.map(i => i.id === item.id ? { ...i, ativo: novoAtivo } : i))
    setToggling(prev => { const n = new Set(prev); n.delete(item.id); return n })
  }

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
    const { error } = await supabase.from('mat_catalogo').update({
      categoria: editState.categoria || null,
      unidade: editState.unidade,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    if (!error) {
      setItens(prev => prev.map(i => i.id === item.id ? { ...i, categoria: editState.categoria || null, unidade: editState.unidade } : i))
      setEditingId(null)
    }
    setSaving(prev => { const n = new Set(prev); n.delete(item.id); return n })
  }

  // Upload foto — comprime para WebP 800px antes de enviar
  async function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadErro(null)
    setUploadInfo(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadErro('Somente JPG, PNG ou WEBP são aceitos.')
      return
    }
    if (file.size > 15 * 1024 * 1024) { setUploadErro('Arquivo deve ter menos de 15 MB.'); return }
    try {
      const { blob, previewUrl } = await comprimirImagem(file)
      setUploadFile(blob)
      setUploadPreview(previewUrl)
      setUploadInfo({
        originalKB: Math.round(file.size / 1024),
        comprimidoKB: Math.round(blob.size / 1024),
      })
    } catch {
      setUploadErro('Não foi possível processar a imagem. Tente outro arquivo.')
    }
  }

  async function confirmarUpload() {
    if (!uploadFile || !fotoModal || uploading) return
    setUploading(true); setUploadErro(null)
    const storagePath = `catalogo/${fotoModal.id}_${fotoModal.codigo_impakto}.webp`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(storagePath, uploadFile, { upsert: true, contentType: 'image/webp' })
    if (upErr) { setUploadErro('Erro no upload: ' + upErr.message); setUploading(false); return }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const thumbUrl = urlData?.publicUrl ?? null
    const { error: dbErr } = await supabase.from('mat_catalogo').update({ foto_storage_path: storagePath, foto_thumb_url: thumbUrl, updated_at: new Date().toISOString() }).eq('id', fotoModal.id)
    if (dbErr) { setUploadErro('Foto enviada mas erro ao salvar no banco: ' + dbErr.message); setUploading(false); return }
    const itemAtualizado = { ...fotoModal, foto_storage_path: storagePath, foto_thumb_url: thumbUrl }
    setItens(prev => prev.map(i => i.id === fotoModal.id ? itemAtualizado : i))
    setFotoModal(itemAtualizado); setUploadFile(null); setUploadPreview(null); setUploadInfo(null); setUploading(false)
  }

  async function removerFoto() {
    if (!fotoModal?.foto_storage_path || uploading) return
    setUploading(true); setUploadErro(null)
    await supabase.storage.from(BUCKET).remove([fotoModal.foto_storage_path])
    const { error } = await supabase.from('mat_catalogo').update({ foto_storage_path: null, foto_thumb_url: null, updated_at: new Date().toISOString() }).eq('id', fotoModal.id)
    if (!error) {
      const itemAtualizado = { ...fotoModal, foto_storage_path: null, foto_thumb_url: null }
      setItens(prev => prev.map(i => i.id === fotoModal.id ? itemAtualizado : i))
      setFotoModal(itemAtualizado)
    }
    setUploading(false)
  }

  function abrirModal(item: MatCatalogo) { setFotoModal(item); setUploadFile(null); setUploadPreview(null); setUploadErro(null); setUploadInfo(null) }
  function fecharModal() {
    if (uploading) return
    setFotoModal(null); setUploadFile(null); setUploadPreview(null); setUploadErro(null); setUploadInfo(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Clique na linha — abre drawer de edição
  function onRowClick(e: React.MouseEvent<HTMLTableRowElement>, item: MatCatalogo) {
    if (editingId === item.id) return
    const tag = (e.target as HTMLElement).closest('button, select, input, a, [data-no-drawer]')
    if (tag) return
    setDrawerItem(item)
  }

  const categoriasDisponiveis = useMemo(() => Array.from(new Set(itens.map(i => i.categoria ?? 'outros'))).sort(), [itens])
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
        if (q) {
          const nome = (i.nome_custom || i.descricao).toLowerCase()
          return i.codigo_impakto.toLowerCase().includes(q) || nome.includes(q)
        }
        return true
      })
      .sort((a, b) => {
        const av = (a[sortField] ?? '').toLowerCase()
        const bv = (b[sortField] ?? '').toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [itens, busca, categoriaSel, statusSel, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Filtros + botão novo produto */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 space-y-3 sticky top-[52px] z-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar código, nome ou descrição…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
          {/* Botão novo produto */}
          <button
            onClick={() => setDrawerItem('new')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all"
            title="Adicionar novo produto"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <select
            value={categoriaSel}
            onChange={e => setCategoriaSel(e.target.value)}
            className="shrink-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todas">Todas categorias</option>
            {categoriasDisponiveis.map(c => (<option key={c} value={c}>{CATEGORIAS_MAP[c] ?? c}</option>))}
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

      {erro && <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{erro}</div>}

      {loading && (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-12 px-3 py-2.5"></th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('codigo_impakto')}>
                  <span className="flex items-center gap-1">Código <SortIcon field="codigo_impakto" /></span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none" onClick={() => toggleSort('descricao')}>
                  <span className="flex items-center gap-1">Nome / Descrição <SortIcon field="descricao" /></span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap" onClick={() => toggleSort('categoria')}>
                  <span className="flex items-center gap-1">Categoria <SortIcon field="categoria" /></span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">UN</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Preço</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Ativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itensFiltrados.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Nenhum item encontrado.</td></tr>
              )}
              {itensFiltrados.map(item => {
                const isEditing = editingId === item.id
                const isSaving = saving.has(item.id)
                const nomeExibido = item.nome_custom || item.descricao

                return (
                  <tr
                    key={item.id}
                    onClick={e => onRowClick(e, item)}
                    className={`transition-colors cursor-pointer ${
                      item.ativo
                        ? 'bg-white hover:bg-primary/5 active:bg-primary/10'
                        : 'bg-gray-50/60 opacity-60 hover:opacity-80 hover:bg-primary/5'
                    }`}
                    title="Clique para editar nome e descrição de uso"
                  >
                    {/* Thumb */}
                    <td className="px-3 py-2">
                      <button
                        onClick={() => abrirModal(item)}
                        title="Gerenciar foto"
                        className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 hover:border-primary transition-colors"
                      >
                        {item.foto_thumb_url
                          ? <img src={item.foto_thumb_url} alt={nomeExibido} className="w-full h-full object-cover" loading="lazy" />
                          : <ImageOff size={14} className="text-gray-300" />}
                      </button>
                    </td>

                    {/* Código */}
                    <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{item.codigo_impakto}</td>

                    {/* Nome + ícone lápis (visual) + descrição de uso */}
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1">
                        <span className={`text-xs leading-snug ${
                          item.nome_custom ? 'text-gray-800 font-medium' : 'text-gray-600'
                        }`}>
                          {nomeExibido}
                        </span>
                        <Pencil size={10} className="text-gray-300 shrink-0" />
                      </span>
                      {item.descricao_uso && (
                        <span className="flex items-center gap-1 mt-0.5">
                          <FileText size={9} className="text-gray-300 shrink-0" />
                          <span className="text-xs text-gray-400 line-clamp-1">{item.descricao_uso}</span>
                        </span>
                      )}
                    </td>

                    {/* Categoria — inline edit */}
                    <td className="px-3 py-2 whitespace-nowrap" data-no-drawer>
                      {isEditing ? (
                        <select
                          value={editState.categoria}
                          onChange={e => setEditState(s => ({ ...s, categoria: e.target.value }))}
                          className="text-xs border border-primary rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-full"
                          autoFocus
                        >
                          {CATEGORIAS.map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                        </select>
                      ) : item.categoria ? (
                        <span
                          onClick={() => iniciarEdicao(item)}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer hover:bg-blue-100 transition-colors group"
                          title="Clique para editar categoria"
                        >
                          {CATEGORIAS_MAP[item.categoria] ?? item.categoria}
                          <Pencil size={9} className="opacity-0 group-hover:opacity-60" />
                        </span>
                      ) : (
                        <button onClick={() => iniciarEdicao(item)} className="text-xs text-gray-300 hover:text-primary transition-colors" title="Definir categoria">
                          + categoria
                        </button>
                      )}
                    </td>

                    {/* Unidade — inline edit */}
                    <td className="px-3 py-2" data-no-drawer>
                      {isEditing ? (
                        <select
                          value={editState.unidade}
                          onChange={e => setEditState(s => ({ ...s, unidade: e.target.value }))}
                          className="text-xs border border-primary rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 w-20"
                        >
                          {UNIDADES.map(u => (<option key={u} value={u}>{u}</option>))}
                        </select>
                      ) : (
                        <span onClick={() => iniciarEdicao(item)} className="text-xs text-gray-500 uppercase cursor-pointer hover:text-primary transition-colors" title="Clique para editar unidade">
                          {item.unidade}
                        </span>
                      )}
                    </td>

                    {/* Preço */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {item.preco_impakto != null
                        ? <span className="text-xs text-gray-600 font-medium">
                            {item.preco_impakto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>

                    {/* Ativo + ações */}
                    <td className="px-3 py-2" data-no-drawer>
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => salvarEdicao(item)} disabled={isSaving} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-40" aria-label="Salvar">
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button onClick={cancelarEdicao} disabled={isSaving} className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40" aria-label="Cancelar">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
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
                                : <XCircle size={17} className="text-gray-300" />}
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

      {/* Drawer edição / criação */}
      {drawerItem !== null && (
        <DrawerProduto
          item={drawerItem === 'new' ? null : drawerItem}
          onClose={() => setDrawerItem(null)}
          onSaved={updated => {
            if (drawerItem === 'new') {
              setItens(prev => [updated, ...prev].sort((a, b) => a.codigo_impakto.localeCompare(b.codigo_impakto)))
            } else {
              setItens(prev => prev.map(i => i.id === updated.id ? updated : i))
            }
            setDrawerItem(null)
          }}
        />
      )}

      {/* Modal foto */}
      {fotoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={fecharModal}>
          <div className="bg-white w-full max-w-md rounded-t-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-mono">{fotoModal.codigo_impakto}</p>
                <h3 className="text-sm font-semibold text-gray-800 mt-0.5 leading-snug max-w-[260px]">
                  {fotoModal.nome_custom || fotoModal.descricao}
                </h3>
              </div>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1" aria-label="Fechar">×</button>
            </div>
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
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onArquivoSelecionado} />
            {uploadErro && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{uploadErro}</p>}

            {uploadInfo && (
              <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-400 line-through">{uploadInfo.originalKB} KB original</span>
                <span className="text-xs font-semibold text-green-600">
                  → {uploadInfo.comprimidoKB} KB WebP
                  {' '}({Math.round((1 - uploadInfo.comprimidoKB / uploadInfo.originalKB) * 100)}% menor)
                </span>
              </div>
            )}

            <div className="flex gap-2">
              {uploadFile && (
                <button onClick={confirmarUpload} disabled={uploading} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  {uploading ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : <><Upload size={16} /> Salvar foto</>}
                </button>
              )}
              {!uploadFile && (
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                  <Upload size={16} />{fotoModal.foto_thumb_url ? 'Trocar foto' : 'Selecionar foto'}
                </button>
              )}
              {fotoModal.foto_thumb_url && !uploadFile && (
                <button onClick={removerFoto} disabled={uploading} className="px-4 py-3 rounded-xl bg-red-50 text-red-500 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-100 transition-colors" aria-label="Remover foto">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              )}
              {uploadFile && (
                <button onClick={() => { setUploadFile(null); setUploadPreview(null); setUploadErro(null); setUploadInfo(null) }} disabled={uploading} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-500 text-sm font-semibold disabled:opacity-60" aria-label="Cancelar seleção">
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
