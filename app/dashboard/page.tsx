// app/dashboard/page.tsx (atualização)
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { useSeparation } from "@/contexts/SeparationContext"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import TabNavigation from "@/components/TabNavigation"
import PedidosTab from "@/components/tabs/PedidosTab"
import PreSeparacaoTab from "@/components/tabs/PreSeparacaoTab"
import SeparacaoTab from "@/components/tabs/SeparacaoTab"
import MediaSistemaTab from "@/components/tabs/MediaSistemaTab"
import FaturamentoTab from "@/components/tabs/FaturamentoTab"
import CadastroTab from "@/components/tabs/CadastroTab" // Nova importação
import NewSeparationModal from "@/components/NewSeparationModal"
import ConfiguracoesPage from "@/components/pages/ConfiguracoesPage"
import SobrePage from "@/components/pages/SobrePage"
import AtualizacoesPage from "@/components/pages/AtualizacoesPage"
import PerfilPage from "@/components/pages/PerfilPage"

const tabs = [
  { id: "pedidos", label: "PEDIDOS" },
  { id: "preseparacao", label: "PRÉ-SEPARAÇÃO" },
  { id: "separacao", label: "SEPARAÇÃO" },
  { id: "media", label: "MÉDIA DO SISTEMA" },
  { id: "faturamento", label: "FATURAMENTO" },
  { id: "cadastro", label: "CADASTRO" }, // Nova aba
]

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentSeparation, isLoading: separationLoading } = useSeparation()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState("pedidos")
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [showNewSeparationModal, setShowNewSeparationModal] = useState(false)

  // Proteção de rota
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Controle do modal de nova separação
  useEffect(() => {
    if (!separationLoading && !currentSeparation && user) {
      setShowNewSeparationModal(true)
    } else {
      setShowNewSeparationModal(false)
    }
  }, [currentSeparation, separationLoading, user])

  // Loading de autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  // Se não estiver autenticado, não renderizar nada (redirecionamento em andamento)
  if (!user) {
    return null
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "pedidos":
        return <PedidosTab />
      case "preseparacao":
        return <PreSeparacaoTab />
      case "separacao":
        return <SeparacaoTab />
      case "media":
        return <MediaSistemaTab />
      case "faturamento":
        return <FaturamentoTab />
      case "cadastro":
        return <CadastroTab /> // Novo caso
      default:
        return <PedidosTab />
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case "configuracoes":
        return <ConfiguracoesPage onBack={() => setCurrentPage("dashboard")} />
      case "sobre":
        return <SobrePage onBack={() => setCurrentPage("dashboard")} />
      case "atualizacoes":
        return <AtualizacoesPage onBack={() => setCurrentPage("dashboard")} />
      case "perfil":
        return <PerfilPage onBack={() => setCurrentPage("dashboard")} />
      default:
        return (
          <div className="space-y-6">
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Loading overlay para separação */}
      {separationLoading && (
        <div className="fixed inset-0 bg-gray-950 flex items-center justify-center z-50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
          />
          <span className="ml-3 text-white">Carregando dados...</span>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className={separationLoading ? "opacity-0 pointer-events-none" : "opacity-100"}>
        <Header onNavigate={setCurrentPage} />

        <main className="container mx-auto px-6 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        <NewSeparationModal 
          isOpen={showNewSeparationModal} 
          onClose={() => setShowNewSeparationModal(false)} 
        />
      </div>
    </div>
  )
}