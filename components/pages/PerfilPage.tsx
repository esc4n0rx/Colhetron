// components/pages/PerfilPage.tsx
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  Building,
  Trophy,
  Target,
  Zap,
  Users,
  Crown,
  Medal,
  Star,
  BarChart3,
  Upload,
  LogIn,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  Volume2,
  VolumeX
} from "lucide-react"
import { toast } from "sonner"

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
  totalSeparacoes: number
  mediaItemsSeparados: number
  mediaLojas: number
  tempoMedioSeparacao: string
  separacoesFinalizadas: number
  separacoesAtivas: number
  rankingPosition: number
  totalUsers: number
  eficiencia: number
  diasAtivos: number
}

interface ActivityItem {
  id: string
  action: string
  details: string
  type: 'upload' | 'login' | 'separation' | 'media_analysis' | 'profile_update' | 'settings_change'
  metadata: Record<string, any>
  time: string
  created_at: string
}

interface RankingUser {
  userId: string
  name: string
  email: string
  totalSeparacoes: number
  separacoesFinalizadas: number
  mediaItemsSeparados: number
  eficiencia: number
  position: number
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
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'activity' | 'ranking' | 'preferences'>('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Estados para dados
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || "",
    email: user?.email || "",
    phone: "(11) 99999-9999",
    department: "Logística",
    position: "Supervisor de Separação",
    bio: "Profissional experiente em logística e separação de pedidos. Focado em eficiência e qualidade nos processos.",
    location: "São Paulo, SP"
  })

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    darkMode: true,
    autoSave: true,
    emailNotifications: false,
    soundEffects: true
  })

  const [stats, setStats] = useState<UserStats | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [ranking, setRanking] = useState<RankingUser[]>([])
  const [currentUserRanking, setCurrentUserRanking] = useState<RankingUser | null>(null)
  const [activitiesPagination, setActivitiesPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // Fetch data on tab change
  useEffect(() => {
    if (activeTab === 'stats') {
      fetchUserStats()
    } else if (activeTab === 'activity') {
      fetchActivities()
    } else if (activeTab === 'ranking') {
      fetchRanking()
    }
  }, [activeTab])

  const fetchUserStats = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) return

      const response = await fetch('/api/user-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchActivities = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) return

      const response = await fetch(`/api/user-activities?page=${activitiesPagination.page}&limit=${activitiesPagination.limit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities)
        setActivitiesPagination(data.pagination)
      }
    } catch (error) {
      console.error('Erro ao buscar atividades:', error)
      toast.error('Erro ao carregar atividades')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRanking = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) return

      const response = await fetch('/api/ranking', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setRanking(data.ranking)
        setCurrentUserRanking(data.currentUser)
      }
    } catch (error) {
      console.error('Erro ao buscar ranking:', error)
      toast.error('Erro ao carregar ranking')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Simular salvamento - você pode implementar uma API real aqui
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log("Perfil salvo:", profile)
      console.log("Preferências salvas:", preferences)
      
      setSaveSuccess(true)
      setIsEditing(false)
      toast.success('Perfil atualizado com sucesso!')
      
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      toast.error('Erro ao salvar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return <Upload className="w-4 h-4 text-blue-400" />
      case 'login':
        return <LogIn className="w-4 h-4 text-green-400" />
      case 'separation':
        return <Package className="w-4 h-4 text-purple-400" />
      case 'media_analysis':
        return <BarChart3 className="w-4 h-4 text-yellow-400" />
      case 'profile_update':
        return <User className="w-4 h-4 text-cyan-400" />
      case 'settings_change':
        return <Settings className="w-4 h-4 text-orange-400" />
      default:
        return <Info className="w-4 h-4 text-gray-400" />
    }
  }

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Award className="w-6 h-6 text-orange-400" />
      default:
        return <Trophy className="w-6 h-6 text-gray-500" />
    }
  }

  const getRankingColor = (position: number, total: number) => {
    const percentage = (position / total) * 100
    if (percentage <= 10) return 'text-yellow-400'
    if (percentage <= 25) return 'text-green-400'
    if (percentage <= 50) return 'text-blue-400'
    return 'text-gray-400'
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 90) return 'text-green-400'
    if (efficiency >= 75) return 'text-yellow-400'
    if (efficiency >= 60) return 'text-orange-400'
    return 'text-red-400'
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'stats', label: 'Estatísticas', icon: BarChart3 },
    { id: 'activity', label: 'Atividades', icon: Activity },
    { id: 'ranking', label: 'Ranking', icon: Trophy },
    { id: 'preferences', label: 'Preferências', icon: Settings }
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold apple-font text-white">Meu Perfil</h1>
              <p className="text-gray-400">Gerencie suas informações e preferências</p>
            </div>
          </div>

          {(activeTab === 'profile' || activeTab === 'preferences') && (
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
                "Editar"
              )}
            </Button>
          )}
        </div>

        {/* Tabs Navigation */}
        <Card className="bg-gray-900/50 border-gray-800 mb-8">
          <CardContent className="p-0">
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {tabs.map(tab => {
                const IconComponent = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 flex items-center justify-center space-x-2 py-4 px-6 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                          {profile.name?.charAt(0) || user?.name?.charAt(0) || "U"}
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
                          {user?.role || 'Usuário'}
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

              {/* Sidebar com informações da conta */}
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
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="bg-gray-900/50 border-gray-800 animate-pulse">
                      <CardContent className="p-6">
                        <div className="h-16 bg-gray-700 rounded"></div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : stats ? (
                <>
                  {/* Estatísticas Principais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-400 text-sm">Total de Separações</p>
                            <p className="text-2xl font-bold text-white">{stats.totalSeparacoes}</p>
                            <p className="text-sm text-gray-500">
                              {stats.separacoesFinalizadas} finalizadas
                            </p>
                          </div>
                          <Package className="w-8 h-8 text-blue-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-400 text-sm">Média de Itens</p>
                            <p className="text-2xl font-bold text-white">{stats.mediaItemsSeparados}</p>
                            <p className="text-sm text-gray-500">por separação</p>
                          </div>
                          <Target className="w-8 h-8 text-green-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-400 text-sm">Tempo Médio</p>
                            <p className="text-2xl font-bold text-white">{stats.tempoMedioSeparacao}</p>
                            <p className="text-sm text-gray-500">por separação</p>
                          </div>
                          <Clock className="w-8 h-8 text-yellow-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-400 text-sm">Ranking</p>
                            <p className={`text-2xl font-bold ${getRankingColor(stats.rankingPosition, stats.totalUsers)}`}>
                              #{stats.rankingPosition}
                            </p>
                            <p className="text-sm text-gray-500">de {stats.totalUsers} usuários</p>
                          </div>
                          <Award className="w-8 h-8 text-purple-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-400 text-sm">Eficiência</p>
                            <p className={`text-2xl font-bold ${getEfficiencyColor(stats.eficiencia)}`}>
                              {stats.eficiencia}%
                            </p>
                            <Progress value={stats.eficiencia} className="mt-2" />
                          </div>
                          <Zap className="w-8 h-8 text-orange-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-400 text-sm">Dias Ativos</p>
                            <p className="text-2xl font-bold text-white">{stats.diasAtivos}</p>
                            <p className="text-sm text-gray-500">total</p>
                          </div>
                          <Activity className="w-8 h-8 text-cyan-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detalhes Adicionais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <TrendingUp className="w-5 h-5 mr-2" />
                          Desempenho
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Separações Ativas</span>
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {stats.separacoesAtivas}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Média de Lojas</span>
                          <Badge variant="outline" className="text-green-400 border-green-400">
                            {stats.mediaLojas}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Taxa de Conclusão</span>
                          <Badge 
                            variant="outline" 
                            className={`${getEfficiencyColor(stats.eficiencia)} border-current`}
                          >
                            {stats.eficiencia}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-900/50 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Users className="w-5 h-5 mr-2" />
                          Posição no Ranking
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${getRankingColor(stats.rankingPosition, stats.totalUsers)}`}>
                            #{stats.rankingPosition}
                          </div>
                          <p className="text-gray-400 mt-2">
                            Você está entre os {Math.round((1 - (stats.rankingPosition / stats.totalUsers)) * 100)}% melhores
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Sua posição</span>
                            <span className="text-white">{stats.rankingPosition}</span>
                          </div>
                          <Progress 
                            value={((stats.totalUsers - stats.rankingPosition + 1) / stats.totalUsers) * 100} 
                            className="h-2"
                          />
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total de usuários</span>
                            <span className="text-white">{stats.totalUsers}</span>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 </div>
               </>
             ) : (
               <Card className="bg-gray-900/50 border-gray-800">
                 <CardContent className="p-12 text-center">
                   <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                   <p className="text-gray-400">Nenhuma estatística disponível</p>
                 </CardContent>
               </Card>
             )}
           </div>
         )}

         {/* Tab: Atividades */}
         {activeTab === 'activity' && (
           <div className="space-y-6">
             <Card className="bg-gray-900/50 border-gray-800">
               <CardHeader>
                 <CardTitle className="text-white flex items-center">
                   <Activity className="w-5 h-5 mr-2" />
                   Atividades Recentes
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-sm text-gray-400">
                   Total de {activitiesPagination.total} atividade{activitiesPagination.total !== 1 ? 's' : ''} registrada{activitiesPagination.total !== 1 ? 's' : ''}
                 </div>
               </CardContent>
             </Card>

             <Card className="bg-gray-900/50 border-gray-800">
               <CardContent className="p-0">
                 <ScrollArea className="h-[600px]">
                   {isLoading ? (
                     <div className="p-6 space-y-4">
                       {[1, 2, 3, 4, 5].map(i => (
                         <div key={i} className="flex items-center space-x-4 animate-pulse">
                           <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                           <div className="flex-1 space-y-2">
                             <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                             <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : activities.length === 0 ? (
                     <div className="p-12 text-center">
                       <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                       <p className="text-gray-400">Nenhuma atividade encontrada</p>
                     </div>
                   ) : (
                     <div className="divide-y divide-gray-800">
                       {activities.map((activity) => (
                         <div key={activity.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                           <div className="flex items-start space-x-4">
                             <div className="flex-shrink-0 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                               {getActivityIcon(activity.type)}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between">
                                 <h4 className="text-white font-medium truncate">
                                   {activity.action}
                                 </h4>
                                 <Badge className={`text-xs ${
                                   activity.type === 'upload' ? 'bg-blue-500/20 text-blue-400 border-blue-400/30' :
                                   activity.type === 'login' ? 'bg-green-500/20 text-green-400 border-green-400/30' :
                                   activity.type === 'separation' ? 'bg-purple-500/20 text-purple-400 border-purple-400/30' :
                                   activity.type === 'media_analysis' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30' :
                                   activity.type === 'profile_update' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30' :
                                   activity.type === 'settings_change' ? 'bg-orange-500/20 text-orange-400 border-orange-400/30' :
                                   'bg-gray-500/20 text-gray-400 border-gray-400/30'
                                 }`}>
                                   {activity.type}
                                 </Badge>
                               </div>
                               {activity.details && (
                                 <p className="text-gray-400 text-sm mt-1 line-clamp-2">
                                   {activity.details}
                                 </p>
                               )}
                               <div className="flex items-center justify-between mt-2">
                                 <span className="text-xs text-gray-500">
                                   {activity.time}
                                 </span>
                               </div>
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </ScrollArea>
               </CardContent>
             </Card>

             {/* Paginação das Atividades */}
             {activitiesPagination.totalPages > 1 && (
               <Card className="bg-gray-900/50 border-gray-800">
                 <CardContent className="p-4">
                   <div className="flex items-center justify-between">
                     <div className="text-sm text-gray-400">
                       Página {activitiesPagination.page} de {activitiesPagination.totalPages}
                     </div>
                     <div className="flex items-center space-x-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           setActivitiesPagination(prev => ({ ...prev, page: prev.page - 1 }))
                           fetchActivities()
                         }}
                         disabled={activitiesPagination.page === 1}
                         className="border-gray-700 hover:bg-gray-800"
                       >
                         <ChevronLeft className="w-4 h-4" />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => {
                           setActivitiesPagination(prev => ({ ...prev, page: prev.page + 1 }))
                           fetchActivities()
                         }}
                         disabled={activitiesPagination.page === activitiesPagination.totalPages}
                         className="border-gray-700 hover:bg-gray-800"
                       >
                         <ChevronRight className="w-4 h-4" />
                       </Button>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             )}
           </div>
         )}

         {/* Tab: Ranking */}
         {activeTab === 'ranking' && (
           <div className="space-y-6">
             {isLoading ? (
               <div className="space-y-6">
                 <Card className="bg-gray-900/50 border-gray-800 animate-pulse">
                   <CardContent className="p-6">
                     <div className="h-32 bg-gray-700 rounded"></div>
                   </CardContent>
                 </Card>
                 {[1, 2, 3, 4, 5].map(i => (
                   <Card key={i} className="bg-gray-900/50 border-gray-800 animate-pulse">
                     <CardContent className="p-4">
                       <div className="h-16 bg-gray-700 rounded"></div>
                     </CardContent>
                   </Card>
                 ))}
               </div>
             ) : (
               <>
                 {/* Sua Posição */}
                 {currentUserRanking && (
                   <Card className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-800">
                     <CardHeader>
                       <CardTitle className="text-white flex items-center">
                         <Star className="w-5 h-5 mr-2 text-yellow-400" />
                         Sua Posição
                       </CardTitle>
                     </CardHeader>
                     <CardContent>
                       <div className="flex items-center space-x-4">
                         <div className="flex-shrink-0">
                           <Avatar className="w-16 h-16 border-2 border-blue-400">
                             <AvatarFallback className="bg-blue-600 text-white text-xl">
                               {currentUserRanking.name.charAt(0).toUpperCase()}
                             </AvatarFallback>
                           </Avatar>
                         </div>
                         <div className="flex-1">
                           <div className="flex items-center space-x-2 mb-2">
                             {getRankingIcon(currentUserRanking.position)}
                             <span className="text-2xl font-bold text-white">
                               #{currentUserRanking.position}
                             </span>
                             <Badge className={
                               currentUserRanking.position === 1 ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
                               currentUserRanking.position === 2 ? 'text-gray-300 bg-gray-300/10 border-gray-300/30' :
                               currentUserRanking.position === 3 ? 'text-orange-400 bg-orange-400/10 border-orange-400/30' :
                               'text-gray-400 bg-gray-400/10 border-gray-400/30'
                             }>
                               Top {Math.round((1 - (currentUserRanking.position / ranking.length)) * 100)}%
                             </Badge>
                           </div>
                           <h3 className="text-xl font-semibold text-white mb-1">
                             {currentUserRanking.name}
                           </h3>
                           <div className="grid grid-cols-3 gap-4 mt-4">
                             <div className="text-center">
                               <div className="text-lg font-bold text-white">
                                 {currentUserRanking.separacoesFinalizadas}
                               </div>
                               <div className="text-xs text-gray-400">Finalizadas</div>
                             </div>
                             <div className="text-center">
                               <div className="text-lg font-bold text-white">
                                 {currentUserRanking.mediaItemsSeparados}
                               </div>
                               <div className="text-xs text-gray-400">Itens/Separação</div>
                             </div>
                             <div className="text-center">
                               <div className="text-lg font-bold text-white">
                                 {currentUserRanking.eficiencia}%
                               </div>
                               <div className="text-xs text-gray-400">Eficiência</div>
                             </div>
                           </div>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 )}

                 {/* Top Performers */}
                 <Card className="bg-gray-900/50 border-gray-800">
                   <CardHeader>
                     <CardTitle className="text-white flex items-center">
                       <TrendingUp className="w-5 h-5 mr-2" />
                       Ranking Geral
                     </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-3">
                     {ranking.slice(0, 10).map((user) => (
                       <div
                         key={user.userId}
                         className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${
                           user.userId === currentUserRanking?.userId
                             ? 'bg-blue-900/30 border border-blue-600/30'
                             : 'bg-gray-800/50 hover:bg-gray-800'
                         }`}
                       >
                         <div className="flex-shrink-0 text-center w-12">
                           <div className="flex items-center justify-center">
                             {getRankingIcon(user.position)}
                           </div>
                           <div className={`text-sm font-bold ${
                             user.position <= 3 ? 'text-white' : 'text-gray-400'
                           }`}>
                             #{user.position}
                           </div>
                         </div>

                         <Avatar className="w-12 h-12">
                           <AvatarFallback className="bg-gray-700 text-white">
                             {user.name.charAt(0).toUpperCase()}
                           </AvatarFallback>
                         </Avatar>

                         <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between">
                             <h4 className="text-white font-medium truncate">
                               {user.name}
                               {user.userId === currentUserRanking?.userId && (
                                 <Badge className="ml-2 text-xs bg-blue-600 text-blue-100">
                                   Você
                                 </Badge>
                               )}
                             </h4>
                             <div className="text-right">
                               <div className="text-white font-bold">
                                 {user.separacoesFinalizadas}
                               </div>
                               <div className="text-xs text-gray-400">finalizadas</div>
                             </div>
                           </div>
                           
                           <div className="flex items-center justify-between mt-2">
                             <div className="flex items-center space-x-4 text-sm text-gray-400">
                               <span>{user.mediaItemsSeparados} itens/sep</span>
                               <span>{user.eficiencia}% eficiência</span>
                             </div>
                           </div>

                           <div className="mt-2">
                             <Progress 
                               value={user.eficiencia} 
                               className="h-1"
                             />
                           </div>
                         </div>
                       </div>
                     ))}
                   </CardContent>
                 </Card>

                 {/* Estatísticas do Ranking */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <Card className="bg-gray-900/50 border-gray-800">
                     <CardContent className="p-6 text-center">
                       <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                       <div className="text-2xl font-bold text-white">
                         {ranking[0]?.separacoesFinalizadas || 0}
                       </div>
                       <div className="text-sm text-gray-400">Líder do ranking</div>
                     </CardContent>
                   </Card>

                   <Card className="bg-gray-900/50 border-gray-800">
                     <CardContent className="p-6 text-center">
                       <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                       <div className="text-2xl font-bold text-white">
                         {ranking.length > 0 ? Math.round(ranking.reduce((acc, user) => acc + user.eficiencia, 0) / ranking.length) : 0}%
                       </div>
                       <div className="text-sm text-gray-400">Eficiência média</div>
                     </CardContent>
                   </Card>

                   <Card className="bg-gray-900/50 border-gray-800">
                     <CardContent className="p-6 text-center">
                       <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                       <div className="text-2xl font-bold text-white">
                         {ranking.length}
                       </div>
                       <div className="text-sm text-gray-400">Total de usuários</div>
                     </CardContent>
                   </Card>
                 </div>
               </>
             )}
           </div>
         )}

         {/* Tab: Preferências */}
         {activeTab === 'preferences' && (
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                     <Label className="text-gray-300">Notificações Push</Label>
                     <p className="text-sm text-gray-500">Receber notificações no navegador</p>
                   </div>
                   <Switch
                     checked={preferences.notifications}
                     onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notifications: checked }))}
                     disabled={!isEditing}
                   />
                 </div>

                 <div className="flex items-center justify-between">
                   <div>
                     <Label className="text-gray-300">Notificações por Email</Label>
                     <p className="text-sm text-gray-500">Receber resumos por email</p>
                   </div>
                   <Switch
                     checked={preferences.emailNotifications}
                     onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, emailNotifications: checked }))}
                     disabled={!isEditing}
                   />
                 </div>

                 <div className="flex items-center justify-between">
                   <div>
                     <Label className="text-gray-300">Efeitos Sonoros</Label>
                     <p className="text-sm text-gray-500">Sons de confirmação e alertas</p>
                   </div>
                   <Switch
                     checked={preferences.soundEffects}
                     onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, soundEffects: checked }))}
                     disabled={!isEditing}
                   />
                 </div>
               </CardContent>
             </Card>

             {/* Aparência e Sistema */}
             <Card className="bg-gray-900/50 border-gray-800">
               <CardHeader>
                 <CardTitle className="text-white apple-font flex items-center">
                   <Palette className="w-5 h-5 mr-2" />
                   Aparência & Sistema
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <Label className="text-gray-300">Tema Escuro</Label>
                     <p className="text-sm text-gray-500">Interface com cores escuras</p>
                   </div>
                   <Switch
                     checked={preferences.darkMode}
                     onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, darkMode: checked }))}
                     disabled={!isEditing}
                   />
                 </div>

                 <div className="flex items-center justify-between">
                   <div>
                     <Label className="text-gray-300">Salvamento Automático</Label>
                     <p className="text-sm text-gray-500">Salvar alterações automaticamente</p>
                   </div>
                   <Switch
                     checked={preferences.autoSave}
                     onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoSave: checked }))}
                     disabled={!isEditing}
                   />
                 </div>
               </CardContent>
             </Card>

             {/* Informações de Sessão */}
             <Card className="bg-gray-900/50 border-gray-800">
               <CardHeader>
                 <CardTitle className="text-white apple-font flex items-center">
                   <Shield className="w-5 h-5 mr-2" />
                   Segurança
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-gray-400">Sessão ativa desde</span>
                   <span className="text-white">14:30</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-gray-400">IP de acesso</span>
                   <span className="text-white">192.168.1.100</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-gray-400">Último backup</span>
                   <span className="text-white">Hoje</span>
                 </div>
                 <Button variant="outline" className="w-full mt-4 border-red-600 text-red-400 hover:bg-red-600/10">
                   Desconectar de todos os dispositivos
                 </Button>
               </CardContent>
             </Card>

             {/* Estatísticas de Uso */}
             <Card className="bg-gray-900/50 border-gray-800">
               <CardHeader>
                 <CardTitle className="text-white apple-font flex items-center">
                   <Activity className="w-5 h-5 mr-2" />
                   Estatísticas de Uso
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-gray-400">Tempo online hoje</span>
                   <span className="text-white">4h 23m</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-gray-400">Uploads este mês</span>
                   <span className="text-white">15</span>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-gray-400">Separações concluídas</span>
                   <span className="text-white">8</span>
                 </div>
               </CardContent>
             </Card>
           </div>
         )}
       </motion.div>
     </div>
   </div>
 )
}