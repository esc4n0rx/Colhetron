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
  RefreshCw,
  Copy,
  AlertCircle,
  Package,
  Trash2,
  Activity,
  AlertTriangle
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
  status?: string
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
  const [isClearing, setIsClearing] = useState(false)
  
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
      
      if (result.message) {
        toast.info(result.message)
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

  // components/tabs/MediaSistemaTab.tsx - handleAddItems corrigido
const handleAddItems = async (items: any[]) => {
  try {
    const token = localStorage.getItem('colhetron_token')
    if (!token) {
      throw new Error('Token de autorização não encontrado')
    }

    // CORREÇÃO: Mapear corretamente os nomes das propriedades
    const processedItems = items.map(item => {
      // Calcular média do sistema
      const quantidadeKg = Number(item.quantidadeKg || item.quantidade_kg || 0)
      const quantidadeCaixas = Number(item.quantidadeCaixas || item.quantidade_caixas || 0)
      const mediaSistema = quantidadeCaixas > 0 ? quantidadeKg / quantidadeCaixas : 0

      return {
        codigo: String(item.codigo || '').trim(),
        material: String(item.material || '').trim(),
        quantidade_kg: quantidadeKg,  // Nome correto para a API
        quantidade_caixas: quantidadeCaixas,  // Nome correto para a API
        media_sistema: Number(mediaSistema.toFixed(2))
      }
    })

    console.log('Dados processados para API:', processedItems)

    const response = await fetch('/api/media-analysis/bulk-add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ items: processedItems }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Erro da API:', errorData)
      throw new Error(errorData.error || 'Falha ao adicionar itens')
    }

    const result = await response.json()
    toast.success(result.message)
    await fetchMediaData()
    
    return { success: true }
  } catch (error) {
    console.error('Erro ao adicionar itens:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

  const handleClearData = async () => {
    // Confirmação dupla para evitar exclusões acidentais
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Tem certeza que deseja limpar todos os dados da análise de médias?\n\n' +
      'Esta ação irá:\n' +
      '• Remover todos os itens carregados\n' +
      '• Permitir fazer novos uploads\n' +
      '• NÃO pode ser desfeita\n\n' +
      'Clique em OK para confirmar a limpeza.'
    )

    if (!confirmed) return

    try {
      setIsClearing(true)
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch('/api/media-analysis/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao limpar dados')
      }

      const result = await response.json()
      
      // Limpar estado local
      setMediaData([])
      setSearchTerm('')
      
      toast.success('✅ ' + result.message + ' Você pode fazer novos uploads agora.')
      
    } catch (error) {
      console.error('Erro ao limpar dados:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao limpar dados')
    } finally {
      setIsClearing(false)
    }
  }

  const handlePasteDataSuccess = (count: number) => {
    toast.success(`${count} itens adicionados com sucesso!`)
    fetchMediaData()
  }

  // Verificar se pode adicionar itens (tem separação ativa)
  const canAddItems = separationInfo?.isActive || false

  // Filtrar dados com base na busca
  const filteredData = mediaData.filter(item =>
    item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.material.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (diferenca: number, quantidade: number) => {
    if (quantidade === 0) return 'bg-red-500/20 text-red-400 border-red-400/30'
    const percentual = Math.abs(diferenca) / quantidade
    if (percentual > 0.2) return 'bg-red-500/20 text-red-400 border-red-400/30'
    if (percentual > 0.1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
    return 'bg-green-500/20 text-green-400 border-green-400/30'
  }

  const getStatusLabel = (diferenca: number, quantidade: number) => {
    if (quantidade === 0) return 'CRÍTICO'
    const percentual = Math.abs(diferenca) / quantidade
    if (percentual > 0.2) return 'CRÍTICO'
    if (percentual > 0.1) return 'ATENÇÃO'
    return 'OK'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
        <span className="ml-3 text-white">Carregando análise de médias...</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header da Análise */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="text-xl font-bold text-white flex items-center">
                <Activity className="w-6 h-6 mr-2 text-blue-400" />
                Análise de Médias do Sistema
              </CardTitle>
              {separationInfo && (
                <Badge className={separationInfo.isActive ? 
                  'bg-green-500/20 text-green-400 border-green-400/30' : 
                  'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
                }>
                  {separationInfo.isActive ? 'Separação Ativa' : 'Última Separação'}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="sm"
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              {/* BOTÃO DE LIMPEZA */}
              {mediaData.length > 0 && (
                <Button
                  onClick={handleClearData}
                  disabled={isClearing}
                  size="sm"
                  variant="outline"
                  className="border-red-700 text-red-400 hover:bg-red-900/20 hover:border-red-600"
                >
                  {isClearing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        className="w-4 h-4 mr-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.div>
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Limpar Dados
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {mediaData.length > 0 ? (
                <>
                  {mediaData.length} itens carregados para análise
                  {separationInfo && !separationInfo.isActive && (
                    <span className="ml-2 text-yellow-400">
                      (Baseado na última separação)
                    </span>
                  )}
                </>
              ) : (
                'Nenhum item carregado. Use os botões abaixo para adicionar dados à análise.'
              )}
            </div>
            {/* Indicador visual de que há dados para limpar */}
            {mediaData.length > 0 && (
              <div className="text-xs text-gray-500 flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Use "Limpar Dados" para fazer novos uploads
              </div>
            )}
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
                  disabled={mediaData.length === 0}
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

          {/* Mensagem informativa quando botões estão desabilitados */}
          {!canAddItems && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>
                  Para adicionar itens, é necessário ter uma separação ativa. 
                  {!separationInfo && ' Crie uma separação primeiro.'}
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
              <thead className="border-b border-gray-800">
                <tr className="text-left">
                  <th className="p-4 text-gray-300 font-medium">Código</th>
                  <th className="p-4 text-gray-300 font-medium">Material</th>
                  <th className="p-4 text-gray-300 font-medium text-right">Qtd KG</th>
                  <th className="p-4 text-gray-300 font-medium text-right">Qtd Caixas</th>
                  <th className="p-4 text-gray-300 font-medium text-right">Média Sistema</th>
                  <th className="p-4 text-gray-300 font-medium text-right">Estoque Atual</th>
                  <th className="p-4 text-gray-300 font-medium text-right">Diferença</th>
                  <th className="p-4 text-gray-300 font-medium text-right">Média Real</th>
                  <th className="p-4 text-gray-300 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Nenhum item encontrado</p>
                      <p className="text-sm">
                        {searchTerm 
                          ? 'Tente ajustar sua busca ou limpar o filtro'
                          : mediaData.length === 0
                            ? 'Use "Colar Dados" ou "Adicionar Item" para começar a análise'
                            : 'Todos os itens foram filtrados pela busca'
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