// components/tabs/PedidosTab.tsx
"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, Filter, Loader2, Upload, AlertCircle, Scissors } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePedidosData } from '@/hooks/usePedidosData'
import { useMaterialCategories } from '@/hooks/useMaterialCategories'
import CorteModal from '@/components/modals/CorteModal'

// --- INTERFACES E TIPOS ---

interface PedidoItem {
  id: string
  tipoSepar: string
  codigo: string
  descricao: string
  [key: string]: string | number
}

interface EditableInputProps {
  value: number
  onSave: (value: number) => void
  disabled?: boolean
}

interface EditableSelectProps {
  value: string
  onSave: (value: string) => void
  disabled?: boolean
}

type ColumnWidths = {
  [key: string]: number
}

// --- MODAL DE UPLOAD DE REFORÇO (RESTAURADO) ---

interface ReforcoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => void;
  isUploading: boolean;
}

function ReforcoUploadModal({ isOpen, onClose, onUpload, isUploading }: ReforcoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onUpload(selectedFile);
      setSelectedFile(null);
    }
  };
  
  // Limpa o arquivo selecionado quando o modal é fechado
  useEffect(() => {
    if (!isOpen) {
        setSelectedFile(null);
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-400" />
            Carregar Arquivo de Reforço
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Selecione um arquivo Excel (.xlsx) com os dados de reforço.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="bg-gray-800 border-gray-700 text-white"
            disabled={isUploading}
          />
          
          {selectedFile && (
            <div className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-sm text-gray-300">
                Arquivo selecionado: <span className="text-blue-400">{selectedFile.name}</span>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Carregar Reforço'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- COMPONENTE EDITÁVEL INPUT ---

function EditableInput({ value, onSave, disabled }: EditableInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())

  const handleSave = () => {
    const numValue = parseInt(tempValue) || 0
    if (numValue !== value) {
      onSave(numValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempValue(value.toString())
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <Input
        type="number"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full h-5 text-[10px] bg-gray-800 border-blue-500 text-white p-1"
        autoFocus
        disabled={disabled}
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-full h-5 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-[10px] font-mono ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${value > 0 ? 'text-green-400 font-semibold' : 'text-gray-400'}`}
    >
      {value || '0'}
    </div>
  )
}

// --- COMPONENTE EDITÁVEL SELECT ---

function EditableSelect({ value, onSave, disabled }: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { categories } = useMaterialCategories()

  const options = useMemo(() => {
    const uniqueCategories = [...new Set(categories.map(cat => cat.value))]
    const priorityCategories = ['SECO', 'FRIO', 'ORGANICO']
    const otherCategories = uniqueCategories.filter(cat => !priorityCategories.includes(cat))
    return [...priorityCategories.filter(cat => uniqueCategories.includes(cat)), ...otherCategories]
  }, [categories])

  const handleSave = (newValue: string) => {
    onSave(newValue)
    setIsEditing(false)
  }

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'SECO':
        return 'bg-blue-500/20 text-blue-400 border-blue-400/30'
      case 'FRIO':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30'
      case 'ORGANICO':
        return 'bg-green-500/20 text-green-400 border-green-400/30'
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-400/30'
    }
  }

  if (isEditing) {
    return (
      <Select value={value} onValueChange={handleSave} disabled={disabled}>
        <SelectTrigger className="w-full h-5 text-[10px] bg-gray-800 border-blue-500 text-white p-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {options.map(option => (
            <SelectItem key={option} value={option} className="text-[10px]">{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-full h-5 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-[10px] ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${getBadgeColor(value)}`}>
        {value || 'N/A'}
      </span>
    </div>
  )
}

// --- COMPONENTE PRINCIPAL ---

export default function PedidosTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [showCorteModal, setShowCorteModal] = useState(false)
  // Estados restaurados para o modal de reforço
  const [isReforcoModalOpen, setIsReforcoModalOpen] = useState(false)
  const [isUploadingReforco, setIsUploadingReforco] = useState(false)

  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({})
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null)
  
  const { 
    pedidos, 
    lojas, 
    isLoading, 
    error, 
    updateQuantity, 
    updateItemType,
    uploadReforco,
    refetch
  } = usePedidosData()

  const availableTypes = useMemo(() => {
    const types = new Set(pedidos.map(item => item.tipoSepar).filter(Boolean))
    const sortedTypes = Array.from(types).sort((a, b) => {
      const priority = ['SECO', 'FRIO', 'ORGANICO','OVO','REFORÇO']
      const aIndex = priority.indexOf(a)
      const bIndex = priority.indexOf(b)
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
      if (aIndex !== -1) return -1
      if (bIndex !== -1) return 1
      return a.localeCompare(b)
    })
    return ['Todos', ...sortedTypes]
  }, [pedidos])

  const filteredData = useMemo(() => {
    return pedidos.filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filtroTipo === "Todos" || item.tipoSepar === filtroTipo
      
      return matchesSearch && matchesType
    })
  }, [pedidos, searchTerm, filtroTipo])

  // Handler de upload de reforço restaurado
  const handleReforcoUpload = async (file: File) => {
    setIsUploadingReforco(true)
    try {
      await uploadReforco(file)
      toast.success('Reforço carregado com sucesso!')
      setIsReforcoModalOpen(false) // Fecha o modal ao ter sucesso
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar reforço'
      toast.error(errorMessage)
    } finally {
      setIsUploadingReforco(false)
    }
  }

  const handleCorteExecuted = useCallback(() => {
    refetch()
    toast.success('Dados atualizados após corte!')
  }, [refetch])

  const startResize = useCallback((e: React.MouseEvent, column: string) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = columnWidths[column] || 80
    setResizing({ column, startX, startWidth })
  }, [columnWidths])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return
      const diff = e.clientX - resizing.startX
      const newWidth = Math.max(60, resizing.startWidth + diff)
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth
      }))
    }
    const handleMouseUp = () => setResizing(null)

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [resizing])

  const getTotalByStore = useCallback((store: string) => {
    return filteredData.reduce((total, item) => total + (Number(item[store]) || 0), 0)
  }, [filteredData])

  const grandTotal = useMemo(() => {
    return lojas.reduce((total, loja) => total + getTotalByStore(loja), 0)
  }, [lojas, getTotalByStore])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Cabeçalho com controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white apple-font">Pedidos</h2>
          <p className="text-gray-400">Gerencie as quantidades por loja ({filteredData.length} itens)</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCorteModal(true)}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
          >
            <Scissors className="w-4 h-4 mr-2" />
            Corte de Produto
          </Button>
          {/* Botão de reforço corrigido */}
          <Button 
            onClick={() => setIsReforcoModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Carregar Reforço
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-white h-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-white h-10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {availableTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando pedidos...</span>
        </div>
      )}

      {/* Tabela */}
      {!isLoading && !error && filteredData.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 bg-gray-800/50">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24 sticky left-0 bg-gray-800/80 z-20">CATEGORIA</TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-28 sticky left-24 bg-gray-800/80 z-20">CÓDIGO</TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-60">DESCRIÇÃO</TableHead>
                  {lojas.map((loja) => (
                    <TableHead 
                      key={loja} 
                      className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 relative group"
                      style={{ width: columnWidths[loja] || 80, minWidth: 60 }}
                    >
                      <div className="flex flex-col items-center">
                        <span className="flex-1 text-center">{loja}</span>
                        <div className="text-[9px] text-gray-500 mt-1">
                          {getTotalByStore(loja).toLocaleString()}
                        </div>
                      </div>
                      <div
                        className="absolute top-0 right-0 w-1 h-full bg-gray-600 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => startResize(e, loja)}
                      />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => (
                  <TableRow key={item.id} className="border-gray-700 hover:bg-gray-700/30">
                    <TableCell className="text-center border-r border-gray-700 sticky left-0 bg-gray-900/80 z-10">
                      <EditableSelect
                        value={item.tipoSepar}
                        onSave={(value) => updateItemType(item.id, value)}
                        disabled={isLoading}
                      />
                    </TableCell>
                    <TableCell className="text-center border-r border-gray-700 font-mono text-xs text-gray-300 sticky left-24 bg-gray-900/80 z-10">
                      {item.codigo}
                    </TableCell>
                    <TableCell className="border-r border-gray-700 text-xs text-gray-300 truncate">
                      {item.descricao}
                    </TableCell>
                    {lojas.map((loja) => (
                      <TableCell 
                        key={loja} 
                        className="text-center border-r border-gray-700"
                        style={{ width: columnWidths[loja] || 80 }}
                      >
                        <EditableInput
                          value={Number(item[loja] || 0)}
                          onSave={(value) => updateQuantity(item.id, loja, value)}
                          disabled={isLoading}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredData.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Nenhum pedido encontrado</h3>
            <p className="text-gray-400">
              {searchTerm || filtroTipo !== "Todos" 
                ? "Tente ajustar os filtros de busca" 
                : "Aguardando dados ou realize um novo upload."
              }
            </p>
          </div>
        </div>
      )}

      {/* Modais */}
      <CorteModal 
        isOpen={showCorteModal}
        onClose={() => setShowCorteModal(false)} 
        onCutExecuted={handleCorteExecuted}
      />
      
      {/* Modal de Upload de Reforço (corrigido) */}
      <ReforcoUploadModal
        isOpen={isReforcoModalOpen}
        onClose={() => setIsReforcoModalOpen(false)}
        onUpload={handleReforcoUpload}
        isUploading={isUploadingReforco}
      />
    </motion.div>
  )
}