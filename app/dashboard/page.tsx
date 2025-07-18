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
import PosFaturamentoTab from "@/components/tabs/PosFaturamentoTab"
import PedidosGeradosTab from "@/components/tabs/PedidosGeradosTab"
import CadastroTab from "@/components/tabs/CadastroTab"
import NewSeparationModal from "@/components/NewSeparationModal"
import ConfiguracoesPage from "@/components/pages/ConfiguracoesPage"
import SobrePage from "@/components/pages/SobrePage"
import AtualizacoesPage from "@/components/pages/AtualizacoesPage"
import PerfilPage from "@/components/pages/PerfilPage"
import RelatoriosPage from "@/components/pages/RelatoriosPage"
import { Settings, Info, Download } from 'lucide-react'

const tabs = [
  { id: "pedidos", label: "PEDIDOS" },
  { id: "preseparacao", label: "PRÉ-SEPARAÇÃO" },
  { id: "separacao", label: "SEPARAÇÃO" },
  { id: "media", label: "MÉDIA DO SISTEMA" },
  { id: "faturamento", label: "FATURAMENTO" },
  { id: "pos-faturamento", label: "PÓS FATURAMENTO" },
  { id: "pedidos-gerados", label: "PEDIDOS GERADOS" },
  { id: "cadastro", label: "CADASTRO" },
]

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { currentSeparation, isLoading: separationLoading, fetchActiveSeparation } = useSeparation()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState("pedidos")
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [isNewSeparationModalOpen, setIsNewSeparationModalOpen] = useState(false)

  const menuItems = [
    { id: "configuracoes", label: "Configurações", icon: Settings },
    { id: "sobre", label: "Sobre", icon: Info },
    { id: "atualizacoes", label: "Atualizações", icon: Download },
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  const handleSeparationFinalized = () => {
    fetchActiveSeparation()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-white">Carregando...</span>
      </div>
    )
  }

  if (!user) return null

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
      case "pos-faturamento":
        return <PosFaturamentoTab />
      case "pedidos-gerados":
        return <PedidosGeradosTab />
      case "cadastro":
        return <CadastroTab />
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
      case "relatorios":
        return <RelatoriosPage onBack={() => setCurrentPage("dashboard")} />
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

      <div className={separationLoading ? "opacity-0 pointer-events-none" : "opacity-100"}>
        <Header 
          currentSeparation={currentSeparation}
          onNavigate={setCurrentPage} 
          onNewSeparationClick={() => setIsNewSeparationModalOpen(true)}
          onSeparationFinalized={handleSeparationFinalized}
          menuItems={menuItems}
        />

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
          isOpen={isNewSeparationModalOpen} 
          onClose={() => setIsNewSeparationModalOpen(false)} 
        />
      </div>
    </div>
  )
}