// components/profile/RankingTab.tsx
"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Trophy, 
  Medal, 
  Award, 
  TrendingUp,
  Crown,
  Star,
  Target
} from 'lucide-react'
import { toast } from 'sonner'

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

interface RankingData {
  ranking: RankingUser[]
  currentUser: RankingUser | null
  totalUsers: number
}

export default function RankingTab() {
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRanking()
  }, [])

  const fetchRanking = async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/ranking', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar ranking')
      }

      const data = await response.json()
      setRankingData(data)
    } catch (error) {
      console.error('Erro ao buscar ranking:', error)
      toast.error('Erro ao carregar ranking')
    } finally {
      setIsLoading(false)
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

  const getRankingColor = (position: number) => {
    switch (position) {
      case 1:
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
      case 2:
        return 'text-gray-300 bg-gray-300/10 border-gray-300/30'
      case 3:
        return 'text-orange-400 bg-orange-400/10 border-orange-400/30'
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30'
    }
  }

  if (isLoading) {
    return (
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
    )
  }

  if (!rankingData) return null

  return (
    <div className="space-y-6">
      {/* Sua Posição */}
      {rankingData.currentUser && (
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
                    {rankingData.currentUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  {getRankingIcon(rankingData.currentUser.position)}
                  <span className="text-2xl font-bold text-white">
                    #{rankingData.currentUser.position}
                  </span>
                  <Badge className={getRankingColor(rankingData.currentUser.position)}>
                    Top {Math.round((1 - (rankingData.currentUser.position / rankingData.totalUsers)) * 100)}%
                  </Badge>
                </div>
                <h3 className="text-xl font-semibold text-white mb-1">
                  {rankingData.currentUser.name}
                </h3>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {rankingData.currentUser.separacoesFinalizadas}
                    </div>
                    <div className="text-xs text-gray-400">Finalizadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {rankingData.currentUser.mediaItemsSeparados}
                    </div>
                    <div className="text-xs text-gray-400">Itens/Separação</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">
                      {rankingData.currentUser.eficiencia}%
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
          {rankingData.ranking.slice(0, 10).map((user, index) => (
            <div
              key={user.userId}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${
                user.userId === rankingData.currentUser?.userId
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
                    {user.userId === rankingData.currentUser?.userId && (
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
              {rankingData.ranking[0]?.separacoesFinalizadas || 0}
            </div>
            <div className="text-sm text-gray-400">Líder do ranking</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-6 text-center">
            <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {Math.round(rankingData.ranking.reduce((acc, user) => acc + user.eficiencia, 0) / rankingData.ranking.length) || 0}%
            </div>
            <div className="text-sm text-gray-400">Eficiência média</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-6 text-center">
            <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {rankingData.totalUsers}
            </div>
            <div className="text-sm text-gray-400">Total de usuários</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}