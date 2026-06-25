import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'

type Perfil = 'ti' | 'compras' | 'diretoria' | 'pendente'

interface UsuarioPerfil {
  user_id: string
  perfil: Perfil
  nome: string
  email: string
  ativo: boolean
  created_at: string
}

const PERFIS: { value: Perfil; label: string }[] = [
  { value: 'ti', label: 'TI / Admin' },
  { value: 'compras', label: 'Compras' },
  { value: 'diretoria', label: 'Diretoria' },
  { value: 'pendente', label: 'Pendente' },
]

const PERFIL_COR: Record<Perfil, string> = {
  ti: 'bg-purple-50 text-purple-700',
  compras: 'bg-blue-50 text-blue-700',
  diretoria: 'bg-amber-50 text-amber-700',
  pendente: 'bg-gray-100 text-gray-400',
}

export default function Configuracoes() {
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [alterandoPerfil, setAlterandoPerfil] = useState<Set<string>>(new Set())

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    setErro(null)
    const { data, error } = await supabase
      .from('usuarios_perfis')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setErro('Erro ao carregar usuários: ' + error.message)
    else setUsuarios(data ?? [])
    setLoading(false)
  }

  async function toggleAtivo(u: UsuarioPerfil) {
    if (toggling.has(u.user_id)) return
    setToggling(prev => new Set(prev).add(u.user_id))
    const novoAtivo = !u.ativo
    const { error } = await supabase
      .from('usuarios_perfis')
      .update({ ativo: novoAtivo })
      .eq('user_id', u.user_id)
    if (!error) setUsuarios(prev => prev.map(p => p.user_id === u.user_id ? { ...p, ativo: novoAtivo } : p))
    setToggling(prev => { const n = new Set(prev); n.delete(u.user_id); return n })
  }

  async function alterarPerfil(u: UsuarioPerfil, novoPerfil: Perfil) {
    if (alterandoPerfil.has(u.user_id)) return
    setAlterandoPerfil(prev => new Set(prev).add(u.user_id))
    const { error } = await supabase
      .from('usuarios_perfis')
      .update({ perfil: novoPerfil })
      .eq('user_id', u.user_id)
    if (!error) setUsuarios(prev => prev.map(p => p.user_id === u.user_id ? { ...p, perfil: novoPerfil } : p))
    setAlterandoPerfil(prev => { const n = new Set(prev); n.delete(u.user_id); return n })
  }

  const pendentes = usuarios.filter(u => u.perfil === 'pendente')
  const ativos = usuarios.filter(u => u.perfil !== 'pendente')

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Configurações</h2>
        <button
          onClick={carregar}
          disabled={loading}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
          aria-label="Recarregar"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{erro}</div>
      )}

      {/* Pendentes de aprovação */}
      {pendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-amber-200">
            <p className="text-xs font-semibold text-amber-700">
              {pendentes.length} aguardando aprovação
            </p>
          </div>
          <ul className="divide-y divide-amber-100">
            {pendentes.map(u => (
              <li key={u.user_id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.nome || '—'}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <select
                  value={u.perfil}
                  onChange={e => alterarPerfil(u, e.target.value as Perfil)}
                  disabled={alterandoPerfil.has(u.user_id)}
                  className="text-xs border border-amber-300 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <button
                  onClick={() => toggleAtivo(u)}
                  disabled={toggling.has(u.user_id)}
                  className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-40"
                  title="Ativar acesso"
                >
                  {toggling.has(u.user_id)
                    ? <Loader2 size={16} className="animate-spin text-gray-400" />
                    : <XCircle size={18} className="text-amber-400" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Usuários cadastrados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Usuários</h3>
          <span className="text-xs text-gray-400">{ativos.length} cadastrados</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {ativos.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-gray-400">
                Nenhum usuário cadastrado ainda.
              </li>
            )}
            {ativos.map(u => (
              <li
                key={u.user_id}
                className={`px-4 py-3 flex items-center gap-3 transition-opacity ${!u.ativo ? 'opacity-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{u.nome || '—'}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${PERFIL_COR[u.perfil]}`}>
                  {PERFIS.find(p => p.value === u.perfil)?.label ?? u.perfil}
                </span>
                <select
                  value={u.perfil}
                  onChange={e => alterarPerfil(u, e.target.value as Perfil)}
                  disabled={alterandoPerfil.has(u.user_id)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <button
                  onClick={() => toggleAtivo(u)}
                  disabled={toggling.has(u.user_id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                  title={u.ativo ? 'Desativar acesso' : 'Ativar acesso'}
                >
                  {toggling.has(u.user_id)
                    ? <Loader2 size={16} className="animate-spin text-gray-400" />
                    : u.ativo
                      ? <CheckCircle2 size={18} className="text-green-500" />
                      : <XCircle size={18} className="text-gray-300" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Como adicionar novos usuários</p>
        <p>O usuário faz login com o Google usando email <strong>@equippe.com.br</strong>. Ele aparece aqui como "Pendente". Você define o perfil e ativa o acesso.</p>
      </div>
    </div>
  )
}
