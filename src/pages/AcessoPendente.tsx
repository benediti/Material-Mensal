import { useAuthStore } from '@/stores/authStore'

export default function AcessoPendente() {
  const { user, signOut } = useAuthStore()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-5 text-center">
        <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Acesso em análise</h2>
          <p className="text-sm text-gray-500 mt-1">
            Olá, <strong>{user?.user_metadata?.full_name ?? user?.email}</strong>!
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Seu cadastro foi recebido. Aguarde a liberação pelo administrador.
          </p>
        </div>
        <button
          onClick={signOut}
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
