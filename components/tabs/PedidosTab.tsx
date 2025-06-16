// components/tabs/PedidosTab.tsx
"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, Filter, Loader2, GripVertical } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);
  
  const startResizing = useCallback((columnKey: string, e: React.MouseEvent) => {
    isResizing.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey];
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, handleMouseMove, handleMouseUp]);
  
  return { columnWidths, startResizing };
};

// --- COMPONENTES DE CÉLULA EDITÁVEL ---

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
    const numValue = parseInt(tempValue) || 0
    onSave(numValue);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <Input
        type="number"
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

// --- COMPONENTE PRINCIPAL ---

export default function PedidosTab() {
  const { pedidos, lojas, isLoading, error, updateQuantity, updateItemType } = usePedidosData()
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')

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

  const filteredPedidos = pedidos.filter((pedido) => {
    const matchesSearch = 
      pedido.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filtroTipo === 'Todos' || pedido.tipoSepar === filtroTipo
    
    return matchesSearch && matchesType
  })

  const handleQuantityUpdate = async (itemId: string, storeCode: string, quantity: number) => {
    const result = await updateQuantity(itemId, storeCode, quantity)
    if (result.success) {
      toast.success('Quantidade atualizada com sucesso!')
    } else {
      toast.error(`Erro ao atualizar: ${result.error}`)
    }
  }

  const handleItemTypeUpdate = useCallback(async (itemId: string, newType: string) => {
    const result = await updateItemType(itemId, newType)
    if (!result.success && result.error) {
      toast.error('Erro ao atualizar tipo de separação.');
      console.error('Erro ao atualizar tipo de separação:', result.error)
    }
  }, [updateItemType])

  const tableColumns = [
    { key: 'TIPO', label: 'TIPO' },
    { key: 'Codigo', label: 'Código' },
    { key: 'Descricao', label: 'Descrição' },
    ...lojas.map(loja => ({ key: loja, label: loja }))
  ];

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
        <p className="text-red-400 text-lg">Erro ao carregar dados</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10 w-full sm:w-80"
              aria-label="Buscar pedidos"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-white h-10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="SECO">SECO</SelectItem>
              <SelectItem value="FRIO">FRIO</SelectItem>
              <SelectItem value="ORGANICO">ORGÂNICO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando pedidos">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando pedidos...</span>
        </div>
      )}

      {/* Tabela com scroll superior */}
      {!isLoading && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          {/* Barra de rolagem horizontal no topo */}
          <div 
            ref={topScrollRef} 
            className="overflow-x-auto h-2 scrollbar-thin scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 scrollbar-track-transparent"
          >
            <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
          </div>
          
          {/* Tabela principal */}
          <div 
            ref={tableContainerRef} 
            className="overflow-x-auto max-h-[600px] overflow-y-auto"
          >
            <Table style={{ width: `${tableWidth}px` }}>
              <TableHeader className="sticky top-0 z-10 bg-gray-800">
                <TableRow className="border-b-0">
                  {tableColumns.map(({ key, label }) => (
                    <TableHead
                      key={key}
                      className="text-gray-300 font-semibold text-xs border-r border-gray-700 px-2 py-2 whitespace-nowrap relative select-none"
                      style={{ width: columnWidths[key] }}
                    >
                      {label}
                      <div
                        onMouseDown={(e) => startResizing(key, e)}
                        role="separator"
                        aria-label={`Redimensionar coluna ${label}`}
                        className="absolute top-0 right-0 w-2 h-full cursor-col-resize flex items-center justify-center group"
                      >
                         <GripVertical className="text-gray-600 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.map((pedido) => (
                  <TableRow key={pedido.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                    <TableCell className="text-white text-xs border-r border-gray-700 font-medium px-2 py-1" style={{ width: columnWidths.TIPO }}>
                      <EditableSelect
                        value={pedido.tipoSepar}
                        onSave={(value) => handleItemTypeUpdate(pedido.id, value)}
                      />
                    </TableCell>
                    <TableCell className="text-blue-400 text-xs border-r border-gray-700 font-mono px-2 py-1" style={{ width: columnWidths.Codigo }}>
                      {pedido.codigo}
                    </TableCell>
                    <TableCell className="text-white text-xs border-r border-gray-700 px-2 py-1" style={{ width: columnWidths.Descricao }}>
                      <div className="truncate" title={pedido.descricao}>
                        {pedido.descricao}
                      </div>
                    </TableCell>
                    {lojas.map((loja) => (
                      <TableCell key={loja} className="text-center border-r border-gray-700 px-1 py-1" style={{ width: columnWidths[loja] }}>
                        <EditableInput
                          value={pedido[loja] as number || 0}
                          onSave={(value) => handleQuantityUpdate(pedido.id, loja, value)}
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

      {!isLoading && filteredPedidos.length === 0 && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-gray-400 text-lg">Nenhum pedido encontrado</p>
          <p className="text-gray-500 text-sm">Ajuste os filtros ou adicione uma nova separação.</p>
        </motion.div>
      )}
    </motion.div>
  )
}