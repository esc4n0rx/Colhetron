//******************************************************************************* */
// --- COMPONENTE PRINCIPAL --- RESPONSAVEL PELA TABELA DE PEDIDOS
// --- RENDERIZA A TABELA DE PEDIDOS COM BUSCA, FILTRO E PAGINAÇÃO
// --- UTILIZA O HOOK usePedidosData PARA PEGAR OS DADOS DOS PEDIDOS
// --- UTILIZA O HOOK useMaterialCategories PARA PEGAR AS CATEGORIAS DE MATERIAIS
// --- UTILIZA O GETACTIVITYCOLORCLASSES PARA PEGAR AS CLASSES CSS DAS ATIVIDADES
//******************************************************************************* */

"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Search, Filter, Loader2, Upload, AlertCircle, Scissors, Printer } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePedidosData } from '@/hooks/usePedidosData'
import { useMaterialCategories } from '@/hooks/useMaterialCategories'
import CorteModal from '@/components/modals/CorteModal'
// --- NOVA IMPORTAÇÃO DO MODAL DE IMPRESSÃO ---
import ReinforcementPrintModal from '@/components/modals/ReinforcementPrintModal'
import { getActivityColorClasses } from '@/lib/activity-helpers'
import { ItemActivityType } from '@/types/activity'

// --- INTERFACES E TIPOS ---
// Fica a dica: Manter as interfaces perto de onde são usadas ajuda na leitura,
// mas se forem usadas em vários lugares, vale a pena ter um arquivo só pra types.
interface PedidoItem {
  id: string
  tipoSepar: string
  calibre: string
  codigo: string
  descricao: string
  [key: string]: string | number // Index signature pra gente poder acessar as lojas dinamicamente (ex: item[loja])
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

// --- MODAL DE UPLOAD DE REFORÇO ---
// Componente simples e focado, só pra cuidar do modal de upload.
interface ReforcoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<any>; // Modificado para retornar a resposta da API
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
      await onUpload(selectedFile); // A lógica de fechar o modal vai ser tratada no componente pai, o que é bom pra manter o controle lá.
      setSelectedFile(null); // Limpa o estado interno depois do upload.
    }
  };
  
  // Efeito pra limpar o arquivo selecionado se o modal for fechado sem upload.
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
// Esse cara aqui é show! Permite editar o valor direto na célula da tabela.
// PS: Se precisar usar em outro lugar, já tá quase pronto pra virar um componente reutilizável. deixei aqui como exemplo.
function EditableInput({ value, onSave, disabled, activityType = 'default' }: EditableInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())

  const handleSave = () => {
    const numValue = parseInt(tempValue) || 0
    if (numValue !== value) {
      onSave(numValue) // Só salva se o valor realmente mudou, pra evitar chamadas desnecessárias na API.
    }
    setIsEditing(false)
  }

  // Atalhos de teclado pra melhorar a usabilidade. Enter salva, Esc cancela.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setTempValue(value.toString())
      setIsEditing(false)
    }
  }

  // O blur (clicar fora) também salva. O setTimeout é um truquezinho pra garantir que o 'save' aconteça antes de outras coisas.
  const handleBlur = () => {
    setTimeout(() => {
        if(isEditing) {
            handleSave()
        }
    }, 100);
  }

  if (isEditing) {
    return (
      <Input
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-16 h-6 text-center text-xs bg-gray-800 border-blue-500 text-white"
        autoFocus // Foca no input assim que ele aparece.
        disabled={disabled}
      />
    )
  }

  // Define a cor baseada na atividade. Isso dá um feedback visual massa pro usuário. e foi pedido pelo cliente.
  // Se o valor for zero ou negativo, usa uma cor neutra.
  const colorClasses = value > 0 
    ? getActivityColorClasses(activityType)
    : "text-gray-500"

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-16 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-xs ${colorClasses} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {value || 0}
    </div>
  )
}

// --- COMPONENTE EDITÁVEL SELECT ---
// Mesma ideia do EditableInput, mas para um dropdown. Super útil pra trocar a categoria na hora.
function EditableSelect({ value, onSave, disabled }: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { categories } = useMaterialCategories() // Puxa as categorias de um hook.

  // useMemo pra otimizar a lista de opções, não precisa recalcular a cada render.
  const options = useMemo(() => {
    const uniqueCategories = [...new Set(categories.map(cat => cat.value))]
    // Dar uma prioridade pra algumas categorias aparecerem primeiro na lista. Fica mais organizado.
    const priorityCategories = ['SECO', 'FRIO', 'ORGANICO']
    const otherCategories = uniqueCategories.filter(cat => !priorityCategories.includes(cat))
    return [...priorityCategories.filter(cat => uniqueCategories.includes(cat)), ...otherCategories]
  }, [categories])

  const handleSave = (newValue: string) => {
    onSave(newValue)
    setIsEditing(false)
  }

  // Uma funçãozinha pra deixar os badges de categoria coloridos. Fica bem mais visual.
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
// O coração da nossa tela de pedidos.
export default function PedidosTab() {
  // Estados para controlar filtros, modais, e UI em geral.
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [showCorteModal, setShowCorteModal] = useState(false)
  const [isReforcoModalOpen, setIsReforcoModalOpen] = useState(false)
  const [isUploadingReforco, setIsUploadingReforco] = useState(false)
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({})
  const [resizing, setResizing] = useState<{ column: string; startX: number; startWidth: number } | null>(null)
  
  // Estado pro zoom da tabela, com persistência no localStorage.
  const [tableScale, setTableScale] = useState(1.0);
  const TABLE_SCALE_KEY = 'pedidos-table-scale';

  // Novo estado pro modal de impressão de reforço
  const [isReinforcementModalOpen, setIsReinforcementModalOpen] = useState(false)

  // Hook customizado pra buscar e gerenciar os dados dos pedidos. Abstrai toda a lógica de API.
  const { 
    pedidos, 
    lojas, 
    isLoading, 
    error, 
    updateQuantity, 
    updateItemType,
    uploadReforco,
    getItemActivityStatus,
    activeSeparationId, // Precisamos do ID da separação ativa pro modal de impressão.
    refetch
  } = usePedidosData()

  // Recupera o zoom salvo quando o componente carrega.
  useEffect(() => {
    const savedScale = localStorage.getItem(TABLE_SCALE_KEY);
    if (savedScale) {
        setTableScale(parseFloat(savedScale) || 1.0);
    }
  }, []);

  // Salva o zoom no localStorage sempre que ele muda.
  useEffect(() => {
    localStorage.setItem(TABLE_SCALE_KEY, String(tableScale));
  }, [tableScale]);

  // useMemo pra não ter que recalcular os tipos de filtro a cada render.
  const availableTypes = useMemo(() => {
    const types = new Set(pedidos.map(item => item.tipoSepar).filter(Boolean))
    // Ordena os tipos pra ter uma ordem fixa e prioritária no filtro.
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

  // Aqui é onde a mágica da filtragem E da ordenação acontece!
  const filteredData = useMemo(() => {
    // Primeiro, a gente filtra os dados com base na busca e no tipo selecionado.
    const dataToFilter = pedidos.filter(item => {
      const matchesSearch = searchTerm === "" || 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descricao.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = filtroTipo === "Todos" || item.tipoSepar === filtroTipo
      
      return matchesSearch && matchesType
    })

    // ***** ALTERAÇÃO APLICADA AQUI *****
    // Agora, a gente ordena o resultado do filtro em ordem alfabética pela descrição.
    // Usar `localeCompare` é a forma correta de comparar strings, lidando bem com acentos e caracteres especiais.
    return dataToFilter.sort((a, b) => a.descricao.localeCompare(b.descricao));

  }, [pedidos, searchTerm, filtroTipo]) // Só roda de novo se uma dessas dependências mudar.

  // Handler pro upload de reforço.
  const handleReforcoUpload = async (file: File) => {
    setIsUploadingReforco(true)
    try {
      const result = await uploadReforco(file)
      if (result.success) {
        toast.success('Reforço carregado com sucesso!')
        setIsReforcoModalOpen(false)
        // Feature legal: abre o modal de impressão logo depois do upload.
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

  // Callback pra atualizar os dados depois de uma operação de corte.
  // useCallback evita que a função seja recriada a cada render.
  const handleCorteExecuted = useCallback(() => {
    refetch() // Pede pro nosso hook de dados buscar os dados mais recentes.
    toast.success('Dados atualizados após corte!')
  }, [refetch])

  // Lógica para redimensionamento das colunas da tabela. nao funciona !!!
  // analisar depois
  const startResize = useCallback((e: React.MouseEvent, column: string) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = columnWidths[column] || 80 // 80 é o nosso fallback.
    setResizing({ column, startX, startWidth })
  }, [columnWidths])

  // Efeito que "ouve" o movimento do mouse pra fazer o redimensionamento em si.
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return
      const diff = (e.clientX - resizing.startX) / tableScale; // Ajusta o movimento com base no zoom da tabela.
      const newWidth = Math.max(60, resizing.startWidth + diff) // Garante uma largura mínima.
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth
      }))
    }
    const handleMouseUp = () => setResizing(null) // Para o redimensionamento quando soltar o mouse.

    if (resizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [resizing, tableScale])

  // Calcula o total por loja/coluna. useCallback pra otimizar.
  const getTotalByStore = useCallback((store: string) => {
    return filteredData.reduce((total, item) => total + (Number(item[store]) || 0), 0)
  }, [filteredData])

  // Calcula o total geral de todos os itens visíveis.
  const grandTotal = useMemo(() => {
    return lojas.reduce((total, loja) => total + getTotalByStore(loja), 0)
  }, [lojas, getTotalByStore])

  // --- RENDERIZAÇÃO DO COMPONENTE ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Cabeçalho com título e botões de ação */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white apple-font">Pedidos</h2>
          <p className="text-gray-400">Gerencie as quantidades por loja ({filteredData.length} itens)</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowCorteModal(true)}
            variant="outline"
            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
          >
            <Scissors className="w-4 h-4 mr-2" />
            Corte de Produto
          </Button>

          {/* Controle de zoom da tabela, bem bacana pra quem usa telas diferentes. */}
          <div className="flex items-center gap-2 border border-gray-700 bg-gray-800/50 text-white rounded-md h-10 px-3">
            <label htmlFor="table-size-slider" className="text-sm font-medium text-gray-300 whitespace-nowrap">
              Tamanho
            </label>
            <input
              id="table-size-slider"
              type="range"
              min="0.7"
              max="1.2"
              step="0.05"
              value={tableScale}
              onChange={(e) => setTableScale(parseFloat(e.target.value))}
              className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <Button 
            onClick={() => setIsReforcoModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Carregar Reforço
          </Button>
        </div>
      </div>

      {/* Barra de busca e filtros */}
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
      
      {/* Tratamento de estado de erro */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {/* Tratamento de estado de carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando pedidos...</span>
        </div>
      )}

      {/* A Tabela em si, com um wrapper para o efeito de zoom/escala */}
      {!isLoading && !error && filteredData.length > 0 && (
        // Container pai que corta o conteúdo expandido, pra escala funcionar direitinho.
        <div className="overflow-hidden rounded-lg">
          <div
            // Container filho que é escalado e expandido.
            className="bg-gray-900/50 border border-gray-800 rounded-lg transition-transform duration-200"
            style={{
              transform: `scale(${tableScale})`,
              transformOrigin: 'top left',
              // Expande a largura e altura inversamente à escala pra preencher o espaço.
              width: `${100 / tableScale}%`,
              height: `${100 / tableScale}%`,
            }}
          >
            <div className="overflow-x-auto">
              <div className="table-wrapper">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-800/50">
                      {/* Colunas fixas (sticky) pra facilitar a navegação horizontal */}
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24 sticky left-0 bg-gray-800/80 z-20">CATEGORIA</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-28 sticky left-24 bg-gray-800/80 z-20">CÓDIGO</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-60">DESCRIÇÃO</TableHead>
                      
                      {/* Colunas dinâmicas para as lojas, com redimensionamento */}
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
                          {/* O 'resizer' que só aparece no hover */}
                          <div
                            className="absolute top-0 right-0 w-1 h-full bg-gray-600 cursor-col-resize opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => startResize(e, loja)}
                          />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Aqui a gente mapeia os dados JÁ FILTRADOS E ORDENADOS para as linhas da tabela */}
                    {filteredData.map((item) => (
                      <TableRow key={item.id} className="border-gray-700 hover:bg-gray-700/30">
                        {/* Colunas fixas de novo, pra acompanhar o scroll */}
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
                        
                        {/* Células de quantidade para cada loja */}
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

      {/* Estado para quando não há dados, com mensagem útil */}
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

      {/* Renderização dos modais que ficam "escondidos" até serem chamados */}
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

      {/* Novo modal de impressão de reforço */}
      <ReinforcementPrintModal
        isOpen={isReinforcementModalOpen}
        onClose={() => setIsReinforcementModalOpen(false)}
        separationId={activeSeparationId}
      />
    </motion.div>
  )
}