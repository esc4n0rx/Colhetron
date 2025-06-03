"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useSeparations } from "@/hooks/useSeparations"
import { ArrowLeft, Save, Settings, Bell, Trash2, FileSpreadsheet, Calendar, User, Loader2, CheckCircle, AlertTriangle } from "lucide-react"

interface ConfiguracoesPageProps {
  onBack: () => void
}

interface Separation {
  id: string
  type: 'SP' | 'ES' | 'RJ'
  date: string
  status: string
  file_name: string
  total_items: number
  total_stores: number
  created_at: string
}

export default function ConfiguracoesPage({ onBack }: ConfiguracoesPageProps) {
  const [configuracoes, setConfiguracoes] = useState({
    notificacoes: true,
    autoSave: true,
    darkMode: true,
    idioma: "pt-BR",
    timezone: "America/Sao_Paulo",
  })

  const [separacoes, setSeparacoes] = useState<Separation[]>([])
  const [isLoadingSeparacoes, setIsLoadingSeparacoes] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null)

  const { fetchAllSeparations, deleteSeparation } = useSeparations()

  useEffect(() => {
    loadSeparacoes()
  }, [])

  const loadSeparacoes = async () => {
    setIsLoadingSeparacoes(true)
    try {
      const data = await fetchAllSeparations()
      setSeparacoes(data)
    } catch (error) {
      console.error('Erro ao carregar separações:', error)
    } finally {
      setIsLoadingSeparacoes(false)
    }
  }

  const handleDeleteSeparacao = async (separacao: Separation) => {
    setDeletingId(separacao.id)
    try {
      const result = await deleteSeparation(separacao.id)
      
      if (result.success) {
        setSeparacoes(prev => prev.filter(s => s.id !== separacao.id))
        setDeleteSuccess(`Separação "${result.fileName}" deletada com sucesso!`)
        setTimeout(() => setDeleteSuccess(null), 3000)
      } else {
        console.error('Erro ao deletar:', result.error)
      }
    } catch (error) {
      console.error('Erro ao deletar separação:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleSave = () => {
    // Simulação de salvamento
    console.log("Configurações salvas:", configuracoes)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case 'completed':
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case 'cancelled':
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return "Ativa"
      case 'completed':
        return "Finalizada"
      case 'cancelled':
        return "Cancelada"
      default:
        return status
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold apple-font text-white">Configurações</h1>
          <p className="text-gray-400">Personalize o sistema conforme suas preferências</p>
        </div>
      </div>

      {/* Mensagem de Sucesso */}
      <AnimatePresence>
        {deleteSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center space-x-2 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg p-3"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{deleteSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações Gerais */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Configurações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Modo Escuro</Label>
                <p className="text-sm text-gray-400">Ativar tema escuro do sistema</p>
              </div>
              <Switch
                checked={configuracoes.darkMode}
                onCheckedChange={(checked) => setConfiguracoes((prev) => ({ ...prev, darkMode: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Salvamento Automático</Label>
                <p className="text-sm text-gray-400">Salvar alterações automaticamente</p>
              </div>
              <Switch
                checked={configuracoes.autoSave}
                onCheckedChange={(checked) => setConfiguracoes((prev) => ({ ...prev, autoSave: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Idioma</Label>
              <Select
                value={configuracoes.idioma}
                onValueChange={(value) => setConfiguracoes((prev) => ({ ...prev, idioma: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="es-ES">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Fuso Horário</Label>
              <Select
                value={configuracoes.timezone}
                onValueChange={(value) => setConfiguracoes((prev) => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="America/Sao_Paulo">São Paulo (GMT-3)</SelectItem>
                  <SelectItem value="America/New_York">New York (GMT-5)</SelectItem>
                  <SelectItem value="Europe/London">London (GMT+0)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Notificações Push</Label>
                <p className="text-sm text-gray-400">Receber notificações do sistema</p>
              </div>
              <Switch
                checked={configuracoes.notificacoes}
                onCheckedChange={(checked) => setConfiguracoes((prev) => ({ ...prev, notificacoes: checked }))}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white">Novos pedidos</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Separação concluída</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Alertas de estoque</span>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white">Relatórios prontos</span>
                <Switch defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Limpeza e Backup */}
        <Card className="bg-gray-900/50 border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center justify-between">
              <div className="flex items-center">
                <Trash2 className="w-5 h-5 mr-2" />
                Limpeza e Backup
              </div>
              <Button
                onClick={loadSeparacoes}
                disabled={isLoadingSeparacoes}
                variant="outline"
                size="sm"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                {isLoadingSeparacoes ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Atualizar"
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium">Atenção</p>
                  <p className="text-gray-300 text-sm">
                    A exclusão de uma separação removerá permanentemente todos os dados relacionados 
                    (materiais, quantidades e relatórios). Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              {isLoadingSeparacoes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-400">Carregando separações...</span>
                </div>
              ) : separacoes.length === 0 ? (
                <div className="text-center py-8">
                  <FileSpreadsheet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Nenhuma separação encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {separacoes.map((separacao) => (
                    <motion.div
                      key={separacao.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <FileSpreadsheet className="w-8 h-8 text-blue-400" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-white font-medium truncate">
                              {separacao.file_name}
                            </h4>
                            <Badge className={getStatusColor(separacao.status)}>
                              {getStatusLabel(separacao.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {formatDate(separacao.date)}
                            </span>
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {separacao.type}
                            </span>
                            <span>{separacao.total_items} itens</span>
                            <span>{separacao.total_stores} lojas</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Criado em {formatDateTime(separacao.created_at)}
                          </p>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deletingId === separacao.id}
                            className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                          >
                            {deletingId === separacao.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-gray-900 border-gray-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">
                              Confirmar Exclusão
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-300">
                              Tem certeza que deseja excluir a separação "{separacao.file_name}"?
                              <br />
                              <br />
                              <strong className="text-red-400">
                                Esta ação não pode ser desfeita e removerá:
                              </strong>
                              <ul className="mt-2 text-sm space-y-1">
                                <li>• {separacao.total_items} materiais/itens</li>
                                <li>• Quantidades de {separacao.total_stores} lojas</li>
                                <li>• Todos os relatórios gerados</li>
                              </ul>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                              Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSeparacao(separacao)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Excluir Permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </motion.div>
  )
}