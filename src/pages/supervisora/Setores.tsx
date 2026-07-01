import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { MatSetorDpara } from '@/types/mat'
import { Search, Building2, MapPin, ChevronRight, Loader2, ArrowLeft, UserCircle } from 'lucide-react'

type Filtro = 'todos' | 'ativos' | 'inativos'

export default function Setores() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const [setores, setSetores] = useState<MatSetorDpara[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('ativos')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase
      .from('mat_setor_dpara')
      .select('*')
      .order('nome_externo', { ascending: true })
    setSetores(data ?? [])
    setLoading(false)
  }

  const lista = useMemo(() => {
    const q = busca.toLowerCase().trim()
    return setores.filter(s => {
      if (filtro === 'ativos' && !s.ativo) return false
      if (filtro === 'inativos' && s.ativo) return false
      if (!q) return true
      return (
        s.nome_externo.toLowerCase().includes(q) ||
        s.endereco_externo.toLowerCase().includes(q) ||
        s.bairro_externo.toLowerCase().includes(q)
      )
    })
  }, [setores, busca, filtro])

  const nomeUsuario = user?.user_metadata?.full_name?.split(' ')[0] ?? 'você'

  return (
    <>
      {/* Top App Bar */}
      <header className="bg-white fixed top-0 w-full z-50 border-b border-gray-200 flex justify-between items-center px-4 h-14 max-w-full shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/supervisora')}
            className="p-2 rounded-full text-blue-700 hover:bg-blue-50 transition-colors active:scale-95"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-base font-bold text-blue-700">Gestão de Limpeza</h1>
        </div>
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Perfil"
        >
          <UserCircle size={24} />
        </button>
      </header>

      <div className="px-4 max-w-2xl mx-auto space-y-4 pt-2">

        {/* Saudação */}
        <div className="pt-1">
          <p className="text-xs text-gray-400">Olá, {nomeUsuario}</p>
          <p className="text-sm font-semibold text-gray-700">Selecione o local para o pedido</p>
        </div>

        {/* Busca */}
        <div className="relative group">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="search"
            placeholder="Buscar local ou endereço..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
          />
        </div>

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {([
            { value: 'ativos', label: 'Ativos' },
            { value: 'todos', label: 'Todos' },
            { value: 'inativos', label: 'Inativos' },
          ] as { value: Filtro; label: string }[]).map(f => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-colors active:scale-95 ${
                filtro === f.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="whitespace-nowrap self-center text-xs text-gray-400 pl-1">
            {lista.length} {lista.length === 1 ? 'local' : 'locais'}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-blue-600" />
          </div>
        )}

        {/* Lista de setores */}
        {!loading && (
          <div className="space-y-3 pb-4">
            {lista.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                Nenhum local encontrado.
              </div>
            )}

            {lista.map(setor => (
              <button
                key={setor.id}
                onClick={() => navigate(`/supervisora/pedido/${setor.id}`)}
                className="w-full bg-white p-4 rounded-xl border border-gray-200 text-left cursor-pointer hover:border-blue-400 transition-all active:scale-[0.98] relative overflow-hidden group"
                style={{ boxShadow: '0px 4px 12px rgba(0, 122, 255, 0.06)' }}
              >
                {/* Barra lateral azul no hover */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-xl" />

                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    {/* Ícone */}
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${
                      setor.ativo ? 'bg-blue-50' : 'bg-gray-100'
                    }`}>
                      <Building2 size={20} className={setor.ativo ? 'text-blue-600' : 'text-gray-400'} />
                    </div>

                    {/* Info */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-gray-800 leading-snug">
                        {setor.nome_externo}
                      </h3>
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <MapPin size={11} className="shrink-0" />
                        <span className="truncate max-w-[220px]">
                          {setor.endereco_externo}
                          {setor.bairro_externo ? ` - ${setor.bairro_externo}` : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Status chip */}
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                    setor.ativo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {setor.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                {/* Rodapé do card */}
                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                    Código {setor.codigo_externo}
                  </span>
                  <ChevronRight size={16} className="text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
