// components/tabs/PosFaturamentoTab.tsx
"use client"

import { useState, useMemo } from 'react'
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
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { toast } from 'sonner'
import { usePosFaturamentoData } from '@/hooks/usePosFaturamentoData'
import PasteDataModal from '@/components/modals/PasteDataModal'
import { PosFaturamentoComparacao } from '@/types/pos-faturamento'

export default function PosFaturamentoTab() {
  const { data, isLoading, error, separationInfo, canAddItems, addItems, refresh, clearData } = usePosFaturamentoData()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showPasteDataModal, setShowPasteDataModal] = useState(false)

  // Filtrar e ordenar dados
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    
    const search = searchTerm.toLowerCase()
    return data.filter(item => 
      item.codigo.toLowerCase().includes(search) ||
      item.material.toLowerCase().includes(search)
    )
  }, [data, searchTerm])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
    toast.success('Dados atualizados com sucesso!')
  }

  const handleClearData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados de pós faturamento?')) {
      return
    }

    setIsClearing(true)
    const result = await clearData()
    setIsClearing(false)
    
    if (result.success) {
      toast.success('Dados limpos com sucesso!')
    } else {
      toast.error(result.error || 'Erro ao limpar dados')
    }
  }

  const handlePasteData = async (items: any[]) => {
    const posFaturamentoItems = items.map(item => ({
      codigo: item.codigo,
      material: item.material,
      quantidade_kg: item.quantidadeKg || 0,
      quantidade_caixas: item.quantidadeCaixas || 0,
      estoque_atual: item.quantidadeCaixas || 0
    }))

    const result = await addItems(posFaturamentoItems)
    
    if (result.success) {
      toast.success(`${items.length} itens adicionados com sucesso!`)
    } else {
      toast.error(result.error || 'Erro ao adicionar itens')
    }
    
    return result
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'faturado':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Faturado
          </Badge>
        )
      case 'parcial':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Parcial
          </Badge>
        )
      case 'zerado':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Minus className="w-3 h-3 mr-1" />
            Zerado
          </Badge>
        )
      case 'novo':
        return (
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            <Plus className="w-3 h-3 mr-1" />
            Novo
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            {status}
          </Badge>
        )
    }
  }

  const getDiferencaIcon = (diferenca: number) => {
    if (diferenca > 0) {
      return <TrendingUp className="w-4 h-4 text-green-400" />
    } else if (diferenca < 0) {
      return <TrendingDown className="w-4 h-4 text-red-400" />
    } else {
      return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  const getDiferencaColor = (diferenca: number) => {
    if (diferenca > 0) return 'text-green-400'
    if (diferenca < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center py-12"
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
          <p className="text-gray-400">{error}</p>
          <Button onClick={handleRefresh} className="mt-4">
            Tentar novamente
          </Button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold apple-font text-white">
                  Pós Faturamento
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  Análise comparativa dos estoques após faturamento
                </p>
              </div>
              {separationInfo && (
                <Badge className={
                  separationInfo.isActive ? 
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasteDataModal(true)}
                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Colar Dados
                </Button>
              )}
              {data.length > 0 && (
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
                <span className="font-medium text-white">{filteredData.length}</span> itens
                {searchTerm && (
                  <span> (filtrados de {data.length})</span>
                )}
              </div>
              {!canAddItems && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">
                    {!separationInfo ? 'Crie uma separação primeiro.' : 'Separação não está ativa.'}
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
                  <th className="p-4 text-gray-300 font-medium text-right">Estoque Atual</th>
                  <th className="p-4 text-gray-300 font-medium text-right">Diferença</th>
                  <th className="p-4 text-gray-300 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center">
                        <div className="flex items-center justify-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mr-3"
                          />
                          <span className="text-gray-400">Carregando dados...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-400">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">Nenhum item encontrado</p>
                        <p className="text-sm">
                          {searchTerm
                            ? 'Tente ajustar sua busca ou limpar o filtro'
                            : data.length === 0
                              ? 'Use "Colar Dados" para começar a análise de pós faturamento'
                              : 'Todos os itens foram filtrados pela busca'
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, index) => (
                      <motion.tr
                        key={`${item.codigo}-${index}`}
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
                          {item.quantidade_caixas_antes || 0}
                        </td>
                        <td className="p-4 text-right text-white font-medium">
                          {item.estoque_atual}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {getDiferencaIcon(item.diferenca)}
                            <span className={`font-medium ${getDiferencaColor(item.diferenca)}`}>
                              {item.diferenca > 0 ? '+' : ''}{item.diferenca}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {getStatusBadge(item.status)}
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

      {/* Modal de Colar Dados */}
      <PasteDataModal
        isOpen={showPasteDataModal}
        onClose={() => setShowPasteDataModal(false)}
        onSuccess={(count) => {
          toast.success(`${count} itens adicionados com sucesso!`)
          setShowPasteDataModal(false)
        }}
        onAddItems={handlePasteData}
      />
    </motion.div>
  )
}