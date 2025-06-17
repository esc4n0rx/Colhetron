// components/pages/RelatoriosPage.tsx
"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Filter, Download, Eye, Search, Calendar, Package, FileText, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRelatorios } from '@/hooks/useRelatorios'
import { ReportFilters } from '@/types/relatorios'

interface RelatoriosPageProps {
  onBack: () => void
}

export default function RelatoriosPage({ onBack }: RelatoriosPageProps) {
  const {
    separations,
    selectedSeparation,
    pagination,
    isLoading,
    isLoadingDetails,
    fetchSeparations,
    fetchSeparationDetails,
    clearSelection
  } = useRelatorios()

  const [filters, setFilters] = useState<ReportFilters>({
    type: undefined,
    status: undefined,
    dateFrom: '',
    dateTo: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const handleFilterChange = (key: keyof ReportFilters, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    
    // Converter undefined para undefined na API
    const apiFilters: ReportFilters = {
      ...newFilters,
      type: newFilters.type as "SP" | "ES" | "RJ" | undefined,
      status: newFilters.status as "active" | "completed" | undefined
    }
    fetchSeparations(apiFilters, 1)
  }

  const handlePageChange = (page: number) => {
    const apiFilters: ReportFilters = {
      ...filters,
      type: filters.type as "SP" | "ES" | "RJ" | undefined,
      status: filters.status as "active" | "completed" | undefined,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo
    }
    fetchSeparations(apiFilters, page)
  }

  const handleViewDetails = async (separationId: string) => {
    await fetchSeparationDetails(separationId)
    setIsDetailModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsDetailModalOpen(false)
    clearSelection()
  }

  const resetFilters = () => {
    const resetFilters = { type: undefined, status: undefined, dateFrom: '', dateTo: '' }
    setFilters(resetFilters)
    setSearchTerm('')
    fetchSeparations({ type: undefined, status: undefined, dateFrom: '', dateTo: '' }, 1)
  }

  const filteredSeparations = useMemo(() => {
    if (!searchTerm) return separations

    return separations.filter(sep =>
      sep.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sep.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sep.user.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [separations, searchTerm])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-500/20 text-green-400 border-green-400/30', label: 'Ativa' },
      completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-400/30', label: 'Finalizada' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      color: 'bg-gray-500/20 text-gray-400 border-gray-400/30',
      label: status
    }

    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      SP: { color: 'bg-purple-500/20 text-purple-400 border-purple-400/30', label: 'São Paulo' },
      ES: { color: 'bg-orange-500/20 text-orange-400 border-orange-400/30', label: 'Espírito Santo' },
      RJ: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30', label: 'Rio de Janeiro' }
    }

    const config = typeConfig[type as keyof typeof typeConfig] || {
      color: 'bg-gray-500/20 text-gray-400 border-gray-400/30',
      label: type
    }

    return (
      <Badge variant="outline" className={config.color}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <Button
            onClick={onBack}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Relatórios de Separações</h1>
            <p className="text-gray-400">Visualize e analise suas separações finalizadas</p>
          </div>
        </div>
      </motion.div>

      {/* Filtros */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Buscar por arquivo, tipo ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Tipo */}
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value === 'all' ? undefined : value as 'SP' | 'ES' | 'RJ')}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="SP">São Paulo</SelectItem>
                <SelectItem value="ES">Espírito Santo</SelectItem>
                <SelectItem value="RJ">Rio de Janeiro</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value as 'completed' | 'active')}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="completed">Finalizadas</SelectItem>
              </SelectContent>
            </Select>

            {/* Data inicial */}
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                type="date"
                placeholder="Data inicial"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* Data final */}
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                type="date"
                placeholder="Data final"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={resetFilters}
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
            <div className="text-sm text-gray-400">
              {pagination.total} separação{pagination.total !== 1 ? 'ões' : ''} encontrada{pagination.total !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Separações */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Lista de Separações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="w-16 h-4 bg-gray-700 rounded"></div>
                  <div className="w-32 h-4 bg-gray-700 rounded"></div>
                  <div className="w-24 h-4 bg-gray-700 rounded"></div>
                  <div className="w-20 h-4 bg-gray-700 rounded"></div>
                  <div className="w-16 h-4 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredSeparations.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">
                Nenhuma separação encontrada
              </h3>
              <p className="text-gray-500">
                Ajuste os filtros ou crie uma nova separação
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-300">Tipo</TableHead>
                    <TableHead className="text-gray-300">Arquivo</TableHead>
                    <TableHead className="text-gray-300">Data</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Itens</TableHead>
                    <TableHead className="text-gray-300">Lojas</TableHead>
                    <TableHead className="text-gray-300">Criado por</TableHead>
                    <TableHead className="text-gray-300">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredSeparations.filter(sep => sep.user && sep.user.name).map((separation, index) => (
                      <motion.tr
                        key={separation.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-gray-800 hover:bg-gray-800/50"
                      >
                        <TableCell>
                          {getTypeBadge(separation.type)}
                        </TableCell>
                        <TableCell className="text-gray-300 font-medium">
                          {separation.file_name}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {formatDate(separation.created_at)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(separation.status)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          <div className="flex items-center">
                            <Package className="w-4 h-4 mr-1 text-blue-400" />
                            {separation.total_items}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {separation.total_stores}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {separation.user.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              onClick={() => handleViewDetails(separation.id)}
                              size="sm"
                              variant="outline"
                              className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-400">
                Página {pagination.page} de {pagination.totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                >
                  Anterior
                </Button>
                <Button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Detalhes da Separação
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
              />
              <span className="ml-3 text-white">Carregando detalhes...</span>
            </div>
          ) : selectedSeparation ? (
            <div className="space-y-6">
              {/* Informações da Separação */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Tipo</div>
                    <div className="font-medium text-white">
                      {getTypeBadge(selectedSeparation.type)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Status</div>
                    <div className="font-medium text-white">
                      {getStatusBadge(selectedSeparation.status)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Data</div>
                    <div className="font-medium text-white">
                      {formatDate(selectedSeparation.created_at)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Arquivo</div>
                    <div className="font-medium text-white text-sm">
                      {selectedSeparation.file_name}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Total de Itens</div>
                    <div className="font-medium text-white">
                      {selectedSeparation.total_items}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-400 mb-1">Total de Lojas</div>
                    <div className="font-medium text-white">
                      {selectedSeparation.total_stores}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Itens */}
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">
                    Itens da Separação ({selectedSeparation.items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-700">
                          <TableHead className="text-gray-300">Código</TableHead>
                          <TableHead className="text-gray-300">Descrição</TableHead>
                          <TableHead className="text-gray-300">Categoria</TableHead>
                          <TableHead className="text-gray-300">Lojas</TableHead>
                          <TableHead className="text-gray-300">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSeparation.items.map((item) => {
                          const totalQuantity = item.quantities.reduce((sum, q) => sum + q.quantity, 0)
                          
                          return (
                            <TableRow key={item.id} className="border-gray-700">
                              <TableCell className="text-gray-300 font-mono">
                                {item.material_code}
                              </TableCell>
                              <TableCell className="text-gray-300">
                                {item.description}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant="outline" 
                                  className={
                                    item.type_separation === 'SECO' 
                                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
                                      : item.type_separation === 'FRIO'
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-400/30'
                                      : 'bg-green-500/20 text-green-400 border-green-400/30'
                                  }
                                >
                                  {item.type_separation}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-400">
                                {item.quantities.length} loja{item.quantities.length !== 1 ? 's' : ''}
                              </TableCell>
                              <TableCell className="text-gray-300 font-medium">
                                {totalQuantity.toLocaleString()}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}