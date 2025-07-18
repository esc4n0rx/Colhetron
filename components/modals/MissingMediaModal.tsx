// components/modals/MissingMediaModal.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ExternalLink, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface MissingMediaItem {
  material: string
  description?: string
  quantidade: number
  lojas: string[]
}

interface MissingMediaModalProps {
  isOpen: boolean
  onClose: () => void
  missingItems: MissingMediaItem[]
  onNavigateToMedia: () => void
}

export default function MissingMediaModal({ 
  isOpen, 
  onClose, 
  missingItems, 
  onNavigateToMedia 
}: MissingMediaModalProps) {
  const totalMissingItems = missingItems.length
  const totalAffectedStores = new Set(missingItems.flatMap(item => item.lojas)).size

  const copyMissingCodes = () => {
    const codes = missingItems.map(item => item.material).join(', ')
    navigator.clipboard.writeText(codes)
    toast.success('Códigos copiados para a área de transferência')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Materiais sem Média do Sistema
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Resumo dos Problemas */}
          <div className="bg-red-950/30 border border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-red-400">
                ⚠️ Erro Crítico no Faturamento
              </h3>
              <Badge variant="destructive" className="bg-red-600">
                {totalMissingItems} {totalMissingItems === 1 ? 'material' : 'materiais'}
              </Badge>
            </div>
            <p className="text-gray-300 mb-3">
              Não é possível gerar o template Excel porque os seguintes materiais não possuem 
              média do sistema cadastrada. Sem a média, não conseguimos calcular as quantidades 
              corretas para o faturamento.
            </p>
            <div className="flex gap-2 text-sm text-gray-400">
              <span>• {totalMissingItems} materiais sem média</span>
              <span>• {totalAffectedStores} lojas afetadas</span>
            </div>
          </div>

          {/* Lista de Materiais sem Média */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Materiais Pendentes:</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyMissingCodes}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Códigos
              </Button>
            </div>
            
            <ScrollArea className="h-[300px] w-full border border-gray-700 rounded-lg">
              <div className="p-4 space-y-3">
                {missingItems.map((item, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-mono text-yellow-400 font-bold">
                          {item.material}
                        </div>
                        {item.description && (
                          <div className="text-sm text-gray-300 mt-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline" className="text-gray-400 border-gray-600">
                        {item.quantidade} {item.quantidade === 1 ? 'caixa' : 'caixas'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400">Lojas:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.lojas.map((loja, lojaIndex) => (
                          <Badge 
                            key={lojaIndex}
                            variant="secondary" 
                            className="text-xs bg-gray-700 text-gray-300"
                          >
                            {loja}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Instruções */}
          <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">Como Resolver:</h4>
            <ol className="text-gray-300 space-y-1 text-sm">
              <li>1. Acesse a aba "Análise de Médias"</li>
              <li>2. Faça o upload da planilha com os dados de média dos materiais listados</li>
              <li>3. Verifique se todos os materiais estão com status "OK"</li>
              <li>4. Retorne para a aba "Faturamento" e tente novamente</li>
            </ol>
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
              onClick={onNavigateToMedia}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ir para Análise de Médias
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}