// components/modals/PasteDataModal.tsx
"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  X, 
  Copy, 
  AlertCircle, 
  CheckCircle, 
  FileSpreadsheet, 
  Upload, 
  Loader2, 
  ArrowLeft, 
  Eye,
  Clipboard,
  Calculator
} from "lucide-react"
import { cn } from "@/lib/utils"

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

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 gap-0 bg-background border-border flex flex-col">
        {/* Header Compacto - FIXO */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                {step === "paste" ? (
                  <Clipboard className="h-5 w-5 text-blue-400" />
                ) : (
                  <Eye className="h-5 w-5 text-green-400" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {step === "paste" ? "Colar Dados do Excel" : "Confirmar Dados"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {step === "paste" 
                    ? "Cole os dados copiados do Excel para importar"
                    : `${parsedItems.length} itens processados e prontos para importar`
                  }
                </DialogDescription>
              </div>
            </div>
            
            {/* BOTÕES SEMPRE VISÍVEIS NO TOPO */}
            <div className="flex items-center gap-2">
              {step === "preview" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              {step === "preview" && (
                <Button
                  onClick={handleConfirm}
                  disabled={isLoading}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-1" />
                      Confirmar
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo Principal - ÁREA ROLÁVEL */}
        <div className="flex-1 overflow-hidden">
          {step === "paste" && (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Instruções */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="text-blue-400 font-semibold mb-2">Como usar:</h3>
                      <ul className="text-blue-300 text-sm space-y-1">
                        <li>1. Copie os dados do Excel (Ctrl+C)</li>
                        <li>2. Cole diretamente na área destacada ou no campo de texto</li>
                        <li>3. O sistema processará automaticamente as colunas: Código, Material, Qtd KG, Qtd Caixas</li>
                        <li>4. Revise os dados processados antes de confirmar</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Área de Colagem */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Método 1: Paste Direto */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Método Rápido:</h4>
                      <div
                        onPaste={handlePaste}
                        className="relative border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer bg-card/30"
                      >
                        <Copy className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground mb-2">
                          <strong>Ctrl+V</strong> aqui para colar diretamente
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Os dados serão processados automaticamente
                        </p>
                      </div>
                    </div>

                    {/* Método 2: Manual */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Método Manual:</h4>
                      <div className="space-y-3">
                        <Textarea
                          ref={textareaRef}
                          placeholder="Cole seus dados aqui e clique em 'Processar Dados'"
                          value={pastedData}
                          onChange={(e) => setPastedData(e.target.value)}
                          className="min-h-32 resize-none bg-card border-border text-foreground placeholder:text-muted-foreground"
                        />
                        <Button
                          onClick={handleManualPaste}
                          disabled={!pastedData.trim() || isLoading}
                          variant="outline"
                          className="w-full"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Processar Dados
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Formato Esperado */}
                  

                  {/* Erro */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-destructive/10 border border-destructive/30 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-destructive font-medium">Erro ao processar dados</h4>
                          <p className="text-destructive/80 text-sm mt-1">{error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}

          {step === "preview" && (
            <div className="h-full flex flex-col">
              {/* Info da Preview */}
              <div className="px-6 py-3 border-b border-border bg-card/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {parsedItems.length} itens processados
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Os cálculos serão feitos automaticamente pelo sistema
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Preview - ALTURA FIXA COM SCROLL */}
              <div className="flex-1 p-6 overflow-hidden">
                <div className="h-full border border-border rounded-lg overflow-hidden bg-card">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted z-10">
                        <tr className="border-b border-border">
                          <TableHead className="text-xs font-medium text-muted-foreground w-24">
                            CÓDIGO
                          </TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground">
                            MATERIAL
                          </TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground text-center w-24">
                            QTD KG
                          </TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground text-center w-24">
                            QTD CAIXAS
                          </TableHead>
                          <TableHead className="text-xs font-medium text-muted-foreground text-center w-24">
                            MÉDIA CALC.
                          </TableHead>
                        </tr>
                      </TableHeader>
                      <TableBody>
                        {parsedItems.map((item, index) => {
                          const mediaSistema = item.quantidadeCaixas > 0 
                            ? (item.quantidadeKg / item.quantidadeCaixas).toFixed(2)
                            : '0.00'

                          return (
                            <motion.tr
                              key={`${item.codigo}-${index}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.01 }}
                              className="border-b border-border hover:bg-muted/50"
                            >
                              <TableCell className="font-mono text-xs text-blue-400">
                                {item.codigo}
                              </TableCell>
                              <TableCell className="text-xs text-foreground">
                                <div className="max-w-xs truncate" title={item.material}>
                                  {item.material}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-center font-mono">
                                {item.quantidadeKg.toLocaleString('pt-BR', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </TableCell>
                              <TableCell className="text-xs text-center font-mono">
                                {item.quantidadeCaixas}
                              </TableCell>
                              <TableCell className="text-xs text-center font-mono text-muted-foreground">
                                {mediaSistema}
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Erro na preview */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 bg-destructive/10 border border-destructive/30 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <h4 className="text-destructive font-medium">Erro ao confirmar dados</h4>
                        <p className="text-destructive/80 text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}