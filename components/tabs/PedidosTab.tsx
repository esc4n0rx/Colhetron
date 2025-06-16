// components/tabs/PedidosTab.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, Filter, Loader2, GripVertical, Upload, AlertCircle,Scissors  } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePedidosData } from '@/hooks/usePedidosData'
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
  value: string;
  onSave: (value: string) => void;
  disabled?: boolean;
}

type ColumnWidths = {
  [key: string]: number;
};

// --- COMPONENTE EDITÁVEL SELECT ---

function EditableSelect({ value, onSave, disabled }: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const options = ['FRIO', 'SECO', 'ORGÂNICO'];

  const handleSave = (newValue: string) => {
    onSave(newValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Select value={tempValue} onValueChange={handleSave} disabled={disabled}>
        <SelectTrigger className="w-full h-5 text-[10px] bg-gray-800 border-blue-500 text-white p-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {options.map(option => (
            <SelectItem key={option} value={option} className="text-[10px]">{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-full h-5 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-[10px] font-medium ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      {value || '-'}
    </div>
  );
}

// --- COMPONENTE INPUT EDITÁVEL ---

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
        className="w-12 h-5 text-center text-[10px] bg-gray-800 border-blue-500 text-white p-1"
        autoFocus
        disabled={disabled}
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-12 h-5 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-[10px] ${
        value > 0 ? "text-green-400 font-semibold" : "text-gray-500"
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {value}
    </div>
  )
}

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
    
    if (newWidth > 40) { // Largura mínima da coluna reduzida
      setColumnWidths(prev => ({
        ...prev,
        [isResizing.current!]: newWidth
      }));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizing.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const startResizing = useCallback((columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey];
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, handleMouseMove, handleMouseUp]);

  return { columnWidths, startResizing };
};

// --- MODAL DE UPLOAD DE REFORÇO ---

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-400" />
            Carregar Arquivo de Reforço
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Selecione um arquivo Excel (.xlsx) com os dados de reforço
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="bg-gray-800 border-gray-700 text-white"
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

// --- COMPONENTE PRINCIPAL ---

export default function PedidosTab() {
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
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [isReforcoModalOpen, setIsReforcoModalOpen] = useState(false)
  const [isUploadingReforco, setIsUploadingReforco] = useState(false)
  const [isCorteModalOpen, setIsCorteModalOpen] = useState(false)

  // Refs para sincronização do scroll
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  // Larguras iniciais das colunas mais compactas
  const initialColumnWidths: ColumnWidths = {
    TIPO: 90,
    Codigo: 70,
    Descricao: 210,
    ...lojas.reduce((acc, loja) => ({ ...acc, [loja]: 50 }), {})
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
    const matchesSearch = pedido.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pedido.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTipo = filtroTipo === 'Todos' || pedido.tipoSepar === filtroTipo
    return matchesSearch && matchesTipo
  })

  // Handlers
  const handleQuantityUpdate = async (id: string, loja: string, value: number) => {
    try {
      await updateQuantity(id, loja, value)
      toast.success('Quantidade atualizada com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar quantidade')
    }
  }

  const handleCorteExecuted = useCallback(() => {
    refetch()
    toast.success('Dados atualizados após corte!')
  }, [refetch])

  const handleTypeUpdate = async (id: string, value: string) => {
    try {
      await updateItemType(id, value)
      toast.success('Tipo atualizado com sucesso!')
    } catch (error) {
      toast.error('Erro ao atualizar tipo')
    }
  }

  const handleReforcoUpload = async (file: File) => {
    setIsUploadingReforco(true)
    try {
      await uploadReforco(file)
      toast.success('Reforço carregado com sucesso!')
      setIsReforcoModalOpen(false)
    } catch (error) {
      toast.error('Erro ao carregar reforço')
    } finally {
      setIsUploadingReforco(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Cabeçalho com filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80 bg-gray-800/50 border-gray-700 text-white h-10"
            />
          </div>
          
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white h-10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="FRIO">FRIO</SelectItem>
              <SelectItem value="SECO">SECO</SelectItem>
              <SelectItem value="ORGÂNICO">ORGÂNICO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      <div className="flex gap-3">
        <Button
            onClick={() => setIsCorteModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Scissors className="w-4 h-4 mr-2" />
            Corte de Produtos
          </Button>

        <Button
          onClick={() => setIsReforcoModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Carregar Reforço
        </Button>
      </div>
    </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando pedidos...</span>
        </div>
      )}

      {/* Tabela com estilo Excel */}
      {!isLoading && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          {/* Scroll horizontal superior */}
          <div 
            ref={topScrollRef}
            className="overflow-x-auto overflow-y-hidden h-3 bg-gray-800"
            style={{ display: tableWidth > 1000 ? 'block' : 'none' }}
          >
            <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
          </div>

          <div
            ref={tableContainerRef}
            className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]"
          >
            <Table className="border-collapse">
              <TableHeader className="sticky top-0 bg-gray-900 z-10">
                <TableRow className="border-b-2 border-gray-700">
                  {/* Coluna TIPO */}
                  <TableHead
                    className="text-white font-semibold text-[10px] bg-gray-900 sticky left-0 z-20 border-r border-gray-600 border-b border-gray-600 p-1 h-7"
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
                    className="text-white font-semibold text-[10px] bg-gray-900 sticky z-20 border-r border-gray-600 border-b border-gray-600 p-1 h-7"
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
                    className="text-white font-semibold text-[10px] bg-gray-900 sticky z-20 border-r border-gray-600 border-b border-gray-600 p-1 h-7"
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
                      className="text-white font-semibold text-[10px] text-center bg-gray-900 border-r border-gray-600 border-b border-gray-600 p-1 h-7"
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
                    className="border-b border-gray-700 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Coluna TIPO */}
                    <TableCell
                      className="bg-gray-900/80 sticky left-0 z-10 border-r border-gray-600 p-1 h-6"
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
                      className="text-blue-300 font-mono text-[10px] bg-gray-900/80 sticky z-10 border-r border-gray-600 p-1 h-6"
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
                      className="text-gray-300 text-[10px] bg-gray-900/80 sticky z-10 border-r border-gray-600 p-1 h-6"
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
                        className="text-center border-r border-gray-600 p-1 h-6"
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
        </div>
      )}

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
      {/* Modal de Corte - NOVO */}
      <CorteModal
        isOpen={isCorteModalOpen}
        onClose={() => setIsCorteModalOpen(false)}
        onCutExecuted={handleCorteExecuted}
      />
    </motion.div>
  )
}