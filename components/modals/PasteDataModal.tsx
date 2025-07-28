// components/modals/PasteDataModal.tsx
"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { X, Copy, AlertCircle, CheckCircle, FileSpreadsheet, Upload, Loader2 } from "lucide-react"

interface PasteDataModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (count: number) => void
  onAddItems: (items: any[]) => Promise<{ success: boolean; error?: string }>
}

interface ParsedItem {
  codigo: string
  material: string
  quantidadeKg: number
  quantidadeCaixas: number
}

export default function PasteDataModal({ isOpen, onClose, onSuccess, onAddItems }: PasteDataModalProps) {
  const [pastedData, setPastedData] = useState("")
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"paste" | "preview">("paste")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Função para remover zeros à esquerda do código
  const cleanCode = (codigo: string): string => {
    // Remove todos os zeros à esquerda, mas mantém pelo menos um dígito
    return codigo.replace(/^0+/, '') || '0'
  }

  // Função para converter números com vírgula para float
  const parseNumber = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null || value === '') return 0
    
    if (typeof value === 'number') {
      return isNaN(value) ? 0 : value
    }
    
    // Remove espaços e substitui vírgula por ponto
    // Remove pontos que são separadores de milhares (mantém apenas a última vírgula/ponto como decimal)
    const cleanValue = String(value).trim()
      .replace(/\./g, '') // Remove pontos de milhares
      .replace(',', '.') // Substitui vírgula decimal por ponto
    
    const parsed = parseFloat(cleanValue)
    return isNaN(parsed) ? 0 : parsed
  }

  const parseClipboardData = (data: string): ParsedItem[] => {
    const lines = data.trim().split('\n')
    const items: ParsedItem[] = []
    
    // Skip header line if exists
    const startIndex = lines[0]?.toLowerCase().includes('código') || 
                       lines[0]?.toLowerCase().includes('material') ? 1 : 0
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      // Split by tab or multiple spaces or semicolon
      const columns = line.split(/\t|;|  +/).map(col => col.trim())
      
      if (columns.length >= 2) {
        const codigo = cleanCode(columns[0] || '')
        const material = columns[1] || ''
        
        // Tratar valores de quantidade que podem vir como undefined, null ou string vazia
        const quantidadeKgRaw = columns[2] || '0'
        const quantidadeCaixasRaw = columns[3] || '0'
        
        const quantidadeKg = parseNumber(quantidadeKgRaw)
        const quantidadeCaixas = parseNumber(quantidadeCaixasRaw)
        
        // Só adiciona se tem código e material válidos
        if (codigo && material && codigo !== '0' && material.length > 0) {
          items.push({
            codigo,
            material,
            quantidadeKg,
            quantidadeCaixas
          })
        }
      }
    }
    
    return items
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault()
    const clipboardData = e.clipboardData.getData('text')
    setPastedData(clipboardData)
    
    try {
      const parsed = parseClipboardData(clipboardData)
      
      if (parsed.length === 0) {
        setError('Nenhum dado válido encontrado. Verifique o formato dos dados.')
        return
      }
      
      setParsedItems(parsed)
      setError("")
      setStep("preview")
    } catch (err) {
      setError('Erro ao processar dados. Verifique o formato.')
    }
  }

  const handleManualPaste = () => {
    if (!pastedData.trim()) {
      setError('Cole os dados na área de texto primeiro')
      return
    }
    
    try {
      const parsed = parseClipboardData(pastedData)
      if (parsed.length === 0) {
        setError('Nenhum dado válido encontrado. Verifique o formato dos dados.')
        return
      }
      
      setParsedItems(parsed)
      setError("")
      setStep("preview")
    } catch (err) {
      setError('Erro ao processar dados. Verifique o formato.')
    }
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const result = await onAddItems(parsedItems)
      
      if (result.success) {
        onSuccess(parsedItems.length)
        handleClose()
      } else {
        setError(result.error || 'Erro ao adicionar itens')
      }
    } catch (err) {
      setError('Erro inesperado ao salvar dados')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPastedData("")
    setParsedItems([])
    setError("")
    setStep("paste")
    setIsLoading(false)
    onClose()
  }

  const handleBack = () => {
    setStep("paste")
    setError("")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            // AJUSTE: Largura reduzida, overflow-hidden para manter os cantos arredondados na animação
            className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg"
          >
            {/* AJUSTE: Card agora usa flexbox para controlar o layout do header e content */}
            <Card className="bg-gray-900 border-gray-700 w-full h-full flex flex-col">
              {/* AJUSTE: Header com flex-shrink-0 para não encolher */}
              <CardHeader className="flex flex-row items-center justify-between flex-shrink-0">
                <CardTitle className="text-xl font-bold apple-font text-white flex items-center">
                  <Copy className="w-5 h-5 mr-2" />
                  {step === "paste" ? "Colar Dados do Excel" : "Confirmar Dados"}
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClose} 
                  className="text-gray-400 hover:text-white"
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              
              {/* AJUSTE: CardContent agora é rolável */}
              <CardContent className="overflow-y-auto">
                {step === "paste" && (
                  <div className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                      <h3 className="text-blue-400 font-semibold mb-2 flex items-center">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Como usar:
                      </h3>
                      <ul className="text-blue-300 text-sm space-y-1">
                        <li>1. Copie os dados do Excel (Ctrl+C)</li>

                      </ul>
                    </div>

                    <div className="space-y-4">
                      <label className="text-gray-300 font-medium">
                        Cole seus dados aqui:
                      </label>
                      
                      <div
                        onPaste={handlePaste}
                        className="relative border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                      >
                        <Copy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                        <p className="text-gray-400 mb-2">
                          <strong>Ctrl+V</strong> para colar dados do Excel
                        </p>
                      </div>

              

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
                          <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
                          <span className="text-red-300 text-sm">{error}</span>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3">
                        <Button 
                          variant="outline" 
                          onClick={handleClose}
                          disabled={isLoading}
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleManualPaste}
                          disabled={!pastedData.trim() || isLoading}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Processar Dados
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {step === "preview" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          {parsedItems.length} itens encontrados
                        </Badge>
                        <span className="text-gray-400 text-sm">
                          Os cálculos serão feitos automaticamente
                        </span>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto border border-gray-700 rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-700 bg-gray-800">
                            <TableHead className="text-gray-300 text-xs">CÓDIGO</TableHead>
                            <TableHead className="text-gray-300 text-xs">MATERIAL</TableHead>
                            <TableHead className="text-gray-300 text-xs text-center">Quantidade KG</TableHead>
                            <TableHead className="text-gray-300 text-xs text-center">Quantidade Caixas</TableHead>
                            <TableHead className="text-gray-300 text-xs text-center">Média Sistema</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedItems.map((item, index) => {
                            const mediaSistema = item.quantidadeCaixas > 0 ? 
                              (item.quantidadeKg / item.quantidadeCaixas) : 0

                            return (
                              <TableRow key={index} className="border-gray-700">
                                <TableCell className="text-white text-xs font-mono">
                                  {item.codigo}
                                </TableCell>
                                <TableCell className="text-white text-xs">
                                  {item.material}
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  <span className="text-blue-400 font-medium">
                                    {item.quantidadeKg.toFixed(3)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  <span className="text-green-400 font-medium">
                                    {item.quantidadeCaixas.toFixed(6)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-xs">
                                  <span className="text-yellow-400 font-medium">
                                    {mediaSistema.toFixed(8)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
                        <span className="text-red-300 text-sm">{error}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={handleBack}
                        disabled={isLoading}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Voltar
                      </Button>
                      <div className="flex space-x-3">
                        <Button 
                          variant="outline" 
                          onClick={handleClose}
                          disabled={isLoading}
                          className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleConfirm}
                          disabled={isLoading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Confirmar e Adicionar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}