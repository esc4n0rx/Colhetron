"use client"

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  RefreshCw,
  Copy,
  AlertCircle,
  Package,
  Trash2,
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { useMediaAnalysisData } from '@/hooks/useMediaAnalysisData'
import CustomMediaModal from '@/components/modals/CustomMediaModal'
import PasteDataModal from '@/components/modals/PasteDataModal'
import AddItemModal from '@/components/modals/AddItemModal'
import ForceStatusModal from '@/components/modals/ForceStatusModal'

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
  forcedStatus?: boolean
  forcedReason?: string
  customMedia?: boolean
  customMediaValue?: number
  customMediaUpdatedAt?: string
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
  const [selectedItemForCustomMedia, setSelectedItemForCustomMedia] = useState<{
    id: string
    codigo: string
    material: string
    mediaSistema: number
    quantidadeKg: number
    quantidadeCaixas: number
    isCustomMedia?: boolean
  } | null>(null)

  // Estados dos modais
  const [showPasteDataModal, setShowPasteDataModal] = useState(false)
  const [showAddItemModal, setShowAddItemModal] = useState(false)
  const [showForceStatusModal, setShowForceStatusModal] = useState(false)
  const [showCustomMediaModal, setShowCustomMediaModal] = useState(false)
  const [selectedItemForForce, setSelectedItemForForce] = useState<{
    id: string
    codigo: string
    material: string
    status: string
  } | null>(null)

  const { forceStatusOK, updateCustomMedia } = useMediaAnalysisData()

  useEffect(() => {
    fetchMediaData()
  }, [])

  const handleCustomMediaClick = (item: MediaItem) => {
    setSelectedItemForCustomMedia({
      id: String(item.id),
      codigo: item.codigo,
      material: item.material,
      mediaSistema: item.media_sistema,
      quantidadeKg: item.quantidade_kg,
      quantidadeCaixas: item.quantidade_caixas,
      isCustomMedia: item.customMedia || false
    })
    setShowCustomMediaModal(true)
  }

  const handleCustomMediaConfirm = async (newMedia: number) => {
    if (!selectedItemForCustomMedia) return

    try {
      await updateCustomMedia(selectedItemForCustomMedia.id, newMedia)
      toast.success('Média personalizada atualizada com sucesso!')
      await fetchMediaData() // Recarregar dados
    } catch (error) {
      console.error('Erro ao atualizar média personalizada:', error)
      toast.error('Erro ao atualizar média personalizada')
      throw error // Re-throw para o modal tratar
    }
  }

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

  const handleAddItems = async (items: any[]) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const processedItems = items.map(item => {
        const quantidadeKg = Number(item.quantidadeKg || item.quantidade_kg || 0)
        const quantidadeCaixas = Number(item.quantidadeCaixas || item.quantidade_caixas || 0)
        const mediaSistema = quantidadeCaixas > 0 ? quantidadeKg / quantidadeCaixas : 0

        return {
          codigo: String(item.codigo || '').trim(),
          material: String(item.material || '').trim(),
          quantidade_kg: quantidadeKg,
          quantidade_caixas: quantidadeCaixas,
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

      setMediaData([])
      setSearchTerm('')

      toast.success('✅ ' + result.message + ' Você pode fazer novos uploads agora.')

    } catch (error) {
      console.error('Erro ao limpar dados:', error)
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsClearing(false)
    }
  }

  const handlePasteDataSuccess = (count: number) => {
    toast.success(`${count} itens adicionados com sucesso!`)
    fetchMediaData()
  }

  const handleForceStatus = (item: MediaItem) => {
    if (item.status === 'OK') {
      toast.info('Este item já possui status OK')
      return
    }

    setSelectedItemForForce({
      id: String(item.id),
      codigo: item.codigo,
      material: item.material,
      status: item.status || 'N/A'
    })
    setShowForceStatusModal(true)
  }

  const handleForceStatusConfirm = async (reason?: string) => {
    if (!selectedItemForForce) return

    try {
      await forceStatusOK(selectedItemForForce.id, reason)
      toast.success(`Status do item ${selectedItemForForce.codigo} alterado para OK com sucesso!`)
      await fetchMediaData()
    } catch (error) {
      console.error('Erro ao forçar status:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar status')
    }
  }

  const canAddItems = separationInfo?.isActive || false

  // AJUSTE: Filtra e depois ordena os dados em ordem alfabética pelo nome do material.
  const sortedAndFilteredData = useMemo(() => {
    return mediaData
      .filter(item =>
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.material.localeCompare(b.material))
  }, [mediaData, searchTerm])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRÍTICO':
        return 'bg-red-500/20 text-red-400 border-red-400/30'
      case 'ATENÇÃO':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
      case 'OK':
        return 'bg-green-500/20 text-green-400 border-green-400/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30'
    }
  }

  const getStatusLabel = (status: string) => {
    return status || 'N/A'
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
                  {separationInfo.isActive ? 'Separação Ativa' : 'Separação Finalizada'}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              {canAddItems && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasteDataModal(true)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Colar Dados
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddItemModal(true)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Item
                  </Button>
                </>
              )}
              {mediaData.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClearData}
                  disabled={isClearing}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isClearing ? 'Limpando...' : 'Limpar Dados'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">
                <span className="font-medium text-white">{sortedAndFilteredData.length}</span> itens
                {searchTerm && (
                  <span> (filtrados de {mediaData.length})</span>
                )}
              </div>
              {!canAddItems && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {!separationInfo && ' Crie uma separação primeiro.'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                aria-label="Buscar por código ou material"
                placeholder="Buscar por código ou material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
              />
            </div>
          </div>
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
                  <th className="p-4 text-gray-300 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {sortedAndFilteredData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-gray-400">
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
                    sortedAndFilteredData.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
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
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleCustomMediaClick(item)}
                              className="group flex items-center space-x-1 hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                              title="Clique para editar média personalizada"
                              aria-label={`Editar média do item ${item.codigo}`}
                            >
                              <span className={`font-medium ${item.customMedia ? 'text-purple-400' : 'text-blue-400'
                                }`}>
                                {item.media_sistema.toFixed(2)}
                              </span>
                              {item.customMedia && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                  Custom
                                </Badge>
                              )}
                              <Settings className="w-3 h-3 text-gray-500 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </div>
                        </td>
                        <td className="p-4 text-right text-green-400 font-medium">
                          {item.estoque_atual}
                        </td>
                        <td className="p-4 text-right">
                          <span className={`font-medium ${item.diferenca_caixas >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                            {item.diferenca_caixas >= 0 ? '+' : ''}{item.diferenca_caixas}
                          </span>
                        </td>
                        <td className="p-4 text-right text-purple-400 font-medium">
                          {item.media_real.toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center space-y-1">
                            <Badge className={getStatusColor(item.status || 'OK')}>
                              {getStatusLabel(item.status || 'OK')}
                            </Badge>
                            {item.forcedStatus && (
                              <div className="flex items-center space-x-1" title={item.forcedReason}>
                                <Settings className="w-3 h-3 text-blue-400" />
                                <span className="text-xs text-blue-400">Forçado</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {item.status !== 'OK' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleForceStatus(item)}
                              className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
                              aria-label={`Forçar status OK para o item ${item.codigo}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Forçar OK
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {item.forcedStatus ? 'Status Forçado' : 'Status OK'}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      <PasteDataModal
        isOpen={showPasteDataModal}
        onClose={() => setShowPasteDataModal(false)}
        onSuccess={handlePasteDataSuccess}
        onAddItems={handleAddItems}
      />

      <AddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        onAddItems={handleAddItems}
      />

      <ForceStatusModal
        isOpen={showForceStatusModal}
        onClose={() => setShowForceStatusModal(false)}
        onConfirm={handleForceStatusConfirm}
        item={selectedItemForForce}
      />

      <CustomMediaModal
        isOpen={showCustomMediaModal}
        onClose={() => {
          setShowCustomMediaModal(false)
          setSelectedItemForCustomMedia(null)
        }}
        onConfirm={handleCustomMediaConfirm}
        item={selectedItemForCustomMedia}
      />
    </motion.div>
  )
}