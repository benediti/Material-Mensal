import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const { signInWithGoogle } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleGoogle() {
    setLoading(true)
    setErro('')
    try {
      await signInWithGoogle()
    } catch {
      setErro('Erro ao conectar com Google. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Equippe">
            <rect width="48" height="48" rx="12" fill="#0f766e"/>
            <text x="24" y="32" textAnchor="middle" fontFamily="system-ui" fontWeight="700" fontSize="22" fill="white">E</text>
          </svg>
          <h1 className="text-xl font-bold text-gray-800">Equippe</h1>
          <p className="text-sm text-gray-500 text-center">Sistema interno de gestão</p>
        </div>

        {/* Botão Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? 'Aguarde...' : 'Entrar com Google @equippe'}
        </button>

        {erro && (
          <p className="text-sm text-red-600 text-center">{erro}</p>
        )}

        <p className="text-xs text-gray-400 text-center">
          Apenas contas <strong>@equippe.com.br</strong> têm acesso
        </p>
      </div>
    </div>
  )
}
