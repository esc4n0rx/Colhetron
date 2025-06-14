"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Calendar, 
  Clock, 
  Activity, 
  Save, 
  Camera, 
  Package,
  TrendingUp,
  Award,
  Settings,
  Bell,
  Palette,
  Moon,
  Sun,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Building
} from "lucide-react"

interface PerfilPageProps {
  onBack: () => void
}

interface UserProfile {
  name: string
  email: string
  phone: string
  department: string
  position: string
  bio: string
  location: string
  avatar?: string
}

interface UserStats {
  separacoesRealizadas: number
  tempoMedio: string
  eficiencia: number
  diasAtivos: number
  rankingMensal: number
  totalRanking: number
}

interface ActivityItem {
  id: string
  action: string
  details: string
  time: string
  type: 'success' | 'info' | 'warning'
}

interface UserPreferences {
  notifications: boolean
  darkMode: boolean
  autoSave: boolean
  emailNotifications: boolean
  soundEffects: boolean
}

export default function PerfilPage({ onBack }: PerfilPageProps) {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'activity' | 'preferences'>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || "",
    email: user?.email || "",
    phone: "(11) 99999-9999",
    department: "Logística",
    position: "Supervisor de Separação",
    bio: "Profissional experiente em logística e separação de pedidos. Focado em eficiência e qualidade nos processos.",
    location: "São Paulo, SP",
  })

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    darkMode: true,
    autoSave: true,
    emailNotifications: false,
    soundEffects: true,
  })

  // Mock de estatísticas do usuário
  const [stats] = useState<UserStats>({
    separacoesRealizadas: 1247,
    tempoMedio: "2h 15m",
    eficiencia: 98.5,
    diasAtivos: 156,
    rankingMensal: 3,
    totalRanking: 25
  })

  // Mock de atividades recentes
  const [recentActivity] = useState<ActivityItem[]>([
    { 
      id: "1", 
      action: "Separação concluída", 
      details: "Pedido #12345 - Zona 1 (45 itens)", 
      time: "2 horas atrás",
      type: "success"
    },
    { 
      id: "2", 
      action: "Login no sistema", 
      details: "Acesso via navegador web", 
      time: "8 horas atrás",
      type: "info"
    },
    { 
      id: "3", 
      action: "Relatório gerado", 
      details: "Análise de médias - Exportação Excel", 
      time: "1 dia atrás",
      type: "info"
    },
    { 
      id: "4", 
      action: "Meta atingida", 
      details: "100% das separações do dia concluídas", 
      time: "1 dia atrás",
      type: "success"
    },
    { 
      id: "5", 
      action: "Configuração alterada", 
      details: "Notificações por email ativadas", 
      time: "2 dias atrás",
      type: "warning"
    },
  ])

  const handleSave = async () => {
    setIsSaving(true)
    
    // Simulação de salvamento
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log("Perfil salvo:", profile)
    console.log("Preferências salvas:", preferences)
    
    setIsSaving(false)
    setSaveSuccess(true)
    setIsEditing(false)
    
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'warning':
        return <Settings className="w-4 h-4 text-yellow-400" />
      default:
        return <Activity className="w-4 h-4 text-blue-400" />
    }
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'stats', label: 'Estatísticas', icon: TrendingUp },
    { id: 'activity', label: 'Atividades', icon: Activity },
    { id: 'preferences', label: 'Preferências', icon: Settings },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Toast de Sucesso */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Perfil atualizado com sucesso!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold apple-font text-white">Meu Perfil</h1>
            <p className="text-gray-400">Gerencie suas informações e preferências</p>
          </div>
        </div>

        {activeTab === 'profile' && (
          <Button
            onClick={() => {
              if (isEditing) {
                handleSave()
              } else {
                setIsEditing(true)
              }
            }}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {isSaving ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            ) : (
              "Editar Perfil"
            )}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Tab: Perfil */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white apple-font flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Informações Pessoais
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                          {profile.name?.charAt(0) || user?.name?.charAt(0) || "A"}
                        </div>
                        {isEditing && (
                          <Button
                            size="sm"
                            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700"
                          >
                            <Camera className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{profile.name}</h3>
                        <p className="text-gray-400">{profile.position}</p>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mt-1">
                          <Shield className="w-3 h-3 mr-1" />
                          {user?.role}
                        </Badge>
                      </div>
                    </div>

                    {/* Formulário */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Nome Completo</Label>
                        <Input
                          value={profile.name}
                          onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Email</Label>
                        <Input
                          value={profile.email}
                          onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                          type="email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Telefone</Label>
                        <Input
                          value={profile.phone}
                          onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Localização</Label>
                        <Input
                          value={profile.location}
                          onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Departamento</Label>
                        <Input
                          value={profile.department}
                          onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-300">Cargo</Label>
                        <Input
                          value={profile.position}
                          onChange={(e) => setProfile(prev => ({ ...prev, position: e.target.value }))}
                          disabled={!isEditing}
                          className="bg-gray-800 border-gray-700 text-white disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Biografia</Label>
                      <Textarea
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        disabled={!isEditing}
                        className="bg-gray-800 border-gray-700 text-white disabled:opacity-50 min-h-[80px]"
                        placeholder="Conte um pouco sobre você..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Informações da Conta */}
              <div className="space-y-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white apple-font flex items-center">
                      <Shield className="w-5 h-5 mr-2" />
                      Informações da Conta
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Membro desde</span>
                      <span className="text-white">
                        {new Date(user?.created_at || '').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Último acesso</span>
                      <span className="text-white">Hoje às 14:30</span>
                    </div>
                    {/* LINHA CORRIGIDA ABAIXO */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status</span>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Ativo
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Contatos Rápidos */}
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white apple-font text-sm">Contatos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-gray-300">{profile.email}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-gray-300">{profile.phone}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-4 h-4 text-red-400" />
                      <span className="text-sm text-gray-300">{profile.location}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Building className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-gray-300">{profile.department}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tab: Estatísticas */}
          {activeTab === 'stats' && (
            <div className="space-y-6">
              {/* Estatísticas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Separações</p>
                        <p className="text-xl font-bold text-white">{stats.separacoesRealizadas.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Tempo Médio</p>
                        <p className="text-xl font-bold text-white">{stats.tempoMedio}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Eficiência</p>
                        <p className="text-xl font-bold text-white">{stats.eficiencia}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                        <Award className="w-5 h-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Ranking</p>
                        <p className="text-xl font-bold text-white">#{stats.rankingMensal}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos e Detalhes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white apple-font">Performance Mensal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Separações Concluídas</span>
                        <span className="text-white">95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Precisão</span>
                        <span className="text-white">98.5%</span>
                      </div>
                      <Progress value={98.5} className="h-2" />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tempo Médio</span>
                        <span className="text-white">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Qualidade</span>
                        <span className="text-white">92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900/50 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white apple-font">Ranking da Equipe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white mb-2">#{stats.rankingMensal}</div>
                        <p className="text-gray-400">de {stats.totalRanking} funcionários</p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-lg border border-yellow-500/20">
                          <div className="flex items-center space-x-3">
                            <Award className="w-5 h-5 text-yellow-400" />
                            <span className="text-white font-medium">Top 3 Este Mês</span>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            Conquista
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center space-x-3">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <span className="text-white font-medium">Maior Eficiência</span>
                          </div>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            {stats.diasAtivos} dias
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tab: Atividades */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white apple-font flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Atividades Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start space-x-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700"
                      >
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium">{activity.action}</p>
                          <p className="text-gray-400 text-sm">{activity.details}</p>
                          <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Resumo de Atividades */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">42</div>
                    <p className="text-sm text-gray-400">Ações Hoje</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">156</div>
                    <p className="text-sm text-gray-400">Esta Semana</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">1.2k</div>
                    <p className="text-sm text-gray-400">Este Mês</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tab: Preferências */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <Card className="bg-gray-900/50 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white apple-font flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Preferências do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Notificações */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Notificações</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bell className="w-5 h-5 text-blue-400" />
                          <div>
                            <p className="text-white">Notificações do Sistema</p>
                            <p className="text-gray-400 text-sm">Receber alertas sobre separações e atualizações</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.notifications}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, notifications: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-green-400" />
                          <div>
                            <p className="text-white">Notificações por Email</p>
                            <p className="text-gray-400 text-sm">Receber resumos diários por email</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.emailNotifications}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Aparência */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Aparência</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Palette className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-white">Tema Escuro</p>
                            <p className="text-gray-400 text-sm">Interface otimizada para ambientes com pouca luz</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Sun className="w-4 h-4 text-gray-400" />
                          <Switch
                            checked={preferences.darkMode}
                            onCheckedChange={(checked) => 
                              setPreferences(prev => ({ ...prev, darkMode: checked }))
                            }
                          />
                          <Moon className="w-4 h-4 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sistema */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Sistema</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Save className="w-5 h-5 text-yellow-400" />
                          <div>
                            <p className="text-white">Salvamento Automático</p>
                            <p className="text-gray-400 text-sm">Salvar alterações automaticamente</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.autoSave}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, autoSave: checked }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Activity className="w-5 h-5 text-red-400" />
                          <div>
                            <p className="text-white">Efeitos Sonoros</p>
                            <p className="text-gray-400 text-sm">Sons de confirmação e alertas</p>
                          </div>
                        </div>
                        <Switch
                          checked={preferences.soundEffects}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, soundEffects: checked }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botão Salvar Preferências */}
                  <div className="pt-4 border-t border-gray-700">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Salvando Preferências...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Salvar Preferências
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}