// components/tabs/FaturamentoTab.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, AlertTriangle, Download, CheckCircle, Calculator, TrendingUp, FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import MissingMediaAlertModal from '@/components/modals/MissingMediaAlertModal'

interface VolumeIndicator {
  totalVolume: number
  totalItems: number
  isCalculating: boolean
}

interface FaturamentoTableItem {
  material: string
  loja: string
  centro: string
  quantidade: number
}

type ProcessingStep = 'idle' | 'calculating_volume' | 'generating_table' | 'ready_for_excel'

export default function FaturamentoTab() {
  // Estados principais
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle')
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
  
  // Estados para dados
  const [volumeIndicator, setVolumeIndicator] = useState<VolumeIndicator>({
    totalVolume: 0,
    totalItems: 0,
    isCalculating: false
  })
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoTableItem[]>([])
  const [calculatedVolume, setCalculatedVolume] = useState<number>(0)
  
  // Estados para modais
  const [showMissingMediaModal, setShowMissingMediaModal] = useState(false)
  const [missingMediaItems, setMissingMediaItems] = useState<string[]>([])

  // Calcular indicador de volume automaticamente ao carregar
  useEffect(() => {
    calculateVolumeIndicator()
  }, [])

  const calculateVolumeIndicator = async () => {
    try {
      setVolumeIndicator(prev => ({ ...prev, isCalculating: true }))
      
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/faturamento/volume-indicator', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Erro ao calcular volume')
      }

      const data = await response.json()
      setVolumeIndicator({
        totalVolume: data.totalVolume,
        totalItems: data.totalItems,
        isCalculating: false
      })
      
    } catch (error) {
      console.error('Erro ao calcular volume:', error)
      toast.error('Erro ao calcular indicador de volume')
      setVolumeIndicator(prev => ({ ...prev, isCalculating: false }))
    }
  }

  const startFaturamentoProcess = async () => {
    setProcessingStep('calculating_volume')
    
    // Recalcular volume
    await calculateVolumeIndicator()
    
    // Gerar tabela
    await generateFaturamentoTable()
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
      
      // Calcular volume da tabela gerada
      const tableVolume = data.items.reduce((sum: number, item: FaturamentoTableItem) => sum + item.quantidade, 0)
      setCalculatedVolume(tableVolume)
      
      setProcessingStep('ready_for_excel')
      
      // Verificar se os volumes batem
      if (Math.abs(tableVolume - volumeIndicator.totalVolume) > 0.01) {
        toast.warning(`Divergência detectada! Indicador: ${volumeIndicator.totalVolume}, Tabela: ${tableVolume}`)
      } else {
        toast.success('Volumes conferem! Tabela gerada com sucesso.')
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
        
        // Verificar se é erro de média não encontrada
        if (error.missingMedia && error.missingMedia.length > 0) {
          setMissingMediaItems(error.missingMedia)
          setShowMissingMediaModal(true)
          return
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
      
      toast.success('Excel de faturamento gerado com sucesso!')
      
    } catch (error) {
      console.error('Erro ao gerar Excel:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar template Excel')
    } finally {
      setIsGeneratingExcel(false)
    }
  }

  const resetState = () => {
    setProcessingStep('idle')
    setFaturamentoData([])
    setCalculatedVolume(0)
    calculateVolumeIndicator()
  }

  const getProcessingStepText = () => {
    switch (processingStep) {
      case 'calculating_volume':
        return 'Calculando volume total...'
      case 'generating_table':
        return 'Gerando tabela de faturamento...'
      case 'ready_for_excel':
        return 'Pronto para gerar Excel!'
      default:
        return 'Aguardando início do processamento...'
    }
  }

  const getProcessingStepIcon = () => {
    switch (processingStep) {
      case 'calculating_volume':
        return <Calculator className="w-5 h-5 animate-pulse text-blue-500" />
      case 'generating_table':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'ready_for_excel':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return <TrendingUp className="w-5 h-5 text-gray-500" />
    }
  }

  const volumesMatch = Math.abs(calculatedVolume - volumeIndicator.totalVolume) <= 0.01

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Faturamento</h2>
          <p className="text-gray-600">Gere relatórios de faturamento baseados nas médias do sistema</p>
        </div>
      </div>

      {/* Indicador de Volume */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <TrendingUp className="w-5 h-5" />
            Indicador de Volume Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {volumeIndicator.isCalculating ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  volumeIndicator.totalVolume.toLocaleString()
                )}
              </div>
              <p className="text-sm text-blue-600 font-medium">Volume Total</p>
              <p className="text-xs text-gray-500">Soma das quantidades de separação</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {volumeIndicator.totalItems.toLocaleString()}
              </div>
              <p className="text-sm text-gray-600 font-medium">Itens Únicos</p>
              <p className="text-xs text-gray-500">Diferentes materiais</p>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${calculatedVolume > 0 ? (volumesMatch ? 'text-green-600' : 'text-red-600') : 'text-gray-400'}`}>
                {calculatedVolume > 0 ? calculatedVolume.toLocaleString() : '--'}
              </div>
              <p className="text-sm text-gray-600 font-medium">Volume da Tabela</p>
              <p className="text-xs text-gray-500">Após processamento</p>
            </div>
          </div>
          
          {calculatedVolume > 0 && (
            <div className="mt-4 text-center">
              {volumesMatch ? (
                <Badge className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Volumes conferem!
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-red-300">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Divergência detectada
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controles de Processamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getProcessingStepIcon()}
            Processamento de Faturamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {getProcessingStepText()}
          </div>
          
          {processingStep === 'idle' ? (
            <Button 
              onClick={startFaturamentoProcess}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Gerar Tabela
            </Button>
          ) : processingStep === 'ready_for_excel' ? (
            <div className="flex gap-2">
              <Button 
                onClick={generateExcelTemplate}
                disabled={isGeneratingExcel}
                className="flex-1 bg-green-600 hover:bg-green-700"
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
                Novo Processamento
              </Button>
            </div>
          ) : (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: processingStep === 'calculating_volume' ? '50%' : 
                         processingStep === 'generating_table' ? '100%' : '0%'
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Dados Gerados */}
      {faturamentoData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Tabela de Faturamento Gerada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="font-semibold">Material</TableHead>
                    <TableHead className="font-semibold">Loja</TableHead>
                    <TableHead className="font-semibold">Centro</TableHead>
                    <TableHead className="font-semibold text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturamentoData.slice(0, 100).map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-medium">{item.material}</TableCell>
                      <TableCell>{item.loja}</TableCell>
                      <TableCell>{item.centro}</TableCell>
                      <TableCell className="text-right font-semibold">{item.quantidade.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {faturamentoData.length > 100 && (
              <div className="mt-4 text-sm text-gray-500 text-center">
                Mostrando primeiras 100 linhas de {faturamentoData.length.toLocaleString()} totais
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Alerta de Médias */}
      <MissingMediaAlertModal
        isOpen={showMissingMediaModal}
        onClose={() => setShowMissingMediaModal(false)}
        missingItems={missingMediaItems}
      />
    </div>
  )
}