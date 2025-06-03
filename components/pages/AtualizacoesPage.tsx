"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, CheckCircle, Clock, AlertTriangle, Zap, Bug, Plus } from "lucide-react"

interface AtualizacoesPageProps {
  onBack: () => void
}

const updates = [
  {
    version: "2.1.0",
    date: "2024-01-15",
    status: "current",
    type: "major",
    title: "Nova Interface de Separação",
    description: "Interface completamente redesenhada com melhor usabilidade",
    changes: [
      "Nova tela de separação por zonas",
      "Filtros avançados aprimorados",
      "Melhorias na performance",
      "Correção de bugs menores",
    ],
  },
  {
    version: "2.0.5",
    date: "2024-01-10",
    status: "installed",
    type: "patch",
    title: "Correções e Melhorias",
    description: "Correções importantes e otimizações de performance",
    changes: [
      "Correção no cálculo de médias",
      "Melhoria na sincronização de dados",
      "Otimização do carregamento de tabelas",
      "Correção de bugs no faturamento",
    ],
  },
  {
    version: "2.0.4",
    date: "2024-01-05",
    status: "installed",
    type: "patch",
    title: "Hotfix Crítico",
    description: "Correção urgente para problema de autenticação",
    changes: ["Correção crítica na autenticação", "Melhoria na segurança", "Correção de timeout de sessão"],
  },
  {
    version: "2.0.0",
    date: "2024-01-01",
    status: "installed",
    type: "major",
    title: "Grande Atualização",
    description: "Nova versão com recursos revolucionários",
    changes: [
      "Interface completamente nova",
      "Sistema de notificações",
      "Relatórios avançados",
      "Integração com APIs externas",
      "Modo escuro nativo",
    ],
  },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "current":
      return <CheckCircle className="w-5 h-5 text-green-400" />
    case "available":
      return <Download className="w-5 h-5 text-blue-400" />
    case "installed":
      return <CheckCircle className="w-5 h-5 text-gray-400" />
    default:
      return <Clock className="w-5 h-5 text-yellow-400" />
  }
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "major":
      return <Zap className="w-4 h-4" />
    case "minor":
      return <Plus className="w-4 h-4" />
    case "patch":
      return <Bug className="w-4 h-4" />
    default:
      return <AlertTriangle className="w-4 h-4" />
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case "major":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    case "minor":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "patch":
      return "bg-green-500/20 text-green-400 border-green-500/30"
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30"
  }
}

export default function AtualizacoesPage({ onBack }: AtualizacoesPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold apple-font text-white">Atualizações do Sistema</h1>
            <p className="text-gray-400">Histórico de versões e novidades</p>
          </div>
        </div>

        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
          <Download className="w-4 h-4 mr-2" />
          Verificar Atualizações
        </Button>
      </div>

      {/* Status Atual */}
      <Card className="bg-gradient-to-r from-green-600/20 to-green-800/20 border-green-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <h3 className="text-xl font-bold text-white">Sistema Atualizado</h3>
                <p className="text-green-300">Versão 2.1.0 - Última verificação: hoje às 14:30</p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Atual</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Atualizações */}
      <div className="space-y-4">
        {updates.map((update, index) => (
          <motion.div
            key={update.version}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card
              className={`bg-gray-900/50 border-gray-800 ${update.status === "current" ? "ring-2 ring-green-500/30" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(update.status)}
                    <div>
                      <CardTitle className="text-white apple-font flex items-center space-x-2">
                        <span>Versão {update.version}</span>
                        <Badge className={`${getTypeColor(update.type)} border`}>
                          {getTypeIcon(update.type)}
                          <span className="ml-1 capitalize">{update.type}</span>
                        </Badge>
                      </CardTitle>
                      <p className="text-gray-400 text-sm">
                        {new Date(update.date).toLocaleDateString("pt-BR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {update.status === "available" && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Instalar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-white font-semibold mb-2">{update.title}</h4>
                    <p className="text-gray-300">{update.description}</p>
                  </div>

                  <div>
                    <h5 className="text-white font-medium mb-2">Principais mudanças:</h5>
                    <ul className="space-y-1">
                      {update.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start space-x-2 text-gray-300">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Configurações de Atualização */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white apple-font">Configurações de Atualização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Atualizações Automáticas</p>
              <p className="text-gray-400 text-sm">Instalar atualizações de segurança automaticamente</p>
            </div>
            <Button variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Configurar
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">Notificações</p>
              <p className="text-gray-400 text-sm">Receber notificações sobre novas atualizações</p>
            </div>
            <Button variant="outline" className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Ativar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
