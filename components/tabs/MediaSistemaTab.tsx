// components/tabs/MediaSistemaTab.tsx
"use client"

import { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Plus, 
  Trash2, 
  Upload, 
  Download, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Copy,
  FileText,
  Calculator
} from "lucide-react"
import { useMediaAnalysisData, type MediaAnalysisItem } from "@/hooks/useMediaAnalysisData"
import PasteDataModal from "@/components/modals/PasteDataModal"
import AddItemModal from "@/components/modals/AddItemModal"

interface EditableInputProps {
  value: number
  onSave: (value: number) => void
  disabled?: boolean
  className?: string
}

function EditableInput({ value, onSave, disabled, className = "" }: EditableInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const numValue = parseFloat(tempValue) || 0
      onSave(numValue)
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setTempValue(value.toString())
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    const numValue = parseFloat(tempValue) || 0
    onSave(numValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Input
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`h-6 text-center text-xs bg-gray-800 border-blue-500 text-white ${className}`}
        autoFocus
        disabled={disabled}
        type="number"
        step="0.01"
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`h-6 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-xs transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } text-white ${className}`}
    >
      {value.toFixed(2)}
    </div>
  )
}

export default function MediaSistemaTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null)
  
  const { 
    data, 
    isLoading, 
    error, 
    addItems, 
    updateItem, 
    deleteItem, 
    clearAll 
  } = useMediaAnalysisData()

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    
    return data.filter(item => 
      item.material.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.codigo.includes(searchTerm)
    )
  }, [data, searchTerm])

  // Calcular totais
  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      quantidadeKg: acc.quantidadeKg + item.quantidadeKg,
      quantidadeCaixas: acc.quantidadeCaixas + item.quantidadeCaixas,
      estoqueAtual: acc.estoqueAtual + item.estoqueAtual,
      diferencaCaixas: acc.diferencaCaixas + item.diferencaCaixas
    }), {
      quantidadeKg: 0,
      quantidadeCaixas: 0,
      estoqueAtual: 0,
      diferencaCaixas: 0
    })
  }, [filteredData])

  // Estatísticas
  const stats = useMemo(() => {
    const total = filteredData.length
    const ok = filteredData.filter(item => item.status === 'OK').length
    const atencao = filteredData.filter(item => item.status === 'ATENÇÃO').length
    const critico = filteredData.filter(item => item.status === 'CRÍTICO').length

    return { total, ok, atencao, critico }
  }, [filteredData])

  const handleItemUpdate = useCallback(async (id: string, field: keyof MediaAnalysisItem, value: number) => {
    const result = await updateItem(id, { [field]: value })
    if (!result.success && result.error) {
      console.error('Erro ao atualizar item:', result.error)
    }
  }, [updateItem])

  const handlePasteSuccess = (count: number) => {
    setPasteSuccess(`${count} itens adicionados com sucesso!`)
    setTimeout(() => setPasteSuccess(null), 3000)
  }

  const handleClearAll = async () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      const result = await clearAll()
      if (result.success) {
        setPasteSuccess('Todos os dados foram limpos!')
        setTimeout(() => setPasteSuccess(null), 3000)
      }
    }
  }

  const handleExport = () => {
    const csvContent = [
      ['CÓDIGO', 'MATERIAL', 'Quantidade KG', 'Quantidade Caixas', 'Média Sistema', 'Estoque Atual', 'Diferença em Caixas', 'Média Real', 'STATUS'],
      ...filteredData.map(item => [
        item.codigo,
        item.material,
        item.quantidadeKg.toFixed(2),
        item.quantidadeCaixas.toFixed(2),
        item.mediaSistema.toFixed(8),
        item.estoqueAtual,
        item.diferencaCaixas,
        item.mediaReal.toFixed(8),
        item.status
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analise_medias_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK':
        return "bg-green-500/20 text-green-400 border-green-500/30"
      case 'ATENÇÃO':
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      case 'CRÍTICO':
        return "bg-red-500/20 text-red-400 border-red-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-400">{error}</p>
          </div>
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold apple-font text-white">Análise de Médias</h2>
          <p className="text-gray-400">Análise comparativa entre médias do sistema e estoque atual</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowPasteModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Copy className="w-4 h-4 mr-2" />
            Colar Dados
          </Button>
          
          <Button
            onClick={() => setShowAddModal(true)}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>

          <Button
            onClick={handleExport}
            disabled={filteredData.length === 0}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>

          <Button
            onClick={handleClearAll}
            disabled={data.length === 0}
            variant="outline"
            className="bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600/30 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar
          </Button>
        </div>
      </div>

      {/* Mensagem de Sucesso */}
      <AnimatePresence>
        {pasteSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center space-x-2 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg p-3"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{pasteSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total de Itens</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Calculator className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Status OK</p>
                <p className="text-2xl font-bold text-green-400">{stats.ok}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Atenção</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.atencao}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Crítico</p>
                <p className="text-2xl font-bold text-red-400">{stats.critico}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar por material ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando análise de médias...</span>
        </div>
      )}

      {/* Tabela */}
      {!isLoading && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Análise de Médias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 bg-yellow-200">
                    <TableHead className="text-gray-800 font-bold text-sm text-center border-r border-gray-300 w-20">
                      CÓDIGO
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm border-r border-gray-300 min-w-60">
                      MATERIAL
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm text-center border-r border-gray-300 w-24">
                      Quantidade
                      <br />
                      KG
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm text-center border-r border-gray-300 w-24">
                      Quantidade
                      <br />
                      Caixas
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm text-center border-r border-gray-300 w-24 bg-yellow-200">
                      Média Sistema
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm text-center border-r border-gray-300 w-24 bg-yellow-200">
                      Estoque Atual
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm text-center border-r border-gray-300 w-24 bg-yellow-200">
                      Diferença
                      <br />
                      em Caixas
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm text-center border-r border-gray-300 w-24 bg-yellow-200">
                      Média Real
                    </TableHead>
                    <TableHead className="text-gray-800 font-bold text-sm text-center w-20 bg-yellow-200">
                      STATUS
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id} className="border-gray-300 hover:bg-gray-50 transition-colors">
                      <TableCell className="text-gray-800 text-xs border-r border-gray-300 font-medium text-center">
                        {item.codigo}
                      </TableCell>
                      <TableCell className="text-gray-800 text-xs border-r border-gray-300">
                        {item.material}
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-300 p-1">
                        <EditableInput
                          value={item.quantidadeKg}
                          onSave={(value) => handleItemUpdate(item.id, 'quantidadeKg', value)}
                          className="text-gray-800"
                        />
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-300 p-1">
                        <EditableInput
                          value={item.quantidadeCaixas}
                          onSave={(value) => handleItemUpdate(item.id, 'quantidadeCaixas', value)}
                          className="text-gray-800"
                        />
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-300 bg-yellow-100">
                        <span className="text-gray-800 font-semibold text-xs">
                          {item.mediaSistema.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-300 bg-yellow-100">
                        <span className="text-gray-800 font-semibold text-xs">
                          {item.estoqueAtual}
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-300 bg-yellow-100">
                        <span className="text-gray-800 font-semibold text-xs">
                          {item.diferencaCaixas}
                        </span>
                      </TableCell>
                      <TableCell className="text-center border-r border-gray-300 bg-yellow-100">
                        <span className="text-gray-800 font-semibold text-xs">
                          {item.mediaReal.toFixed(8)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center bg-yellow-100">
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Linha de Totais */}
                  {filteredData.length > 0 && (
                    <TableRow className="bg-gray-200 border-t-2 border-gray-400">
                      <TableCell className="text-gray-800 font-bold text-xs border-r border-gray-300 text-center">
                        TOTAL
                      </TableCell>
                      <TableCell className="text-gray-800 font-bold text-xs border-r border-gray-300">
                        {filteredData.length} itens
                      </TableCell>
                      <TableCell className="text-center text-xs border-r border-gray-300">
                        <span className="text-gray-800 font-bold">{totals.quantidadeKg.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs border-r border-gray-300">
                        <span className="text-gray-800 font-bold">{totals.quantidadeCaixas.toFixed(2)}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-200">
                        <span className="text-gray-800 font-bold">-</span>
                      </TableCell>
                      <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-200">
                        <span className="text-gray-800 font-bold">{totals.estoqueAtual}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-200">
                        <span className="text-gray-800 font-bold">{totals.diferencaCaixas}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-200">
                        <span className="text-gray-800 font-bold">-</span>
                      </TableCell>
                      <TableCell className="text-center text-xs bg-yellow-200">
                        <span className="text-gray-800 font-bold">-</span>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && filteredData.length === 0 && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Nenhum material encontrado</p>
          <p className="text-gray-500 text-sm">
            {data.length === 0 
              ? "Use o botão 'Colar Dados' para importar dados do Excel" 
              : "Tente ajustar os filtros de busca"
            }
          </p>
        </motion.div>
      )}

      {/* Modais */}
      <PasteDataModal
        isOpen={showPasteModal}
        onClose={() => setShowPasteModal(false)}
        onSuccess={handlePasteSuccess}
        onAddItems={addItems}
      />

      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddItems={addItems}
      />
    </motion.div>
  )
}