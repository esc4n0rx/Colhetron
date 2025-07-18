// components/tabs/PedidosGeradosTab.tsx
"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Search,
  RefreshCw,
  Copy,
  AlertCircle,
  Package,
  Trash2,
  AlertTriangle,
  Plus,
  FileText,
  Calendar,
  User
} from 'lucide-react'
import { toast } from 'sonner'
import { usePedidosGeradosData } from '@/hooks/usePedidosGeradosData'
import { PedidosGeradosItem } from '@/types/pedidos-gerados'

export default function PedidosGeradosTab() {
  const { data, isLoading, error, separationInfo, canAddItems, addItems, refresh, clearData } = usePedidosGeradosData()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    pedido: '',
    remessa: '',
    dados_adicionais: ''
  })

  // Filtrar dados
  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    
    const search = searchTerm.toLowerCase()
    return data.filter(item => 
      item.pedido.toLowerCase().includes(search) ||
      item.remessa.toLowerCase().includes(search) ||
      (item.dados_adicionais && item.dados_adicionais.toLowerCase().includes(search))
    )
  }, [data, searchTerm])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
    toast.success('Dados atualizados com sucesso!')
  }

  const handleClearData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados de pedidos gerados?')) {
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

  const handleSubmitMultiple = async (items: any[]) => {
    setIsSubmitting(true)
    const result = await addItems(items)
    setIsSubmitting(false)
    
    if (result.success) {
      toast.success(`${items.length} pedidos adicionados com sucesso!`)
    } else {
      toast.error(result.error || 'Erro ao adicionar pedidos')
    }
  }

  const handlePasteData = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      
      if (!clipboardText.trim()) {
        toast.error('Área de transferência vazia')
        return
      }

      // Processar dados colados no formato simples: PEDIDO REMESSA
      const lines = clipboardText.trim().split('\n')
      const processedItems = []
      
      for (const line of lines) {
        if (!line.trim()) continue
        
        // Separar por espaços em branco (pode ser espaço ou tab)
        const parts = line.trim().split(/\s+/)
        
        if (parts.length >= 2) {
          processedItems.push({
            pedido: parts[0].trim(),
            remessa: parts[1].trim(),
            dados_adicionais: parts.slice(2).join(' ').trim() || ''
          })
        } else if (parts.length === 1 && parts[0].trim()) {
          // Se só tem um valor, usar como pedido
          processedItems.push({
            pedido: parts[0].trim(),
            remessa: '',
            dados_adicionais: ''
          })
        }
      }
      
      if (processedItems.length > 0) {
        await handleSubmitMultiple(processedItems)
      } else {
        toast.error('Nenhum dado válido encontrado na área de transferência. Use o formato: PEDIDO REMESSA')
      }
    } catch (err) {
      toast.error('Erro ao acessar área de transferência')
    }
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.pedido || !formData.remessa) {
      toast.error('Pedido e Remessa são obrigatórios')
      return
    }

    setIsSubmitting(true)
    const result = await addItems([formData])
    setIsSubmitting(false)
    
    if (result.success) {
      toast.success('Pedido adicionado com sucesso!')
      setFormData({ pedido: '', remessa: '', dados_adicionais: '' })
      setShowAddForm(false)
    } else {
      toast.error(result.error || 'Erro ao adicionar pedido')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-400">Carregando pedidos gerados...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="w-8 h-8" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CardTitle className="text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-400" />
                <span>Pedidos Gerados</span>
              </CardTitle>
              {separationInfo && (
                <Badge variant="outline" className={
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
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePasteData}
                    disabled={isSubmitting}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Colar Dados
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Pedido
                  </Button>
                </>
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
                <span className="font-medium text-white">{filteredData.length}</span> pedidos
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar pedidos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white w-64"
                />
              </div>
            </div>
          </div>

          {/* Formulário de Adição */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmitForm} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pedido" className="text-gray-300">
                            Pedido *
                          </Label>
                          <Input
                            id="pedido"
                            value={formData.pedido}
                            onChange={(e) => handleInputChange('pedido', e.target.value)}
                            className="bg-gray-900 border-gray-600 text-white"
                            placeholder="Ex: 450040303"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="remessa" className="text-gray-300">
                            Remessa *
                          </Label>
                          <Input
                            id="remessa"
                            value={formData.remessa}
                            onChange={(e) => handleInputChange('remessa', e.target.value)}
                            className="bg-gray-900 border-gray-600 text-white"
                            placeholder="Ex: 8304503"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="dados_adicionais" className="text-gray-300">
                          Dados Adicionais
                        </Label>
                        <Textarea
                          id="dados_adicionais"
                          value={formData.dados_adicionais}
                          onChange={(e) => handleInputChange('dados_adicionais', e.target.value)}
                          className="bg-gray-900 border-gray-600 text-white"
                          placeholder="Informações extras (opcional)"
                          rows={3}
                        />
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddForm(false)}
                          className="border-gray-700 text-gray-300 hover:bg-gray-800"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isSubmitting ? 'Salvando...' : 'Salvar Pedido'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tabela de Dados */}
          {filteredData.length > 0 ? (
            <div className="rounded-lg border border-gray-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-800 border-gray-700">
                    <TableHead className="text-gray-300 font-bold">Pedido</TableHead>
                    <TableHead className="text-gray-300 font-bold">Remessa</TableHead>
                    <TableHead className="text-gray-300 font-bold">Dados Adicionais</TableHead>
                    <TableHead className="text-gray-300 font-bold">Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={index} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell className="text-white font-medium">
                        {item.pedido}
                      </TableCell>
                      <TableCell className="text-white">
                        {item.remessa}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {item.dados_adicionais || '-'}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {new Date(item.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">
                Nenhum pedido encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Nenhum pedido corresponde aos filtros aplicados.' : 'Adicione pedidos usando o botão "Colar Dados" ou "Adicionar Pedido".'}
              </p>
              {canAddItems && !searchTerm && (
                <div className="space-y-2">
                  <Button
                    onClick={handlePasteData}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Colar Dados
                  </Button>
                  <div className="text-sm text-gray-400">
                    Cole dados do formato: PEDIDO REMESSA (ex: 450040303 8304503)
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}