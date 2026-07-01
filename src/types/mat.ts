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
  id: number
  codigo_impakto: string
  descricao: string
  /** Nome editado pelo admin — substitui descricao na exibicao quando preenchido */
  nome_custom: string | null
  /** Dica de uso visivel para as supervisoras no momento do pedido */
  descricao_uso: string | null
  unidade: string
  categoria: string | null
  ativo: boolean
  foto_storage_path: string | null
  foto_thumb_url: string | null
  preco_impakto: number | null
  preco_atualizado_em: string | null
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
  id: number
  centro_custo_id: number
  codigo_externo: string
  nome_externo: string
  endereco_externo: string
  bairro_externo: string
  cidade_externa: string
  ativo: boolean
  created_at: string
  updated_at: string
}
