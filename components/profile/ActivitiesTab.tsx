// components/profile/ActivitiesTab.tsx
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, 
  Upload, 
  LogIn, 
  Package, 
  BarChart3, 
  Settings, 
  User,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react'
import { toast } from 'sonner'

interface ActivityItem {
  id: string
  action: string
  details: string
  type: 'upload' | 'login' | 'separation' | 'media_analysis' | 'profile_update' | 'settings_change'
  metadata: Record<string, any>
  time: string
  created_at: string
}

interface ActivitiesResponse {
  activities: ActivityItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ActivitiesTab() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('')

  useEffect(() => {
    fetchActivities()
  }, [pagination.page, selectedType])

  const fetchActivities = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (selectedType) {
        params.append('type', selectedType)
      }

      const response = await fetch(`/api/user-activities?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar atividades')
      }

      const data: ActivitiesResponse = await response.json()
      setActivities(data.activities)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Erro ao buscar atividades:', error)
      toast.error('Erro ao carregar atividades')
    } finally {
      setIsLoading(false)
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

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'upload':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/30'
      case 'login':
        return 'bg-green-500/20 text-green-400 border-green-400/30'
      case 'separation':
        return 'bg-purple-500/20 text-purple-400 border-purple-400/30'
      case 'media_analysis':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
      case 'profile_update':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30'
      case 'settings_change':
        return 'bg-orange-500/20 text-orange-400 border-orange-400/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30'
    }
  }

  const activityTypes = [
    { value: '', label: 'Todas' },
    { value: 'upload', label: 'Uploads' },
    { value: 'login', label: 'Logins' },
    { value: 'separation', label: 'Separações' },
    { value: 'media_analysis', label: 'Análises' },
    { value: 'profile_update', label: 'Perfil' },
    { value: 'settings_change', label: 'Configurações' }
  ]

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleTypeFilter = (type: string) => {
    setSelectedType(type)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  return (
    <div className="space-y-6">
      {/* Header com Filtros */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Atividades Recentes
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedType}
                onChange={(e) => handleTypeFilter(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-sm rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {activityTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-400">
            Total de {pagination.total} atividade{pagination.total !== 1 ? 's' : ''} registrada{pagination.total !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Atividades */}
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
                {activities.map((activity, index) => (
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
                          <Badge className={`text-xs ${getActivityBadgeColor(activity.type)}`}>
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
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <button className="text-xs text-blue-400 hover:text-blue-300">
                              Ver detalhes
                            </button>
                          )}
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

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Página {pagination.page} de {pagination.totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
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
  )
}