import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TipoPedido } from '@/types/mat'

const TIPOS: { value: TipoPedido; label: string; desc: string }[] = [
  { value: 'mensal',        label: 'Material Mensal',  desc: 'Reposição mensal padrão' },
  { value: 'equipamento',   label: 'Equipamento',      desc: 'Equipamentos e ferramentas' },
  { value: 'servico_avulso',label: 'Serviço Avulso',   desc: 'Serviços pontuais' },
  { value: 'uniforme',      label: 'Uniforme',         desc: 'Roupas e EPIs' },
]

export default function NovoPedido() {
  const [tipo, setTipo] = useState<TipoPedido | null>(null)
  const navigate = useNavigate()

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Novo Pedido</h2>
      <p className="text-sm text-gray-500">Selecione o tipo de pedido:</p>

      <div className="space-y-2">
        {TIPOS.map(t => (
          <button
            key={t.value}
            onClick={() => setTipo(t.value)}
            className={`w-full text-left card transition-all active:scale-[0.98] ${
              tipo === t.value
                ? 'border-primary ring-1 ring-primary/30'
                : 'hover:shadow-md'
            }`}
          >
            <p className="font-medium text-sm text-gray-900">{t.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
          </button>
        ))}
      </div>

      <button
        className="btn-primary w-full"
        disabled={!tipo}
        onClick={() => navigate('/meus-pedidos')}
      >
        Continuar
      </button>
    </div>
  )
}
