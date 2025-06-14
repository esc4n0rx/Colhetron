// components/tabs/MediaSistemaTab.tsx
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
  Activity,
  Copy
} from 'lucide-react'
import { toast } from 'sonner'
import PasteDataModal from '@/components/modals/PasteDataModal'
import AddItemModal from '@/components/modals/AddItemModal'

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
  
  // Estados dos modais
  const [showPasteDataModal, setShowPasteDataModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)

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

  // Função para adicionar itens via API
  const handleAddItems = async (items: any[]) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/media-analysis/bulk-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      })

      const result = await response.json()

      if (response.ok) {
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Erro ao adicionar itens' }
      }
    } catch (error) {
      console.error('Erro ao adicionar itens:', error)
      return { success: false, error: 'Erro de conexão' }
    }
  }

  const handlePasteDataSuccess = (count: number) => {
    toast.success(`${count} itens adicionados com sucesso!`)
    fetchMediaData() // Recarregar dados
  }

  const handleAddItemSuccess = () => {
    toast.success('Item adicionado com sucesso!')
    fetchMediaData() // Recarregar dados
  }

  // CORREÇÃO: Verificar se há separação (ativa ou última) ao invés de apenas separação ativa
  const canAddItems = separationInfo !== null && separationInfo.id

  const filteredData = mediaData.filter(item =>
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (diferenca: number, quantidadeCaixas: number) => {
    const percentual = Math.abs(diferenca) / quantidadeCaixas * 100
    if (percentual <= 5) return 'bg-green-500/20 text-green-400 border-green-500/30'
    if (percentual <= 15) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-red-500/20 text-red-400 border-red-500/30'
  }

  const getStatusLabel = (diferenca: number, quantidadeCaixas: number) => {
    const percentual = Math.abs(diferenca) / quantidadeCaixas * 100
    if (percentual <= 5) return 'OK'
    if (percentual <= 15) return 'ATENÇÃO'
    return 'CRÍTICO'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header com Status da Separação */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Análise de Média do Sistema
            </CardTitle>
            <div className="flex items-center gap-2">
              {separationInfo && (
                <Badge 
                  className={`${
                    separationInfo.isActive 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {separationInfo.isActive ? 'Separação Ativa' : 'Última Separação'}
                </Badge>
              )}
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {mediaData.length} itens carregados para análise
              {separationInfo && !separationInfo.isActive && (
                <span className="ml-2 text-yellow-400">
                  (Baseado na última separação)
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles e Filtros */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por código ou material..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPasteDataModal(true)}
                disabled={!canAddItems}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Copy className="w-4 h-4 mr-2" />
                Colar Dados
              </Button>
              <Button
                onClick={() => setShowAddItemModal(true)}
                disabled={!canAddItems}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>
          </div>

          {/* CORREÇÃO: Mensagem informativa quando botões estão desabilitados */}
          {!canAddItems && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>
                  Para adicionar itens, é necessário ter uma separação ativa ou dados de separação disponíveis.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Dados */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left p-4 text-gray-300 font-medium">Código</th>
                  <th className="text-left p-4 text-gray-300 font-medium">Material</th>
                  <th className="text-right p-4 text-gray-300 font-medium">Qtd (kg)</th>
                  <th className="text-right p-4 text-gray-300 font-medium">Caixas</th>
                  <th className="text-right p-4 text-gray-300 font-medium">Média Sistema</th>
                  <th className="text-right p-4 text-gray-300 font-medium">Estoque Atual</th>
                  <th className="text-right p-4 text-gray-300 font-medium">Diferença</th>
                  <th className="text-right p-4 text-gray-300 font-medium">Média Real</th>
                  <th className="text-center p-4 text-gray-300 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-t border-gray-800">
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                      <td className="p-4">
                        <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Nenhum item encontrado</p>
                      <p className="text-sm">
                        {searchTerm 
                          ? 'Tente ajustar sua busca ou limpar o filtro'
                          : 'Carregue dados de uma separação para visualizar as médias'
                        }
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="p-4 text-white font-mono text-sm">{item.codigo}</td>
                      <td className="p-4 text-gray-300">{item.material}</td>
                      <td className="p-4 text-right text-white font-medium">
                        {item.quantidade_kg.toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-white font-medium">
                        {item.quantidade_caixas}
                      </td>
                      <td className="p-4 text-right text-blue-400 font-medium">
                        {item.media_sistema.toFixed(2)}
                      </td>
                      <td className="p-4 text-right text-green-400 font-medium">
                        {item.estoque_atual}
                      </td>
                      <td className="p-4 text-right">
                        <span className={`font-medium ${
                          item.diferenca_caixas >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.diferenca_caixas >= 0 ? '+' : ''}{item.diferenca_caixas}
                        </span>
                      </td>
                      <td className="p-4 text-right text-purple-400 font-medium">
                        {item.media_real.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <Badge className={getStatusColor(item.diferenca_caixas, item.quantidade_caixas)}>
                          {getStatusLabel(item.diferenca_caixas, item.quantidade_caixas)}
                        </Badge>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal para Colar Dados */}
      <PasteDataModal
        isOpen={showPasteDataModal}
        onClose={() => setShowPasteDataModal(false)}
        onSuccess={handlePasteDataSuccess}
        onAddItems={handleAddItems}
      />

      {/* Modal para Adicionar Item */}
      <AddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAddItems={handleAddItems}
      />
    </motion.div>
  )
}