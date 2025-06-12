// app/page.tsx (versão alternativa mais limpa)
"use client"

import { useAuth } from "@/contexts/AuthContext"
import AuthPage from "@/components/auth/AuthPage"
import { Loading } from "@/components/ui/loading"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && !isLoading) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Loading inicial do sistema
  if (isLoading) {
    return (
      <Loading 
        title="Colhetron"
        subtitle="Inicializando sistema..."
        type="auth"
      />
    )
  }

  // Usuário logado - redirecionando
  if (user) {
    return (
      <Loading 
        title="Bem-vindo de volta!"
        subtitle="Redirecionando para o dashboard..."
        type="redirect"
      />
    )
  }

  // Usuário não logado - mostrar página de autenticação
  return <AuthPage />
}