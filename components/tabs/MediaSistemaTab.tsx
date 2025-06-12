// components/tabs/MediaSistemaTab.tsx
"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  FileText, 
  Download, 
  Plus, 
  Copy, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle,
  RefreshCw
} from "lucide-react"
import { useMediaAnalysisData } from "@/hooks/useMediaAnalysisData"
import PasteDataModal from "@/components/modals/PasteDataModal"
import AddItemModal from "@/components/modals/AddItemModal"

export default function MediaSistemaTab() {
  const { data, isLoading, error, addItems, clearAll, refetch } = useMediaAnalysisData()
  const [searchTerm, setSearchTerm] = useState("")
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null)

  // Filtros
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    
    const search = searchTerm.toLowerCase()
    return data.filter(item => 
      item.codigo.toLowerCase().includes(search) ||
      item.material.toLowerCase().includes(search)
    )
  }, [data, searchTerm])

  // Estatísticas
  const stats = useMemo(() => {
    return {
      total: data.length,
      ok: data.filter(item => item.status === 'OK').length,
      atencao: data.filter(item => item.status === 'ATENÇÃO').length,
      critico: data.filter(item => item.status === 'CRÍTICO').length,
    }
  }, [data])

  // Totais
  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      quantidadeKg: acc.quantidadeKg + item.quantidadeKg,
      quantidadeCaixas: acc.quantidadeCaixas + item.quantidadeCaixas,
      estoqueAtual: acc.estoqueAtual + item.estoqueAtual,
      diferencaCaixas: acc.diferencaCaixas + item.diferencaCaixas,
    }), {
      quantidadeKg: 0,
      quantidadeCaixas: 0,
      estoqueAtual: 0,
      diferencaCaixas: 0,
    })
  }, [filteredData])

  const handleAddItems = async (items: any[]) => {
    try {
      const result = await addItems(items)
      if (result.success) {
        setPasteSuccess(`${items.length} itens adicionados com sucesso!`)
        setTimeout(() => setPasteSuccess(null), 3000)
      }
      return result
    } catch (error) {
      return { success: false, error: 'Erro ao adicionar itens' }
    }
  }

  const handleClearAll = async () => {
    if (window.confirm('Tem certeza que deseja limpar todos os dados?\n\nEsta ação não pode ser desfeita.')) {
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
            <Button onClick={refetch} className="mt-4 bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
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

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Item
          </Button>
          <Button
            onClick={() => setShowPasteModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading}
          >
            <Copy className="w-4 h-4 mr-2" />
            Colar Dados
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
            disabled={isLoading || filteredData.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            onClick={handleClearAll}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-900/20"
            disabled={isLoading || data.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Tudo
          </Button>
        </div>
      </div>

      {/* Toast de sucesso */}
      <AnimatePresence>
        {pasteSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {pasteSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
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
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
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
                  <TableRow className="border-gray-700 bg-gray-800/50">
                    <TableHead className="text-gray-300 font-bold text-sm text-center border-r border-gray-700 w-32">
                      CÓDIGO
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm border-r border-gray-700 min-w-60">
                      MATERIAL
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm text-center border-r border-gray-700 w-28">
                      Quantidade
                      <br />
                      KG
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm text-center border-r border-gray-700 w-28">
                      Quantidade
                      <br />
                      Caixas
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm text-center border-r border-gray-700 w-32">
                      Média
                      <br />
                      Sistema
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm text-center border-r border-gray-700 w-28">
                      Estoque
                      <br />
                      Atual
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm text-center border-r border-gray-700 w-28">
                      Diferença
                      <br />
                      em Caixas
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm text-center border-r border-gray-700 w-32">
                      Média
                      <br />
                      Real
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-sm text-center w-24">
                     STATUS
                   </TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredData.map((item) => (
                   <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                     <TableCell className="text-white text-sm border-r border-gray-700 font-mono text-center">
                       {item.codigo}
                     </TableCell>
                     <TableCell className="text-white text-sm border-r border-gray-700">
                       {item.material}
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-700">
                       <span className="text-blue-400 font-medium">
                         {item.quantidadeKg.toFixed(2)}
                       </span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-700">
                       <span className="text-green-400 font-medium">
                         {item.quantidadeCaixas.toFixed(2)}
                       </span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-700">
                       <span className="text-yellow-400 font-medium">
                         {item.mediaSistema.toFixed(8)}
                       </span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-700">
                       <span className="text-purple-400 font-medium">
                         {item.estoqueAtual}
                       </span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-700">
                       <span className={`font-medium ${item.diferencaCaixas > 0 ? 'text-green-400' : item.diferencaCaixas < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                         {item.diferencaCaixas}
                       </span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-700">
                       <span className="text-orange-400 font-medium">
                         {item.mediaReal.toFixed(8)}
                       </span>
                     </TableCell>
                     <TableCell className="text-center">
                       <Badge className={`${getStatusColor(item.status)} text-xs font-medium`}>
                         {item.status}
                       </Badge>
                     </TableCell>
                   </TableRow>
                 ))}
                 
                 {/* Linha de totais */}
                 {filteredData.length > 0 && (
                   <TableRow className="border-gray-600 bg-gray-800/50 font-bold">
                     <TableCell className="text-white font-bold text-sm border-r border-gray-600 text-center">
                       TOTAL
                     </TableCell>
                     <TableCell className="text-white font-bold text-sm border-r border-gray-600">
                       {filteredData.length} itens
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-600">
                       <span className="text-blue-400 font-bold">{totals.quantidadeKg.toFixed(2)}</span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-600">
                       <span className="text-green-400 font-bold">{totals.quantidadeCaixas.toFixed(2)}</span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-600">
                       <span className="text-gray-400 font-bold">-</span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-600">
                       <span className="text-purple-400 font-bold">{totals.estoqueAtual}</span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-600">
                       <span className={`font-bold ${totals.diferencaCaixas > 0 ? 'text-green-400' : totals.diferencaCaixas < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                         {totals.diferencaCaixas}
                       </span>
                     </TableCell>
                     <TableCell className="text-center text-sm border-r border-gray-600">
                       <span className="text-gray-400 font-bold">-</span>
                     </TableCell>
                     <TableCell className="text-center text-sm">
                       <span className="text-gray-400 font-bold">-</span>
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
             ? "Adicione materiais usando os botões acima"
             : "Tente ajustar os filtros de busca"
           }
         </p>
       </motion.div>
     )}

     {/* Modais */}
     <PasteDataModal
       isOpen={showPasteModal}
       onClose={() => setShowPasteModal(false)}
       onSuccess={(count) => {
         setPasteSuccess(`${count} itens adicionados com sucesso!`)
         setTimeout(() => setPasteSuccess(null), 3000)
       }}
       onAddItems={handleAddItems}
     />

     <AddItemModal
       isOpen={showAddModal}
       onClose={() => setShowAddModal(false)}
       onAddItems={handleAddItems}
     />
   </motion.div>
 )
}