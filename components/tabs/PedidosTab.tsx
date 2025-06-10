// components/tabs/PedidosTab.tsx (ATUALIZADO)
"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Loader2, AlertCircle } from "lucide-react"
import { usePedidosData } from "@/hooks/usePedidosData"

interface EditableInputProps {
  value: number
  onSave: (value: number) => void
  disabled?: boolean
}

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
    >
      {value || ""}
    </div>
  )
}

interface EditableSelectProps {
  value: string;
  onSave: (value: string) => void;
  disabled?: boolean;
}

function EditableSelect({ value, onSave, disabled }: EditableSelectProps) {
  const handleSave = (newValue: string) => {
    if (newValue) {
      onSave(newValue);
    }
  };

  return (
    <Select value={value} onValueChange={handleSave} disabled={disabled}>
      <SelectTrigger className="w-24 h-6 text-xs bg-gray-800/0 border-none text-white focus:ring-0 focus:ring-offset-0">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-700">
        <SelectItem value="SECO">SECO</SelectItem>
        <SelectItem value="FRIO">FRIO</SelectItem>
        <SelectItem value="ORGANICO">ORGÂNICO</SelectItem>
      </SelectContent>
    </Select>
  );
}


export default function PedidosTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const { pedidos, lojas, isLoading, error, updateQuantity, updateItemType } = usePedidosData()

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
      console.error('Erro ao atualizar quantidade:', result.error)
      // Aqui você pode adicionar um toast de erro se quiser
    }
  }, [updateQuantity])

  const handleItemTypeUpdate = useCallback(async (itemId: string, newType: string) => {
    const result = await updateItemType(itemId, newType)
    if (!result.success && result.error) {
      console.error('Erro ao atualizar tipo de separação:', result.error)
      // Aqui você pode adicionar um toast de erro se quiser
    }
  }, [updateItemType])

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
              <SelectValue placeholder="Filtrar tipo" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando pedidos...</span>
        </div>
      )}

      {/* Tabela */}
      {!isLoading && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 bg-gray-800/50">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-28">
                    TIPO DE SEPAR.
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-20">
                    CALIBRE
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24">
                    Código
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-80">
                    Descrição
                  </TableHead>
                  {lojas.map((loja) => (
                    <TableHead
                      key={loja}
                      className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-16"
                    >
                      {loja}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.map((pedido) => (
                  <TableRow key={pedido.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                    <TableCell className="text-white text-xs border-r border-gray-700 font-medium p-1">
                       <EditableSelect
                          value={pedido.tipoSepar}
                          onSave={(value) => handleItemTypeUpdate(pedido.id, value)}
                        />
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs border-r border-gray-700">
                      {pedido.calibre || "-"}
                    </TableCell>
                    <TableCell className="text-blue-400 text-xs border-r border-gray-700 font-mono">
                      {pedido.codigo}
                    </TableCell>
                    <TableCell className="text-white text-xs border-r border-gray-700">
                      {pedido.descricao}
                    </TableCell>
                    {lojas.map((loja) => (
                      <TableCell key={loja} className="text-center border-r border-gray-700 p-1">
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
          <p className="text-gray-500 text-sm">Use o botão "Nova Separação" no cabeçalho para começar.</p>
        </motion.div>
      )}
    </motion.div>
  )
}