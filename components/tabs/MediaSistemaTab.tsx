// components/tabs/MediaSistemaTab.tsx - Atualização
"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Package,
  Database,
  RefreshCw,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'

interface MediaItem {
  id: string | number
  codigo: string
  material: string
  quantidade_kg: number
  quantidade_caixas: number
  media_sistema: number
  estoque_atual: number
  diferenca_caixas: number
  media_real: number
  separation_id: string
}

interface SeparationInfo {
  id: string
  isActive: boolean
  status: 'active' | 'completed'
}

export default function MediaSistemaTab() {
  const [mediaData, setMediaData] = useState<MediaItem[]>([])
  const [separationInfo, setSeparationInfo] = useState<SeparationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchMediaData()
  }, [])

  const fetchMediaData = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        toast.error('Token de autenticação não encontrado')
        return
      }

      const response = await fetch('/api/media-analysis/data', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar dados')
      }

      const result = await response.json()
      setMediaData(result.data || [])
      setSeparationInfo(result.separationInfo || null)
      
      if (result.data.length === 0) {
        toast.info(result.message || 'Nenhum item encontrado')
      }
    } catch (error) {
      console.error('Erro ao buscar dados da média:', error)
      toast.error('Erro ao carregar dados da média do sistema')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchMediaData()
    setIsRefreshing(false)
    toast.success('Dados atualizados com sucesso!')
  }

  const filteredData = mediaData.filter(item =>
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const calculateStats = () => {
    if (filteredData.length === 0) return { total: 0, mediaGeral: 0, variacaoPositiva: 0, variacaoNegativa: 0 }
    
    const total = filteredData.length
    const mediaGeral = filteredData.reduce((sum, item) => sum + item.media_sistema, 0) / total
    const variacaoPositiva = filteredData.filter(item => item.diferenca_caixas > 0).length
    const variacaoNegativa = filteredData.filter(item => item.diferenca_caixas < 0).length
    
    return { total, mediaGeral, variacaoPositiva, variacaoNegativa }
  }

  const stats = calculateStats()

  const getSeparationStatusBadge = () => {
    if (!separationInfo) return null

    return (
      <Badge
        className={`ml-2 ${
          separationInfo.isActive
            ? 'bg-green-500/20 text-green-400 border-green-500/30'
            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }`}
      >
        <Activity className="w-3 h-3 mr-1" />
        {separationInfo.isActive ? 'Separação Ativa' : 'Última Separação'}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Carregando dados da média do sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com status da separação */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center">
          <h2 className="text-2xl font-bold text-white apple-font">Média do Sistema</h2>
          {getSeparationStatusBadge()}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isRefreshing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </motion.div>

      {/* Cards de Estatísticas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Itens</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Database className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Média Geral</p>
                <p className="text-2xl font-bold text-white">{stats.mediaGeral.toFixed(2)} kg</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Variação ↗</p>
                <p className="text-2xl font-bold text-green-400">{stats.variacaoPositiva}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Variação ↘</p>
                <p className="text-2xl font-bold text-red-400">{stats.variacaoNegativa}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filtros e Busca */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por código ou material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </motion.div>

      {/* Tabela de Dados */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Análise de Média - {filteredData.length} itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">
                  {searchTerm ? 'Nenhum item encontrado com os filtros aplicados' : 'Nenhum item disponível'}
                </p>
                {!separationInfo?.isActive && (
                  <p className="text-gray-500 text-sm mt-2">
                    Crie uma nova separação para visualizar dados atualizados
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left text-gray-300 font-semibold py-3 px-2">Código</th>
                        <th className="text-left text-gray-300 font-semibold py-3 px-2">Material</th>
                        <th className="text-right text-gray-300 font-semibold py-3 px-2">Qtd KG</th>
                        <th className="text-right text-gray-300 font-semibold py-3 px-2">Qtd Caixas</th>
                        <th className="text-right text-gray-300 font-semibold py-3 px-2">Média Sistema</th>
                        <th className="text-right text-gray-300 font-semibold py-3 px-2">Estoque Atual</th>
                        <th className="text-right text-gray-300 font-semibold py-3 px-2">Diferença</th>
                        <th className="text-right text-gray-300 font-semibold py-3 px-2">Média Real</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="py-3 px-2">
                            <span className="text-white font-mono text-sm">{item.codigo}</span>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-gray-300 text-sm">{item.material}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-white font-semibold">{item.quantidade_kg.toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-white font-semibold">{item.quantidade_caixas}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-blue-400 font-semibold">{item.media_sistema.toFixed(2)}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-white font-semibold">{item.estoque_atual}</span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className={`font-semibold ${
                              item.diferenca_caixas > 0 ? 'text-green-400' :
                              item.diferenca_caixas < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {item.diferenca_caixas > 0 ? '+' : ''}{item.diferenca_caixas}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="text-purple-400 font-semibold">{item.media_real.toFixed(2)}</span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}