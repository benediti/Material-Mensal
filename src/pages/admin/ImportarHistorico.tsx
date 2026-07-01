import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw, Package } from 'lucide-react'

interface LinhaCSV {
  codigoProduto: string
  descricao: string
  quantidade: number
  precoUnitario: number
  codigoSetor: string
  nomeSetor: string
}

interface ItemResolv {
  codigoProduto: string
  descricao: string
  quantidade: number
  precoUnitario: number
  catalogoId: number | null
}

interface SetorResolv {
  codigoSetor: string
  nomeSetor: string
  centroCustoId: number | null
  itens: ItemResolv[]
}

interface Resultado {
  competencia: string
  pedidosCriados: number
  itensCriados: number
  setoresIgnorados: number
  itensIgnorados: number
}

function extractCompetencia(filename: string): string | null {
  const match = filename.match(/(\d{2})(\d{2})(\d{4})/)
  if (!match) return null
  const [, , mm, yyyy] = match
  return `${yyyy}-${mm}`
}

function parseCSV(content: string): LinhaCSV[] {
  const lines = content.split('\n').slice(1).filter(l => l.trim())
  return lines.map(l => {
    const cols = l.split(';')
    return {
      codigoProduto: cols[1]?.trim() ?? '',
      descricao: cols[2]?.trim() ?? '',
      quantidade: parseFloat(cols[3]?.trim() ?? '0'),
      precoUnitario: parseFloat(cols[4]?.trim() ?? '0'),
      codigoSetor: cols[7]?.trim() ?? '',
      nomeSetor: cols[8]?.trim() ?? '',
    }
  }).filter(l => l.codigoProduto && l.codigoSetor && l.quantidade > 0)
}

function groupBySetor(linhas: LinhaCSV[]): Map<string, { nomeSetor: string; itens: LinhaCSV[] }> {
  const map = new Map<string, { nomeSetor: string; itens: LinhaCSV[] }>()
  for (const linha of linhas) {
    const existing = map.get(linha.codigoSetor)
    if (existing) {
      existing.itens.push(linha)
    } else {
      map.set(linha.codigoSetor, { nomeSetor: linha.nomeSetor, itens: [linha] })
    }
  }
  return map
}

export default function ImportarHistorico() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [competencia, setCompetencia] = useState('')
  const [setores, setSetores] = useState<SetorResolv[] | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErro('Selecione um arquivo .csv')
      return
    }

    const comp = extractCompetencia(file.name)
    if (!comp) {
      setErro('Não foi possível extrair a competência do nome do arquivo. Esperado: Pedidos_Impakto_DDMMYYYY.csv')
      return
    }

    setErro(null)
    setResultado(null)
    setSetores(null)
    setCarregando(true)
    setNomeArquivo(file.name)
    setCompetencia(comp)

    const content = await file.text()
    const linhas = parseCSV(content)

    if (linhas.length === 0) {
      setErro('Nenhum item encontrado no arquivo. Verifique o formato.')
      setCarregando(false)
      return
    }

    const grupo = groupBySetor(linhas)
    const codigosSetor = Array.from(grupo.keys())
    const codigosProduto = [...new Set(linhas.map(l => l.codigoProduto))]

    const [{ data: setorRows }, { data: catalogoRows }] = await Promise.all([
      supabase.from('mat_setor_dpara').select('centro_custo_id, codigo_externo').in('codigo_externo', codigosSetor),
      supabase.from('mat_catalogo').select('id, codigo_impakto').in('codigo_impakto', codigosProduto),
    ])

    const setorMap: Record<string, number> = {}
    for (const row of setorRows ?? []) setorMap[row.codigo_externo] = row.centro_custo_id

    const catalogoMap: Record<string, number> = {}
    for (const row of catalogoRows ?? []) catalogoMap[row.codigo_impakto] = row.id

    const setoresResolvidos: SetorResolv[] = []
    for (const [codigo, { nomeSetor, itens }] of grupo) {
      setoresResolvidos.push({
        codigoSetor: codigo,
        nomeSetor,
        centroCustoId: setorMap[codigo] ?? null,
        itens: itens.map(i => ({
          codigoProduto: i.codigoProduto,
          descricao: i.descricao,
          quantidade: i.quantidade,
          precoUnitario: i.precoUnitario,
          catalogoId: catalogoMap[i.codigoProduto] ?? null,
        })),
      })
    }

    setSetores(setoresResolvidos)
    setCarregando(false)
  }

  async function confirmarImportacao() {
    if (!setores || !competencia) return
    setImportando(true)
    setProgresso(0)
    setErro(null)

    let pedidosCriados = 0
    let itensCriados = 0
    let setoresIgnorados = 0
    let itensIgnorados = 0

    const setoresValidos = setores.filter(s => s.centroCustoId !== null)

    for (const setor of setoresValidos) {
      try {
        const { data: pedido, error: errPedido } = await supabase
          .from('mat_pedido')
          .insert({
            tipo: 'mensal',
            status: 'concluido',
            competencia,
            centro_custo_id: setor.centroCustoId,
          })
          .select('id')
          .single()

        if (errPedido || !pedido) {
          setoresIgnorados++
          continue
        }

        const itensValidos = setor.itens.filter(i => i.catalogoId !== null)
        itensIgnorados += setor.itens.length - itensValidos.length

        if (itensValidos.length > 0) {
          await supabase.from('mat_pedido_item').insert(
            itensValidos.map(i => ({
              pedido_id: pedido.id,
              catalogo_id: i.catalogoId!,
              quantidade: i.quantidade,
            }))
          )
          itensCriados += itensValidos.length
        }

        pedidosCriados++
        setProgresso(pedidosCriados)
      } catch {
        setoresIgnorados++
      }
    }

    setoresIgnorados += setores.filter(s => s.centroCustoId === null).length

    setResultado({ competencia, pedidosCriados, itensCriados, setoresIgnorados, itensIgnorados })
    setSetores(null)
    setNomeArquivo('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setImportando(false)
  }

  function resetar() {
    setSetores(null)
    setResultado(null)
    setErro(null)
    setNomeArquivo('')
    setCompetencia('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const setoresValidos = setores?.filter(s => s.centroCustoId !== null) ?? []
  const setoresInvalidos = setores?.filter(s => s.centroCustoId === null) ?? []
  const totalItens = setoresValidos.reduce((n, s) => n + s.itens.length, 0)
  const totalItensIgnorados = setoresValidos.reduce((n, s) => n + s.itens.filter(i => i.catalogoId === null).length, 0)
  const totalSetores = setores?.length ?? 0

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Importar Histórico de Pedidos</h2>

      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Importação concluída — {resultado.competencia}</p>
            <p className="text-xs text-green-700 mt-1">
              {resultado.pedidosCriados} pedidos criados · {resultado.itensCriados} itens inseridos
            </p>
            {(resultado.setoresIgnorados > 0 || resultado.itensIgnorados > 0) && (
              <p className="text-xs text-amber-600 mt-0.5">
                {resultado.setoresIgnorados} setores ignorados · {resultado.itensIgnorados} itens ignorados
              </p>
            )}
          </div>
          <button onClick={resetar} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />{erro}
        </div>
      )}

      {!setores && !resultado && (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
          >
            {carregando
              ? <Loader2 size={32} className="animate-spin text-blue-600" />
              : <Upload size={32} className="text-gray-300" />}
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                {carregando ? 'Processando arquivo...' : 'Clique para selecionar o arquivo'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Formato: Pedidos_Impakto_DDMMYYYY.csv (separado por ponto e vírgula)</p>
            </div>
            {nomeArquivo && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                <FileText size={12} />{nomeArquivo}
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onArquivoSelecionado}
            />
          </div>

          <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Como funciona</p>
            <p>O arquivo deve seguir o formato exportado pela Impakto. A competência é extraída automaticamente do nome do arquivo.</p>
            <p className="mt-1">Cada setor gera um pedido com status <strong>concluído</strong>. Produtos não cadastrados no catálogo são ignorados.</p>
          </div>
        </>
      )}

      {setores && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
            <FileText size={16} className="shrink-0" />
            <span><strong>{nomeArquivo}</strong> · Competência: <strong>{competencia}</strong></span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Setores', valor: totalSetores, cor: 'text-gray-700 bg-gray-50' },
              { label: 'Pedidos a criar', valor: setoresValidos.length, cor: 'text-blue-700 bg-blue-50' },
              { label: 'Itens a inserir', valor: totalItens - totalItensIgnorados, cor: 'text-green-700 bg-green-50' },
              { label: 'Ignorados', valor: setoresInvalidos.length + totalItensIgnorados, cor: totalItensIgnorados + setoresInvalidos.length > 0 ? 'text-amber-700 bg-amber-50' : 'text-gray-400 bg-gray-50' },
            ].map(({ label, valor, cor }) => (
              <div key={label} className={`rounded-xl p-3 text-center ${cor}`}>
                <p className="text-2xl font-bold">{valor}</p>
                <p className="text-xs mt-0.5 opacity-80">{label}</p>
              </div>
            ))}
          </div>

          {setoresInvalidos.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-semibold mb-1">{setoresInvalidos.length} setor(es) não encontrado(s) no sistema:</p>
                <ul className="space-y-0.5">
                  {setoresInvalidos.map(s => (
                    <li key={s.codigoSetor}>Código <strong>{s.codigoSetor}</strong> — {s.nomeSetor}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Pedidos a importar ({setoresValidos.length})
              </p>
            </div>
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {setoresValidos.map(s => {
                const validos = s.itens.filter(i => i.catalogoId !== null).length
                const ignorados = s.itens.length - validos
                return (
                  <div key={s.codigoSetor} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Package size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{s.nomeSetor}</p>
                      <p className="text-xs text-gray-400">Código {s.codigoSetor}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-green-600">{validos} itens</p>
                      {ignorados > 0 && <p className="text-xs text-amber-500">{ignorados} ignorados</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {importando && (
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Importando... {progresso}/{setoresValidos.length} pedidos
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={resetar}
              disabled={importando}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarImportacao}
              disabled={importando || setoresValidos.length === 0}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {importando
                ? <Loader2 size={16} className="animate-spin" />
                : <>Importar {setoresValidos.length} pedidos</>}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
