import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

interface LinhaArquivo {
  codigo: string
  descricao: string
  preco: number
}

interface LinhaPreview extends LinhaArquivo {
  precoAtual: number | null
  encontrado: boolean
}

function parseTxt(content: string): LinhaArquivo[] {
  return content
    .split('\n')
    .slice(1) // pula cabeçalho
    .filter(l => l.trim())
    .map(l => {
      const partes = l.split('\t')
      const codigo = partes[0]?.trim()
      const descricao = partes[1]?.trim() ?? ''
      const precoStr = (partes[2] ?? '').replace('R$', '').replace(',', '.').trim()
      const preco = parseFloat(precoStr)
      return { codigo, descricao, preco }
    })
    .filter(i => i.codigo && !isNaN(i.preco) && i.preco > 0)
}

async function buscarPrecoAtual(codigos: string[]): Promise<Record<string, number | null>> {
  const { data } = await supabase
    .from('mat_catalogo')
    .select('codigo_impakto, preco_impakto')
    .in('codigo_impakto', codigos)
  const map: Record<string, number | null> = {}
  for (const row of data ?? []) {
    map[row.codigo_impakto] = row.preco_impakto
  }
  return map
}

async function atualizarEmLotes(linhas: LinhaArquivo[], onProgresso: (n: number) => void) {
  const LOTE = 20
  let atualizados = 0
  const agora = new Date().toISOString()

  for (let i = 0; i < linhas.length; i += LOTE) {
    const lote = linhas.slice(i, i + LOTE)
    await Promise.all(
      lote.map(({ codigo, preco }) =>
        supabase
          .from('mat_catalogo')
          .update({ preco_impakto: preco, preco_atualizado_em: agora })
          .eq('codigo_impakto', codigo)
      )
    )
    atualizados += lote.length
    onProgresso(atualizados)
  }
  return atualizados
}

export default function ImportarPrecos() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<LinhaPreview[] | null>(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [resultado, setResultado] = useState<{ atualizados: number; data: string } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function onArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.txt')) { setErro('Selecione um arquivo .txt'); return }

    setErro(null)
    setResultado(null)
    setPreview(null)
    setCarregando(true)
    setNomeArquivo(file.name)

    const content = await file.text()
    const linhas = parseTxt(content)

    if (linhas.length === 0) {
      setErro('Nenhum produto encontrado no arquivo. Verifique o formato.')
      setCarregando(false)
      return
    }

    const codigos = linhas.map(l => l.codigo)
    const precoAtual = await buscarPrecoAtual(codigos)

    const linhasPreview: LinhaPreview[] = linhas.map(l => ({
      ...l,
      precoAtual: precoAtual[l.codigo] ?? null,
      encontrado: l.codigo in precoAtual,
    }))

    setPreview(linhasPreview)
    setCarregando(false)
  }

  async function confirmarImportacao() {
    if (!preview) return
    const encontrados = preview.filter(l => l.encontrado)
    if (encontrados.length === 0) return

    setImportando(true)
    setProgresso(0)
    setErro(null)

    try {
      await atualizarEmLotes(encontrados, setProgresso)
      setResultado({
        atualizados: encontrados.length,
        data: new Date().toLocaleString('pt-BR'),
      })
      setPreview(null)
      setNomeArquivo('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (e) {
      setErro('Erro durante a importação: ' + (e instanceof Error ? e.message : String(e)))
    }
    setImportando(false)
  }

  function resetar() {
    setPreview(null)
    setResultado(null)
    setErro(null)
    setNomeArquivo('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const encontrados = preview?.filter(l => l.encontrado) ?? []
  const naoEncontrados = preview?.filter(l => !l.encontrado) ?? []
  const comAlteracao = encontrados.filter(l => l.precoAtual !== l.preco)
  const semAlteracao = encontrados.filter(l => l.precoAtual === l.preco)

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Importar Preços Impakto</h2>

      {/* Resultado */}
      {resultado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Importação concluída</p>
            <p className="text-xs text-green-700 mt-0.5">
              {resultado.atualizados} produtos atualizados em {resultado.data}
            </p>
          </div>
          <button onClick={resetar} className="ml-auto p-1.5 text-green-600 hover:bg-green-100 rounded-lg">
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 flex items-center gap-2">
          <XCircle size={16} className="shrink-0" />{erro}
        </div>
      )}

      {/* Upload */}
      {!preview && !resultado && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
        >
          {carregando
            ? <Loader2 size={32} className="animate-spin text-primary" />
            : <Upload size={32} className="text-gray-300" />}
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">
              {carregando ? 'Lendo arquivo...' : 'Clique para selecionar o arquivo'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Formato: .txt separado por tabulação (Impakto)</p>
          </div>
          {nomeArquivo && (
            <span className="flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 px-3 py-1 rounded-full">
              <FileText size={12} />{nomeArquivo}
            </span>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={onArquivoSelecionado}
          />
        </div>
      )}

      {/* Preview */}
      {preview && (
        <>
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'No arquivo', valor: preview.length, cor: 'text-gray-700 bg-gray-50' },
              { label: 'Com alteração', valor: comAlteracao.length, cor: 'text-amber-700 bg-amber-50' },
              { label: 'Sem alteração', valor: semAlteracao.length, cor: 'text-green-700 bg-green-50' },
              { label: 'Não encontrados', valor: naoEncontrados.length, cor: 'text-red-700 bg-red-50' },
            ].map(({ label, valor, cor }) => (
              <div key={label} className={`rounded-xl p-3 text-center ${cor}`}>
                <p className="text-2xl font-bold">{valor}</p>
                <p className="text-xs mt-0.5 opacity-80">{label}</p>
              </div>
            ))}
          </div>

          {naoEncontrados.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>{naoEncontrados.length} código(s)</strong> do arquivo não existem no catálogo e serão ignorados.
              </p>
            </div>
          )}

          {/* Tabela com alterações */}
          {comAlteracao.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Preços que serão alterados ({comAlteracao.length})
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Código</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Produto</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-semibold">Atual</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-semibold">Novo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {comAlteracao.map(l => (
                      <tr key={l.codigo} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500">{l.codigo}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{l.descricao}</td>
                        <td className="px-3 py-2 text-right text-gray-400">
                          {l.precoAtual != null ? `R$ ${l.precoAtual.toFixed(2)}` : '—'}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${
                          l.precoAtual == null || l.preco > l.precoAtual ? 'text-red-600' : 'text-green-600'
                        }`}>
                          R$ {l.preco.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ações */}
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
              disabled={importando || encontrados.length === 0}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {importando
                ? <><Loader2 size={16} className="animate-spin" /> {progresso}/{encontrados.length}</>
                : <>Importar {encontrados.length} preços</>}
            </button>
          </div>
        </>
      )}

      {/* Instruções */}
      {!preview && !resultado && !carregando && (
        <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
          <p className="font-semibold">Formato esperado do arquivo</p>
          <p>Arquivo .txt separado por tabulação com 3 colunas:</p>
          <p className="font-mono bg-blue-100 px-2 py-1 rounded mt-1">
            Cod. Produto → Descr. Produto → Valor (R$ X.XX)
          </p>
          <p className="mt-1">A importação atualiza apenas os produtos já cadastrados no catálogo. Novos produtos não são criados automaticamente.</p>
        </div>
      )}
    </div>
  )
}
