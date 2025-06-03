"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Settings, Bell, Database, Shield } from "lucide-react"

interface ConfiguracoesPageProps {
  onBack: () => void
}

export default function ConfiguracoesPage({ onBack }: ConfiguracoesPageProps) {
  const [configuracoes, setConfiguracoes] = useState({
    notificacoes: true,
    autoSave: true,
    darkMode: true,
    idioma: "pt-BR",
    timezone: "America/Sao_Paulo",
    backupAutomatico: true,
    logLevel: "info",
  })

  const handleSave = () => {
    // Simulação de salvamento
    console.log("Configurações salvas:", configuracoes)
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

        {/* Backup e Segurança */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Backup e Segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white">Backup Automático</Label>
                <p className="text-sm text-gray-400">Fazer backup dos dados diariamente</p>
              </div>
              <Switch
                checked={configuracoes.backupAutomatico}
                onCheckedChange={(checked) => setConfiguracoes((prev) => ({ ...prev, backupAutomatico: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Nível de Log</Label>
              <Select
                value={configuracoes.logLevel}
                onValueChange={(value) => setConfiguracoes((prev) => ({ ...prev, logLevel: value }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Button variant="outline" className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                <Database className="w-4 h-4 mr-2" />
                Fazer Backup Agora
              </Button>
              <Button variant="outline" className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
                Restaurar Backup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Integração */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font">Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">URL da API</Label>
              <Input placeholder="https://api.exemplo.com" className="bg-gray-800 border-gray-700 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Token de Acesso</Label>
              <Input
                type="password"
                placeholder="••••••••••••••••"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <Button variant="outline" className="w-full bg-gray-800 border-gray-700 text-white hover:bg-gray-700">
              Testar Conexão
            </Button>
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
