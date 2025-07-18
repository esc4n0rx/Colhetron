// components/tabs/FaturamentoTab.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertTriangle, Download, CheckCircle, RefreshCw, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import MissingMediaModal from '@/components/modals/MissingMediaModal'
import MediaErrorModal from '@/components/modals/MediaErrorModal'

interface MediaAnalysisStatus {
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
  
  // Reset completo do estado
  const resetState = () => {
    setProcessingStep('idle')
    setMediaStatus(null)
    setMissingMediaItems([])
    setFaturamentoData([])
    setShowErrorModal(false)
    setShowMissingMediaModal(false)
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
          // Converter os materiais sem análise para o formato esperado pelo modal
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
        throw new Error(error.error || 'Erro ao gerar tabela de faturamento')
      }

      const data = await response.json()
      setFaturamentoData(data.items)
      setProcessingStep('ready_for_excel')
      
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
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const error = await response.json()
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
        return 'Clique para iniciar o processo'
    }
  }

  const getProcessingProgress = () => {
    switch (processingStep) {
      case 'analyzing':
        return 25
      case 'validating':
        return 50
      case 'generating_table':
        return 75
      case 'ready_for_excel':
        return 100
      default:
        return 0
    }
  }

  return (
    <div className="space-y-6">
      {/* Card Principal */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white apple-font flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Faturamento - Geração de Template Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Indicador de Progresso */}
          {processingStep !== 'idle' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{getProcessingStepText()}</span>
                <span className="text-gray-400">{getProcessingProgress()}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProcessingProgress()}%` }}
                />
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={startFaturamentoProcess}
              disabled={processingStep !== 'idle' && processingStep !== 'ready_for_excel'}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {processingStep === 'idle' ? (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Iniciar Processo de Faturamento
                </>
              ) : processingStep === 'ready_for_excel' ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reprocessar
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              )}
            </Button>

            {processingStep === 'ready_for_excel' && (
              <Button
                onClick={generateExcelTemplate}
                disabled={isGeneratingExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isGeneratingExcel ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando Excel...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Template Excel
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Alerta de Status */}
          {processingStep === 'ready_for_excel' && (
            <Alert className="bg-green-950/30 border-green-800">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertTitle className="text-green-400">Processo Concluído!</AlertTitle>
              <AlertDescription className="text-gray-300">
                Tabela de faturamento gerada com sucesso. Clique em "Baixar Template Excel" para fazer o download.
              </AlertDescription>
            </Alert>
          )}

          {/* Informações do Processo */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h4 className="text-white font-medium mb-2">Como Funciona o Processo:</h4>
            <ol className="text-gray-300 space-y-1 text-sm">
              <li>1. <strong>Análise de Médias:</strong> Verifica se todos os materiais da separação possuem médias cadastradas</li>
              <li>2. <strong>Validação:</strong> Confirma que os dados estão corretos e completos</li>
              <li>3. <strong>Geração da Tabela:</strong> Processa os dados da separação ativa</li>
              <li>4. <strong>Download Excel:</strong> Gera o template Excel para faturamento</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Dados (quando pronta) */}
      {processingStep === 'ready_for_excel' && faturamentoData.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              Tabela de Faturamento Gerada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-center text-gray-300 font-bold border-r border-gray-700">
                      Loja
                    </TableHead>
                    <TableHead className="text-center text-gray-300 font-bold border-r border-gray-700">
                      Centro
                    </TableHead>
                    <TableHead className="text-center text-gray-300 font-bold border-r border-gray-700">
                      Material
                    </TableHead>
                    <TableHead className="text-center text-gray-300 font-bold">
                      Quantidade
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturamentoData.slice(0, 10).map((item, index) => (
                    <TableRow key={index} className="border-gray-700">
                      <TableCell className="text-center text-blue-400 font-mono border-r border-gray-700">
                        {item.loja}
                      </TableCell>
                      <TableCell className="text-center text-green-400 font-mono border-r border-gray-700">
                        {item.centro}
                      </TableCell>
                      <TableCell className="text-center text-yellow-400 font-mono border-r border-gray-700">
                        {item.material}
                      </TableCell>
                      <TableCell className="text-center text-gray-300">
                        {item.quantidade}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modais */}
      <MediaErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        errorItems={mediaStatus?.errorItems || []}
        totalItems={mediaStatus?.totalItems || 0}
        onNavigateToMedia={handleNavigateToMedia}
        onProceedAnyway={handleProceedAnyway}
      />

      <MissingMediaModal
        isOpen={showMissingMediaModal}
        onClose={() => setShowMissingMediaModal(false)}
        missingItems={missingMediaItems}
        onNavigateToMedia={handleNavigateToMedia}
      />
    </div>
  )
}