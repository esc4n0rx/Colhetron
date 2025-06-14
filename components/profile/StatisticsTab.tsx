// components/profile/StatisticsTab.tsx
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  Package, 
  Clock, 
  Award, 
  Target,
  Users,
  Activity,
  Zap
} from 'lucide-react'
import { toast } from 'sonner'

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

export default function StatisticsTab() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/user-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      toast.error('Erro ao carregar estatísticas')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="bg-gray-900/50 border-gray-800 animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

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

  return (
    <div className="space-y-6">
      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total de Separações */}
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

        {/* Média de Itens */}
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

        {/* Tempo Médio */}
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

        {/* Ranking */}
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

        {/* Eficiência */}
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

        {/* Dias Ativos */}
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
   </div>
 )
}