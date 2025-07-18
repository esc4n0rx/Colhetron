// components/tabs/FaturamentoTab.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertTriangle, Download, CheckCircle, RefreshCw, Calculator, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import MissingMediaModal from '@/components/modals/MissingMediaModal'
import MediaErrorModal from '@/components/modals/MediaErrorModal'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export interface MediaAnalysisStatus {
  totalItems: number
  itemsWithError: number
  errorItems: {
    id: string
    codigo: string
    material: string
    status: string
    error: string
  }[]
}

interface FaturamentoItem {
  loja: string
  centro: string
  material: string
  quantidade: number
}

interface MissingMediaItem {
  material: string
  description?: string
  quantidade: number
  lojas: string[]
}

interface DebugInfo {
  totalQuantities: number
  validQuantities: number
  excludedQuantities: number
  processedItems: number
  skippedItems: number
  expectedItems: number
  finalItems: number
  lojasWithoutCenter: string[]
  processingSteps: string[]
}

type ProcessingStep = 'idle' | 'analyzing' | 'validating' | 'generating_table' | 'ready_for_excel'

export default function FaturamentoTab() {
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle')
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
  
  // Estados para modais
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showMissingMediaModal, setShowMissingMediaModal] = useState(false)
  
  // Estados para dados
  const [mediaStatus, setMediaStatus] = useState<MediaAnalysisStatus | null>(null)
  const [missingMediaItems, setMissingMediaItems] = useState<MissingMediaItem[]>([])
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoItem[]>([])
  
  // Estados para debugging
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebugDetails, setShowDebugDetails] = useState(false)
  
  // Reset completo do estado
  const resetState = () => {
    setProcessingStep('idle')
    setMediaStatus(null)
    setMissingMediaItems([])
    setFaturamentoData([])
    setShowErrorModal(false)
    setShowMissingMediaModal(false)
    setDebugInfo(null)
    setShowDebugDetails(false)
  }

  // Função principal que orquestra todo o processo
  const startFaturamentoProcess = async () => {
    resetState()
    setProcessingStep('analyzing')
    
    try {
      // Etapa 1: Análise de Status das Médias
      const mediaStatusResult = await checkMediaAnalysisStatus()
      if (!mediaStatusResult) return
      
      setProcessingStep('validating')
      
      // Etapa 2: Validação e Geração da Tabela
      await generateFaturamentoTable()
      
    } catch (error) {
      console.error('Erro no processo de faturamento:', error)
      toast.error('Erro no processo de faturamento')
      setProcessingStep('idle')
    }
  }

  const checkMediaAnalysisStatus = async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/faturamento/check-media-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const error = await response.json()
        
        // Verificar se é um erro de materiais sem análise de média
        if (error.missingMaterials && error.missingMaterials.length > 0) {
          const missingItems: MissingMediaItem[] = error.missingMaterials.map((material: string) => ({
            material: material,
            description: `Material ${material}`,
            quantidade: 0,
            lojas: []
          }))
          
          setMissingMediaItems(missingItems)
          setShowMissingMediaModal(true)
          setProcessingStep('idle')
          return false
        }
        
        throw new Error(error.error || 'Erro ao verificar status das médias')
      }

      const data = await response.json()
      setMediaStatus(data)

      // Se há erros de status, mostrar modal de erro e parar o processo
      if (data.itemsWithError > 0) {
        setShowErrorModal(true)
        setProcessingStep('idle')
        return false
      }

      return true
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido')
      setProcessingStep('idle')
      return false
    }
  }

  const generateFaturamentoTable = async () => {
    try {
      setProcessingStep('generating_table')
      
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/faturamento/generate-table', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const error = await response.json()
        
        // Capturar debug info mesmo em caso de erro
        if (error.debug) {
          setDebugInfo(error.debug)
        }
        
        throw new Error(error.error || 'Erro ao gerar tabela de faturamento')
      }

      const data = await response.json()
      setFaturamentoData(data.items)
      
      // Capturar informações de debug
      if (data.debug) {
        setDebugInfo(data.debug)
      }
      
      setProcessingStep('ready_for_excel')
      
      // Mostrar alertas baseados no debug
      if (data.debug) {
        if (data.debug.finalItems < data.debug.expectedItems) {
          toast.warning(`Possível perda de dados detectada: ${data.debug.finalItems}/${data.debug.expectedItems} itens processados`)
        }
        
        if (data.debug.lojasWithoutCenter.length > 0) {
          toast.warning(`${data.debug.lojasWithoutCenter.length} lojas sem centro foram ignoradas`)
        }
      }
      
    } catch (error) {
      console.error('Erro ao gerar tabela:', error)
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido')
      setProcessingStep('idle')
    }
  }

  const generateExcelTemplate = async () => {
    try {
      setIsGeneratingExcel(true)
      
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/faturamento/generate-excel', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const error = await response.json()
        
        // Capturar debug info mesmo em caso de erro
        if (error.debug) {
          setDebugInfo(error.debug)
        }
        
        throw new Error(error.error || 'Erro ao gerar template Excel')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `faturamento_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Template Excel gerado com sucesso!')
      
    } catch (error) {
      console.error('Erro ao gerar Excel:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar template Excel')
    } finally {
      setIsGeneratingExcel(false)
    }
  }

  const handleProceedAnyway = () => {
    setShowErrorModal(false)
    generateFaturamentoTable()
  }

  const handleNavigateToMedia = () => {
    setShowErrorModal(false)
    setShowMissingMediaModal(false)
    toast.info('Navegue até a aba "Análise de Médias" para corrigir as pendências.')
  }

  const getProcessingStepText = () => {
    switch (processingStep) {
      case 'analyzing':
        return 'Analisando médias do sistema...'
      case 'validating':
        return 'Validando dados...'
      case 'generating_table':
        return 'Gerando tabela de faturamento...'
      case 'ready_for_excel':
        return 'Pronto para gerar Excel!'
      default:
        return 'Aguardando...'
    }
  }

  const getProcessingStepIcon = () => {
    switch (processingStep) {
      case 'analyzing':
        return <Calculator className="w-5 h-5 animate-pulse" />
      case 'validating':
        return <RefreshCw className="w-5 h-5 animate-spin" />
      case 'generating_table':
        return <Loader2 className="w-5 h-5 animate-spin" />
      case 'ready_for_excel':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <Calculator className="w-5 h-5" />
    }
  }

  const getDebugStatusColor = () => {
    if (!debugInfo) return 'border-gray-200 bg-gray-50'
    
    if (debugInfo.finalItems < debugInfo.expectedItems) {
      return 'border-red-200 bg-red-50'
    }
    
    if (debugInfo.lojasWithoutCenter.length > 0) {
      return 'border-orange-200 bg-orange-50'
    }
    
    return 'border-green-200 bg-green-50'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Faturamento</h2>
          <p className="text-gray-600">Gere templates de faturamento baseados nas médias do sistema</p>
        </div>
      </div>

      {/* Processing Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getProcessingStepIcon()}
            Processamento de Faturamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {processingStep === 'idle' ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                Clique no botão abaixo para iniciar o processamento dos dados de faturamento.
              </p>
              <Button 
                onClick={startFaturamentoProcess}
                className="w-full max-w-md"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Iniciar Processamento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getProcessingStepIcon()}
                <span className="text-sm font-medium">{getProcessingStepText()}</span>
              </div>
              
              {processingStep !== 'ready_for_excel' && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: processingStep === 'analyzing' ? '25%' : 
                             processingStep === 'validating' ? '50%' : 
                             processingStep === 'generating_table' ? '75%' : '100%'
                    }}
                  />
                </div>
              )}
              
              {processingStep === 'ready_for_excel' && (
                <div className="flex gap-2">
                  <Button 
                    onClick={generateExcelTemplate}
                    disabled={isGeneratingExcel}
                    className="flex-1"
                  >
                    {isGeneratingExcel ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Gerar Excel
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetState}
                    disabled={isGeneratingExcel}
                  >
                    Resetar
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Information */}
      {debugInfo && (
        <Card className={getDebugStatusColor()}>
          <CardHeader>
            <Collapsible open={showDebugDetails} onOpenChange={setShowDebugDetails}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bug className="w-5 h-5 text-gray-700" />
                    <span className="text-lg font-semibold text-gray-800">
                      Informações de Debug
                    </span>
                  </div>
                  {showDebugDetails ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-6">
                  {/* Resumo dos Contadores */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Total Quantidades</p>
                      <p className="text-2xl font-bold text-gray-900">{debugInfo.totalQuantities}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Quantidades Válidas</p>
                      <p className="text-2xl font-bold text-green-600">{debugInfo.validQuantities}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Quantidades Excluídas</p>
                      <p className="text-2xl font-bold text-yellow-600">{debugInfo.excludedQuantities}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Itens Processados</p>
                      <p className="text-2xl font-bold text-blue-600">{debugInfo.processedItems}</p>
                    </div>
                  </div>

                  {/* Resumo dos Resultados */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Itens Ignorados</p>
                      <p className="text-2xl font-bold text-orange-600">{debugInfo.skippedItems}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Itens Esperados</p>
                      <p className="text-2xl font-bold text-gray-600">{debugInfo.expectedItems}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Itens Finais</p>
                      <p className={`text-2xl font-bold ${debugInfo.finalItems < debugInfo.expectedItems ? 'text-red-600' : 'text-green-600'}`}>
                        {debugInfo.finalItems}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-sm font-medium text-gray-600">Lojas Sem Centro</p>
                      <p className="text-2xl font-bold text-orange-600">{debugInfo.lojasWithoutCenter.length}</p>
                    </div>
                  </div>

                  {/* Alertas */}
                  {debugInfo.lojasWithoutCenter.length > 0 && (
                    <Alert className="mb-4 border-orange-200 bg-orange-50">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <AlertTitle className="text-orange-800">Lojas Sem Centro</AlertTitle>
                      <AlertDescription className="text-orange-700">
                        As seguintes lojas não possuem centro definido e foram ignoradas: 
                        <strong> {debugInfo.lojasWithoutCenter.join(', ')}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {debugInfo.finalItems < debugInfo.expectedItems && (
                    <Alert className="mb-4 border-red-200 bg-red-50">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertTitle className="text-red-800">Possível Perda de Dados</AlertTitle>
                      <AlertDescription className="text-red-700">
                        Foram processados <strong>{debugInfo.finalItems}</strong> itens, mas eram esperados <strong>{debugInfo.expectedItems}</strong>. 
                        Verifique os logs detalhados abaixo.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Logs Detalhados */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-3">Logs de Processamento</h4>
                    <div className="max-h-64 overflow-y-auto">
                      {debugInfo.processingSteps.map((step, index) => (
                        <div key={index} className="text-xs font-mono text-gray-600 mb-1">
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </CardHeader>
        </Card>
      )}

      {/* Results Table */}
      {faturamentoData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Dados de Faturamento</span>
              <Badge variant="secondary">
                {faturamentoData.length} itens
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loja</TableHead>
                    <TableHead>Centro</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturamentoData.slice(0, 10).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.loja}</TableCell>
                      <TableCell>{item.centro}</TableCell>
                      <TableCell>{item.material}</TableCell>
                      <TableCell>{item.quantidade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {faturamentoData.length > 10 && (
                <div className="mt-4 text-center text-sm text-gray-600">
                  Mostrando primeiros 10 itens de {faturamentoData.length} total
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      {showMissingMediaModal && (
        <MissingMediaModal
          isOpen={showMissingMediaModal}
          onClose={() => setShowMissingMediaModal(false)}
          missingItems={missingMediaItems}
          onNavigateToMedia={handleNavigateToMedia}
        />
      )}

      {showErrorModal && mediaStatus && (
        <MediaErrorModal
          isOpen={showErrorModal}
          onClose={() => setShowErrorModal(false)}
          mediaStatus={mediaStatus}
          onProceedAnyway={handleProceedAnyway}
          onNavigateToMedia={handleNavigateToMedia}
        />
      )}
    </div>
  )
}