// components/modals/MediaErrorModal.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertTriangle, ExternalLink, AlertCircle, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { MediaAnalysisStatus } from '../tabs/FaturamentoTab'

interface MediaErrorItem {
  id: string
  codigo: string
  material: string
  status: string
  error: string
}

interface MediaErrorModalProps {
  isOpen: boolean
  onClose: () => void
  onProceedAnyway: () => void
  onNavigateToMedia: () => void
  mediaStatus: MediaAnalysisStatus // <--- adicione esta linha
}

export default function MediaErrorModal({ 
  isOpen, 
  onClose, 
  onNavigateToMedia,
  onProceedAnyway,
  mediaStatus
}: MediaErrorModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const errorItems = mediaStatus.errorItems
  const totalItems = mediaStatus.totalItems

  const paginatedItems = errorItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  
  const totalPages = Math.ceil(errorItems.length / itemsPerPage)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CRÍTICO':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'ATENÇÃO':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CRÍTICO':
        return <Badge variant="destructive">CRÍTICO</Badge>
      case 'ATENÇÃO':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">ATENÇÃO</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-yellow-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Problemas na Análise de Médias
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Resumo dos Problemas */}
          <div className="bg-yellow-950/30 border border-yellow-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-yellow-400">
                ⚠️ Itens com Problemas Detectados
              </h3>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-yellow-600 text-yellow-400">
                  {errorItems.length} com problemas
                </Badge>
                <Badge variant="outline" className="border-green-600 text-green-400">
                  {totalItems - errorItems.length} OK
                </Badge>
              </div>
            </div>
            <p className="text-gray-300 mb-3">
              Alguns itens na análise de médias apresentam problemas que podem afetar a precisão 
              do faturamento. Você pode corrigir esses problemas ou prosseguir mesmo assim.
            </p>
            <div className="text-sm text-gray-400">
              <span>• Total de itens: {totalItems}</span>
              <span className="ml-4">• Itens com problemas: {errorItems.length}</span>
              <span className="ml-4">• Taxa de sucesso: {Math.round(((totalItems - errorItems.length) / totalItems) * 100)}%</span>
            </div>
          </div>

          {/* Lista de Itens com Problemas */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Itens com Problemas:</h4>
            
            <ScrollArea className="h-[350px] w-full border border-gray-700 rounded-lg">
              <Table>
                <TableHeader className="bg-gray-800 sticky top-0">
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300 font-bold">Status</TableHead>
                    <TableHead className="text-gray-300 font-bold">Código</TableHead>
                    <TableHead className="text-gray-300 font-bold">Material</TableHead>
                    <TableHead className="text-gray-300 font-bold">Problema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => (
                    <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(item.status)}
                          {getStatusBadge(item.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-yellow-400 font-mono">
                        {item.codigo}
                      </TableCell>
                      <TableCell className="text-gray-300 max-w-[200px] truncate">
                        {item.material}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm">
                        {item.error}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border-gray-600 text-gray-300"
                >
                  Anterior
                </Button>
                <span className="px-3 py-1 text-sm text-gray-300">
                  Página {currentPage} de {totalPages}
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
          </div>

          {/* Instruções */}
          <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">Opções Disponíveis:</h4>
            <div className="text-gray-300 space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">•</span>
                <span><strong>Corrigir Problemas:</strong> Acesse a aba "Análise de Médias" para revisar e corrigir os itens com problemas</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold">•</span>
                <span><strong>Prosseguir Mesmo Assim:</strong> Gere o faturamento com os dados atuais (pode haver imprecisões)</span>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Fechar
            </Button>
            <Button
              variant="outline"
              onClick={onProceedAnyway}
              className="border-yellow-600 text-yellow-400 hover:bg-yellow-900/20"
            >
              Prosseguir Mesmo Assim
            </Button>
            <Button
              onClick={onNavigateToMedia}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Corrigir Problemas
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}