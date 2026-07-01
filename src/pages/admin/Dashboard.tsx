import { BookOpen, Settings, BarChart3, FileDown, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AdminDashboard() {
  const { perfil } = useAuthStore()

  const atalhos = [
    {
      to: '/admin/catalogo',
      icon: BookOpen,
      label: 'Catálogo de Materiais',
      desc: 'Gerencie os produtos Impakto',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      to: '/admin/importar-precos',
      icon: FileDown,
      label: 'Importar Preços',
      desc: 'Atualiza preços via arquivo .txt Impakto',
      color: 'bg-green-50 text-green-600',
    },
    ...(perfil === 'ti' ? [
      {
        to: '/admin/configuracoes',
        icon: Settings,
        label: 'Configurações',
        desc: 'Usuários, perfis e acessos',
        color: 'bg-teal-50 text-teal-600',
      },
      {
        to: '/supervisora',
        icon: Eye,
        label: 'Ver como Supervisora',
        desc: 'Testar a visão das supervisoras',
        color: 'bg-purple-50 text-purple-600',
      },
    ] : []),
    {
      to: '/admin/pedidos',
      icon: BarChart3,
      label: 'Pedidos',
      desc: 'Em breve',
      color: 'bg-gray-50 text-gray-300',
    },
  ]

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Painel Admin</h2>
      <div className="grid gap-3">
        {atalhos.map(({ to, icon: Icon, label, desc, color }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
          >
            <div className={`p-3 rounded-xl ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="font-medium text-gray-800 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
