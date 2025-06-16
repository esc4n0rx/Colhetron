// components/tabs/PedidosTab.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, Filter, Loader2, GripVertical, Upload, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePedidosData } from '@/hooks/usePedidosData'

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
  value: string;
  onSave: (value: string) => void;
  disabled?: boolean;
}

type ColumnWidths = {
  [key: string]: number;
};

// --- HOOK PARA LÓGICA DE REDIMENSIONAMENTO DE COLUNAS ---

const useResizableColumns = (
  initialWidths: ColumnWidths,
  storageKey: string
) => {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(initialWidths);
  const isResizing = useRef<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    const savedWidths = localStorage.getItem(storageKey);
    if (savedWidths) {
      setColumnWidths(JSON.parse(savedWidths));
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(columnWidths));
  }, [columnWidths, storageKey]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    
    const deltaX = e.clientX - startX.current;
    const newWidth = startWidth.current + deltaX;
    
    if (newWidth > 50) { // Largura mínima da coluna
      setColumnWidths(prev => ({
        ...prev,
        [isResizing.current!]: newWidth
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = null;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startResizing = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  return { columnWidths, startResizing };
};

// --- COMPONENTES DE INPUT EDITÁVEL ---

function EditableInput({ value, onSave, disabled }: EditableInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())

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

  if (isEditing) {
    return (
      <Input
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-16 h-6 text-center text-xs bg-gray-800 border-blue-500 text-white"
        autoFocus
        disabled={disabled}
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-16 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-xs ${
        value > 0 ? "text-green-400 font-semibold" : "text-gray-500"
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      aria-label={`Valor atual ${value}, clique para editar`}
    >
      {value || ""}
    </div>
  )
}

function EditableSelect({ value, onSave, disabled }: EditableSelectProps) {
  const handleSave = (newValue: string) => {
    if (newValue) {
      onSave(newValue);
    }
  };

  return (
    <Select value={value} onValueChange={handleSave} disabled={disabled}>
      <SelectTrigger className="w-full h-6 text-xs bg-transparent border-none text-white focus:ring-0 focus:ring-offset-0 p-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700 text-white">
        <SelectItem value="SECO">SECO</SelectItem>
        <SelectItem value="FRIO">FRIO</SelectItem>
        <SelectItem value="ORGANICO">ORGÂNICO</SelectItem>
      </SelectContent>
    </Select>
  );
}

// --- MODAL DE UPLOAD DE REFORÇO ---

interface ReforcoUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File) => Promise<void>
  isUploading: boolean
}

function ReforcoUploadModal({ isOpen, onClose, onUpload, isUploading }: ReforcoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validar se é arquivo Excel
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ]
      
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile)
      } else {
        toast.error('Arquivo deve ser Excel (.xlsx, .xls) ou CSV')
        e.target.value = ''
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecione um arquivo primeiro')
      return
    }

    try {
      await onUpload(file)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose()
    } catch (error) {
      console.error('Erro no upload:', error)
    }
  }

  const handleClose = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Carregar Reforço</DialogTitle>
          <DialogDescription className="text-gray-400">
            Selecione uma planilha com materiais que precisam de reforço ou redistribuição.
            O arquivo deve ter o mesmo formato da planilha de upload de pedidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Clique para selecionar ou arraste o arquivo aqui
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Selecionar Arquivo
              </Button>
            </div>
          </div>

          {file && (
            <div className="bg-gray-800 p-3 rounded-lg">
              <p className="text-sm text-gray-300">
                <strong>Arquivo selecionado:</strong> {file.name}
              </p>
              <p className="text-xs text-gray-400">
                Tamanho: {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-300 mb-2">Regras de Negócio:</h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• Se o material não tinha separação ativa, será adicionado</li>
              <li>• Se já tinha quantidade, será somada</li>
              <li>• Se antes tinha quantidade e agora não tem, será zerada (redistribuição)</li>
              <li>• As tabelas de separação serão atualizadas automaticamente</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
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

// --- COMPONENTE PRINCIPAL ---

export default function PedidosTab() {
  const { 
    pedidos, 
    lojas, 
    isLoading, 
    error, 
    updateQuantity, 
    updateItemType,
    uploadReforco 
  } = usePedidosData()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [isReforcoModalOpen, setIsReforcoModalOpen] = useState(false)
  const [isUploadingReforco, setIsUploadingReforco] = useState(false)

  // Refs para sincronização do scroll
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  const initialColumnWidths: ColumnWidths = {
    TIPO: 120,
    Codigo: 100,
    Descricao: 350,
    ...lojas.reduce((acc, loja) => ({ ...acc, [loja]: 80 }), {})
  };

  const { columnWidths, startResizing } = useResizableColumns(initialColumnWidths, 'pedidos-col-widths');
  
  const tableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);

  // Efeito para sincronizar a rolagem horizontal
  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScroll = topScrollRef.current;

    if (!tableContainer || !topScroll) return;

    const syncScroll = (source: 'top' | 'table') => (e: Event) => {
      const target = e.target as HTMLDivElement;
      if (source === 'top' && tableContainer) {
        tableContainer.scrollLeft = target.scrollLeft;
      } else if (source === 'table' && topScroll) {
        topScroll.scrollLeft = target.scrollLeft;
      }
    };

    const topScrollHandler = syncScroll('top');
    const tableScrollHandler = syncScroll('table');

    topScroll.addEventListener('scroll', topScrollHandler);
    tableContainer.addEventListener('scroll', tableScrollHandler);

    return () => {
      topScroll.removeEventListener('scroll', topScrollHandler);
      tableContainer.removeEventListener('scroll', tableScrollHandler);
    };
  }, []);

  // Filtrar pedidos
  const filteredPedidos = pedidos.filter(pedido => {
    const matchesSearch = searchTerm === "" || 
      pedido.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || 
      pedido.codigo.includes(searchTerm)
    
    const matchesType = filtroTipo === "Todos" || pedido.tipoSepar === filtroTipo
    
    return matchesSearch && matchesType
  })

  const handleQuantityUpdate = useCallback(async (itemId: string, storeCode: string, quantity: number) => {
    const result = await updateQuantity(itemId, storeCode, quantity)
    if (!result.success && result.error) {
      toast.error(`Erro ao atualizar: ${result.error}`)
    }
  }, [updateQuantity])

  const handleTypeUpdate = useCallback(async (itemId: string, typeSeparation: string) => {
    const result = await updateItemType(itemId, typeSeparation)
    if (!result.success && result.error) {
      toast.error(`Erro ao atualizar tipo: ${result.error}`)
    }
  }, [updateItemType])

  const handleReforcoUpload = async (file: File) => {
    setIsUploadingReforco(true)
    try {
      const result = await uploadReforco(file)
      if (result.success) {
        toast.success(`Reforço carregado com sucesso! ${result.message || ''}`)
      } else {
        toast.error(`Erro ao carregar reforço: ${result.error}`)
      }
    } catch (error) {
      toast.error('Erro inesperado ao carregar reforço')
    } finally {
      setIsUploadingReforco(false)
    }
  }

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
      {/* Header */}
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
              <SelectItem value="Todos">Todos os Tipos</SelectItem>
              <SelectItem value="SECO">SECO</SelectItem>
              <SelectItem value="FRIO">FRIO</SelectItem>
              <SelectItem value="ORGANICO">ORGÂNICO</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={() => setIsReforcoModalOpen(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white h-10 px-4"
            disabled={isLoading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Carregar Reforço
          </Button>
        </div>
      </div>

      {/* Scroll horizontal superior */}
      <div
        ref={topScrollRef}
        className="overflow-x-auto"
        style={{ maxWidth: '100%' }}
      >
        <div style={{ width: `${tableWidth}px`, height: '1px' }} />
      </div>

      {/* Tabela */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Carregando pedidos...</span>
          </div>
        ) : (
          <div
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]"
          >
            <Table>
              <TableHeader className="sticky top-0 bg-gray-900 z-10">
                <TableRow className="border-gray-800 hover:bg-gray-800/50">
                  {/* Coluna TIPO */}
                  <TableHead
                    className="text-white font-semibold bg-gray-900 sticky left-0 z-20 border-r border-gray-700"
                    style={{ width: `${columnWidths.TIPO}px`, minWidth: `${columnWidths.TIPO}px` }}
                  >
                    <div className="flex items-center justify-between">
                      TIPO
                      <div
                        className="cursor-col-resize w-1 h-full hover:bg-blue-500 absolute right-0 top-0"
                        onMouseDown={(e) => startResizing('TIPO', e)}
                      />
                    </div>
                  </TableHead>

                  {/* Coluna Código */}
                  <TableHead
                    className="text-white font-semibold bg-gray-900 sticky left-120 z-20 border-r border-gray-700"
                    style={{ 
                      width: `${columnWidths.Codigo}px`, 
                      minWidth: `${columnWidths.Codigo}px`,
                      left: `${columnWidths.TIPO}px`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      Código
                      <div
                        className="cursor-col-resize w-1 h-full hover:bg-blue-500 absolute right-0 top-0"
                        onMouseDown={(e) => startResizing('Codigo', e)}
                      />
                    </div>
                  </TableHead>

                  {/* Coluna Descrição */}
                  <TableHead
                    className="text-white font-semibold bg-gray-900 sticky z-20 border-r border-gray-700"
                    style={{ 
                      width: `${columnWidths.Descricao}px`, 
                      minWidth: `${columnWidths.Descricao}px`,
                      left: `${columnWidths.TIPO + columnWidths.Codigo}px`
                    }}
                  >
                    <div className="flex items-center justify-between">
                      Descrição
                      <div
                        className="cursor-col-resize w-1 h-full hover:bg-blue-500 absolute right-0 top-0"
                        onMouseDown={(e) => startResizing('Descricao', e)}
                      />
                    </div>
                  </TableHead>

                  {/* Colunas das Lojas */}
                  {lojas.map((loja) => (
                    <TableHead
                      key={loja}
                      className="text-center text-white font-semibold text-xs"
                      style={{ width: `${columnWidths[loja]}px`, minWidth: `${columnWidths[loja]}px` }}
                    >
                      <div className="flex items-center justify-between">
                        {loja}
                        <div
                          className="cursor-col-resize w-1 h-full hover:bg-blue-500 absolute right-0 top-0"
                          onMouseDown={(e) => startResizing(loja, e)}
                        />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredPedidos.map((pedido) => (
                  <TableRow
                    key={pedido.id}
                    className="border-gray-800 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Coluna TIPO */}
                    <TableCell
                      className="bg-gray-900/80 sticky left-0 z-10 border-r border-gray-700"
                      style={{ width: `${columnWidths.TIPO}px`, minWidth: `${columnWidths.TIPO}px` }}
                    >
                      <EditableSelect
                        value={pedido.tipoSepar}
                        onSave={(value) => handleTypeUpdate(pedido.id, value)}
                        disabled={isLoading}
                      />
                    </TableCell>

                    {/* Coluna Código */}
                    <TableCell
                      className="text-blue-300 font-mono text-xs bg-gray-900/80 sticky z-10 border-r border-gray-700"
                      style={{ 
                        width: `${columnWidths.Codigo}px`, 
                        minWidth: `${columnWidths.Codigo}px`,
                        left: `${columnWidths.TIPO}px`
                      }}
                    >
                      {pedido.codigo}
                    </TableCell>

                    {/* Coluna Descrição */}
                    <TableCell
                      className="text-gray-300 text-xs bg-gray-900/80 sticky z-10 border-r border-gray-700"
                      style={{ 
                        width: `${columnWidths.Descricao}px`, 
                        minWidth: `${columnWidths.Descricao}px`,
                        left: `${columnWidths.TIPO + columnWidths.Codigo}px`
                      }}
                    >
                      <div className="truncate" title={pedido.descricao}>
                        {pedido.descricao}
                      </div>
                    </TableCell>

                    {/* Colunas das Lojas */}
                    {lojas.map((loja) => (
                      <TableCell
                        key={loja}
                        className="text-center p-1"
                        style={{ width: `${columnWidths[loja]}px`, minWidth: `${columnWidths[loja]}px` }}
                      >
                        <EditableInput
                          value={Number(pedido[loja]) || 0}
                          onSave={(value) => handleQuantityUpdate(pedido.id, loja, value)}
                          disabled={isLoading}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Informações dos resultados */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>
          Mostrando {filteredPedidos.length} de {pedidos.length} itens
        </span>
        <span>
          {lojas.length} lojas ativas
        </span>
      </div>

      {/* Modal de Upload de Reforço */}
      <ReforcoUploadModal
        isOpen={isReforcoModalOpen}
        onClose={() => setIsReforcoModalOpen(false)}
        onUpload={handleReforcoUpload}
        isUploading={isUploadingReforco}
      />
    </motion.div>
  )
}