// components/tabs/PedidosTab.tsx
"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, Filter, Loader2, Upload, AlertCircle, Scissors, Printer, Grape, RefreshCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePedidosData } from '@/hooks/usePedidosData'
import { useMaterialCategories } from '@/hooks/useMaterialCategories'
import CorteModal from '@/components/modals/CorteModal'
import MelanciaUploadModal from '@/components/modals/MelanciaUploadModal'
import RedistribuicaoUploadModal from '@/components/modals/RedistribuicaoUploadModal'
import ReinforcementPrintModal from '@/components/modals/ReinforcementPrintModal'
import { getActivityColorClasses } from '@/lib/activity-helpers'
import { ItemActivityType } from '@/types/activity'

interface PedidoItem {
  id: string
  tipoSepar: string
  calibre: string
  codigo: string
  descricao: string
  [key: string]: string | number
}

interface EditableInputProps {
  value: number
  onSave: (value: number) => void
  disabled?: boolean
  activityType?: ItemActivityType
}

interface EditableSelectProps {
  value: string
  onSave: (value: string) => void
  disabled?: boolean
}

type ColumnWidths = {
  [key: string]: number
}

interface ReforcoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<any>;
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

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      setSelectedFile(null);
    }
  };
  
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
                Carregando...
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

function EditableInput({ value, onSave, disabled, activityType = 'default' }: EditableInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const numValue = parseInt(tempValue) || 0
      onSave(numValue)
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setTempValue(value.toString())
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    setTempValue(value.toString())
    setIsEditing(false)
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setTempValue(value.toString())
  }, [value])

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-16 h-6 text-center text-xs bg-gray-800 border-blue-500 text-white"
        disabled={disabled}
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-16 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-xs transition-colors ${
        getActivityColorClasses(activityType)
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {value || ""}
    </div>
  )
}

function EditableSelect({ value, onSave, disabled }: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)
  const { categories } = useMaterialCategories()

  const tiposPermitidos = [
    "SECO", "FRIO", "ORGANICO", "OVO", "REFORÇO", "REDISTRIBUIÇÃO",
    ...categories.map(cat => cat.value.toUpperCase())
  ]

  const handleSave = (newValue: string) => {
    onSave(newValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsEditing(false)
  }

  useEffect(() => {
    setTempValue(value)
  }, [value])

  if (isEditing) {
    return (
      <div className="relative">
        <Select value={tempValue} onValueChange={handleSave}>
          <SelectTrigger className="w-20 h-6 text-xs bg-gray-800 border-green-500 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700 text-white">
            {tiposPermitidos.map((tipo) => (
              <SelectItem key={tipo} value={tipo} className="text-xs">
                {tipo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-20 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-xs font-medium border border-transparent transition-colors ${
        value ? "text-green-400 font-semibold" : "text-gray-500"
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {value || ""}
    </div>
  )
}

function StatusBadge({ value, disabled }: { value: string; disabled?: boolean }) {
  const getBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
      case 'active':
        return 'border-green-500 text-green-400 bg-green-500/10'
      case 'inativo':
      case 'inactive':
        return 'border-red-500 text-red-400 bg-red-500/10'
      case 'pendente':
      case 'pending':
        return 'border-yellow-500 text-yellow-400 bg-yellow-500/10'
      default:
        return 'border-gray-500 text-gray-400 bg-gray-500/10'
    }
  }

  return (
    <div
      className={`flex items-center justify-center text-xs transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <span className={`px-2 py-0.5 rounded-full border text-[9px] font-semibold ${getBadgeColor(value)}`}>
        {value || 'N/A'}
      </span>
    </div>
  )
}

export default function PedidosTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [showCorteModal, setShowCorteModal] = useState(false)
  const [isReforcoModalOpen, setIsReforcoModalOpen] = useState(false)
  const [isUploadingReforco, setIsUploadingReforco] = useState(false)
  const [isRedistribuicaoModalOpen, setIsRedistribuicaoModalOpen] = useState(false)
  const [isUploadingRedistribuicao, setIsUploadingRedistribuicao] = useState(false)
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({})
  const [isMelanciaModalOpen, setIsMelanciaModalOpen] = useState(false)
  const [isUploadingMelancia, setIsUploadingMelancia] = useState(false)
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null)
  
  const [tableScale, setTableScale] = useState(1.0);
  const TABLE_SCALE_KEY = 'pedidos-table-scale';

  const [isReinforcementModalOpen, setIsReinforcementModalOpen] = useState(false)

  const { 
    pedidos, 
    lojas, 
    isLoading, 
    error, 
    updateQuantity, 
    updateItemType,
    uploadReforco,
    uploadRedistribuicao,
    uploadMelancia,
    getItemActivityStatus,
    activeSeparationId,
    refetch
  } = usePedidosData()

  useEffect(() => {
    const savedScale = localStorage.getItem(TABLE_SCALE_KEY);
    if (savedScale) {
        setTableScale(parseFloat(savedScale) || 1.0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(TABLE_SCALE_KEY, String(tableScale));
  }, [tableScale]);

  const availableTypes = useMemo(() => {
    const types = new Set(pedidos.map(item => item.tipoSepar).filter(Boolean))
    const sortedTypes = Array.from(types).sort((a, b) => {
      const priority = ['SECO', 'FRIO', 'ORGANICO','OVO','REFORÇO','REDISTRIBUIÇÃO']
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
    const dataToFilter = pedidos.filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filtroTipo === "Todos" || item.tipoSepar === filtroTipo
      
      return matchesSearch && matchesType
    })

    return dataToFilter.sort((a, b) => a.descricao.localeCompare(b.descricao));

  }, [pedidos, searchTerm, filtroTipo])

  const handleReforcoUpload = async (file: File) => {
    setIsUploadingReforco(true)
    try {
      const result = await uploadReforco(file)
      if (result.success) {
        toast.success('Reforço carregado com sucesso!')
        setIsReforcoModalOpen(false)
        setIsReinforcementModalOpen(true) 
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar reforço'
      toast.error(errorMessage)
    } finally {
      setIsUploadingReforco(false)
    }
  }

  const handleRedistribuicaoUpload = async (file: File) => {
    setIsUploadingRedistribuicao(true)
    try {
      const result = await uploadRedistribuicao(file)
      if (result.success) {
        toast.success('Redistribuição carregada com sucesso!')
        setIsRedistribuicaoModalOpen(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar redistribuição'
      toast.error(errorMessage)
    } finally {
      setIsUploadingRedistribuicao(false)
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
  
  const handleMelanciaUpload = async (file: File, materialCode: string) => {
    setIsUploadingMelancia(true)
    try {
      const result = await uploadMelancia(file, materialCode)
      if (result.success) {
        let message = `Separação de melancia carregada! ${result.updatedStores} lojas atualizadas`
        if (result.notFoundStores && result.notFoundStores.length > 0) {
          message += `. Lojas não encontradas: ${result.notFoundStores.join(', ')}`
        }
        toast.success(message)
        setIsMelanciaModalOpen(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar separação de melancia'
      toast.error(errorMessage)
    } finally {
      setIsUploadingMelancia(false)
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return
      
      const newWidth = Math.max(50, resizing.startWidth + (e.clientX - resizing.startX))
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth
      }))
    }

    const handleMouseUp = () => {
      setResizing(null)
    }

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

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
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold apple-font text-white">Pedidos do Dia</h2>
          <p className="text-gray-400 capitalize">{today}</p>
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
            />
          </div>

          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-white h-10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              {availableTypes.map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {tipo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setShowCorteModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white"
          disabled={isLoading}
        >
          <Scissors className="w-4 h-4 mr-2" />
          Corte de Produto
        </Button>

        <Button
          onClick={() => setIsReforcoModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isLoading}
        >
          <Upload className="w-4 h-4 mr-2" />
          Carregar Reforço
        </Button>

        <Button
          onClick={() => setIsRedistribuicaoModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isLoading}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Carregar Redistribuição
        </Button>

        <Button
          onClick={() => setIsMelanciaModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          disabled={isLoading}
        >
          <Grape className="w-4 h-4 mr-2" />
          Carregar Melancia
        </Button>

        <Button
          onClick={() => setIsReinforcementModalOpen(true)}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
          disabled={isLoading}
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir Reforço
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm text-gray-400 flex items-center gap-2">
          Zoom da Tabela:
          <input
            type="range"
            min="0.7"
            max="1.5"
            step="0.1"
            value={tableScale}
            onChange={(e) => setTableScale(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-xs text-gray-500 w-8">{Math.round(tableScale * 100)}%</span>
        </label>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-gray-400">Carregando pedidos...</p>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredData.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <div style={{ transform: `scale(${tableScale})`, transformOrigin: 'top left' }}>
              <div style={{ width: `${100 / tableScale}%` }}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 hover:bg-gray-800/50">
                      <TableHead className="text-gray-300 font-semibold sticky left-0 bg-gray-900 z-20 min-w-[80px]">
                        Tipo
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold sticky left-[80px] bg-gray-900 z-20 min-w-[100px]">
                        Código
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold sticky left-[180px] bg-gray-900 z-20 min-w-[300px]">
                        Descrição
                      </TableHead>
                      
                      {lojas.map((loja) => (
                        <TableHead 
                          key={loja} 
                          className="text-center text-gray-300 font-semibold border-r border-gray-700 relative group"
                          style={{ width: columnWidths[loja] || 80 }}
                        >
                          <div className="flex items-center justify-center">
                            <span className="truncate" title={loja}>
                              {loja}
                            </span>
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => startResize(e, loja)}
                            />
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30">
                        <TableCell className="sticky left-0 bg-gray-900 z-10 border-r border-gray-700">
                          <EditableSelect
                            value={item.tipoSepar}
                            onSave={(value) => updateItemType(item.id, value)}
                            disabled={isLoading}
                          />
                        </TableCell>
                        
                        <TableCell className="font-mono text-xs text-gray-300 sticky left-[80px] bg-gray-900 z-10 border-r border-gray-700">
                          <span className="truncate block" title={item.codigo}>
                            {item.codigo}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-gray-300 text-xs sticky left-[180px] bg-gray-900 z-10 border-r border-gray-700">
                          <span className="truncate block" title={item.descricao}>
                            {item.descricao}
                          </span>
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
                              activityType={getItemActivityStatus(item.id, loja)?.activityType || 'default'}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <CorteModal 
        isOpen={showCorteModal}
        onClose={() => setShowCorteModal(false)} 
        onCutExecuted={handleCorteExecuted}
      />
      
      <ReforcoUploadModal
        isOpen={isReforcoModalOpen}
        onClose={() => setIsReforcoModalOpen(false)}
        onUpload={handleReforcoUpload}
        isUploading={isUploadingReforco}
      />

      <RedistribuicaoUploadModal
        isOpen={isRedistribuicaoModalOpen}
        onClose={() => setIsRedistribuicaoModalOpen(false)}
        onUpload={handleRedistribuicaoUpload}
        isUploading={isUploadingRedistribuicao}
      />

      <MelanciaUploadModal
        isOpen={isMelanciaModalOpen}
        onClose={() => setIsMelanciaModalOpen(false)}
        onUpload={handleMelanciaUpload}
        isUploading={isUploadingMelancia}
      />

      <ReinforcementPrintModal
        isOpen={isReinforcementModalOpen}
        onClose={() => setIsReinforcementModalOpen(false)}
        separationId={activeSeparationId}
      />
    </motion.div>
  )
}