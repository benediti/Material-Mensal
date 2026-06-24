export type StatusPedido =
  | 'rascunho'
  | 'enviado'
  | 'em_refinamento'
  | 'aprovado_supervisora'
  | 'consolidado'
  | 'conferido_setor'
  | 'nf_lancada'
  | 'boleto_gerado'
  | 'concluido'

export type TipoPedido = 'mensal' | 'equipamento' | 'servico_avulso' | 'uniforme'

export interface MatPedido {
  id: string
  supervisora_id: string
  tipo: TipoPedido
  status: StatusPedido
  periodo_ref: string // 'YYYY-MM'
  observacao?: string
  created_at: string
  updated_at: string
}

export interface MatItemPedido {
  id: string
  pedido_id: string
  produto_id: string
  quantidade: number
  quantidade_aprovada?: number
  observacao_item?: string
}

export interface MatCatalogo {
  id: string
  codigo_impakto: string
  descricao: string
  unidade: string
  categoria: string | null
  ativo: boolean
  foto_storage_path: string | null
  foto_thumb_url: string | null
  created_at: string
  updated_at: string
}

/** @deprecated use MatCatalogo */
export interface MatProduto {
  id: string
  codigo_impakto: string
  descricao: string
  unidade: string
  categoria?: string
  ativo: boolean
}

export interface MatSetorDpara {
  id: string
  nome_impakto: string
  endereco_impakto: string
  centro_custo_operacional_id: string
}
