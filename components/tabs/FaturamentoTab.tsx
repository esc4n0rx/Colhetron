import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertTriangle, Download, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

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

export function FaturamentoTab() {
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [mediaStatus, setMediaStatus] = useState<MediaAnalysisStatus | null>(null)
  const [faturamentoData, setFaturamentoData] = useState<FaturamentoItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const { user } = useAuth()

  const itemsPerPage = 10

  const checkMediaAnalysisStatus = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/faturamento/check-media-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao verificar status das médias')
      }

      const data = await response.json()
      setMediaStatus(data)

      if (data.itemsWithError > 0 && data.itemsWithError <= 10) {
        setShowErrorModal(true)
      } else if (data.itemsWithError > 10) {
        setShowErrorModal(true)
      } else {
        await generateFaturamentoTable()
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const generateFaturamentoTable = async () => {
    try {
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
      toast.success('Tabela de faturamento gerada com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar tabela:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar tabela')
    }
  }


  const generateExcelTemplate = async () => {
    setIsGeneratingTemplate(true)
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/faturamento/generate-excel', {
        method: 'POST',
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
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Template Excel gerado e baixado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar Excel:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar template')
    } finally {
      setIsGeneratingTemplate(false)
    }
  }

  const paginatedErrorItems = mediaStatus?.errorItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) || []

  const totalPages = Math.ceil((mediaStatus?.errorItems.length || 0) / itemsPerPage)

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white apple-font flex items-center">
            <Download className="w-5 h-5 mr-2" />
            Faturamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={checkMediaAnalysisStatus}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                'Analisar e Gerar Tabela'
              )}
            </Button>

            {faturamentoData.length > 0 && (
              <Button
                onClick={generateExcelTemplate}
                disabled={isGeneratingTemplate}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isGeneratingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando Template...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Gerar Template Excel
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {faturamentoData.length > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font">
              Dados para Faturamento ({faturamentoData.length} itens)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 bg-gray-800/50">
                    <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700">
                      COD_LOJA_SAP
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700">
                      COD_PRODUTO
                    </TableHead>
                    <TableHead className="text-gray-300 font-bold text-center">
                      Quant. Volumes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faturamentoData.map((item, index) => (
                    <TableRow key={index} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-gray-300 text-center border-r border-gray-700">
                        {item.centro}
                      </TableCell>
                      <TableCell className="text-gray-300 text-center border-r border-gray-700">
                        {item.material}
                      </TableCell>
                      <TableCell className="text-gray-300 text-center">
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

      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-400">
              <XCircle className="w-5 h-5 mr-2" />
              Itens com Status Incorreto ({mediaStatus?.itemsWithError} de {mediaStatus?.totalItems})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-gray-300">
              Os seguintes itens não estão com status "OK" na análise de médias. 
              Por favor, ajuste-os antes de continuar:
            </p>

            <ScrollArea className="h-96 border border-gray-700 rounded">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Código</TableHead>
                    <TableHead className="text-gray-300">Material</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedErrorItems.map((item) => (
                    <TableRow key={item.id} className="border-gray-700">
                      <TableCell className="text-gray-300">{item.codigo}</TableCell>
                      <TableCell className="text-gray-300">{item.material}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'CRÍTICO' ? 'destructive' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">{item.error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-gray-600 text-gray-300"
                >
                  Anterior
                </Button>
                <span className="px-3 py-1 text-gray-300">
                  {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="border-gray-600 text-gray-300"
                >
                  Próximo
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowErrorModal(false)}
                className="border-gray-600 text-gray-300"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setShowErrorModal(false)
                  toast.info('Acesse a aba "Análise de Médias" para corrigir os itens')
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Ir para Análise de Médias
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}