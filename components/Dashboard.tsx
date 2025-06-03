"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSeparation } from "@/contexts/SeparationContext"
import Header from "@/components/Header"
import TabNavigation from "@/components/TabNavigation"
import PedidosTab from "@/components/tabs/PedidosTab"
import PreSeparacaoTab from "@/components/tabs/PreSeparacaoTab"
import SeparacaoTab from "@/components/tabs/SeparacaoTab"
import MediaSistemaTab from "@/components/tabs/MediaSistemaTab"
import FaturamentoTab from "@/components/tabs/FaturamentoTab"
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
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("pedidos")
  const [currentPage, setCurrentPage] = useState("dashboard")
  const [showNewSeparationModal, setShowNewSeparationModal] = useState(false)
  const { currentSeparation } = useSeparation()

  useEffect(() => {
    if (!currentSeparation) {
      setShowNewSeparationModal(true)
    }
  }, [currentSeparation])

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

      <NewSeparationModal isOpen={showNewSeparationModal} onClose={() => setShowNewSeparationModal(false)} />
    </div>
  )
}
