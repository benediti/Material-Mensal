import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, perfil, perfilAtivo, loading } = useAuthStore()

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!perfilAtivo || perfil === 'pendente') {
      navigate('/acesso-pendente', { replace: true })
      return
    }

    navigate('/admin', { replace: true })
  }, [loading, user, perfil, perfilAtivo, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Autenticando...</p>
      </div>
    </div>
  )
}
