// components/modals/MissingMediaAlertModal.tsx
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface MissingMediaAlertModalProps {
  isOpen: boolean
  onClose: () => void
  missingItems: string[]
}

export default function MissingMediaAlertModal({ 
  isOpen, 
  onClose, 
  missingItems 
}: MissingMediaAlertModalProps) {
  const copyMissingCodes = () => {
    const codes = missingItems.join(', ')
    navigator.clipboard.writeText(codes)
    toast.success('Códigos copiados para a área de transferência')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-400">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Médias Não Encontradas
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Resumo do Problema */}
          <div className="bg-red-950/30 border border-red-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              ⚠️ Não é possível gerar o Excel
            </h3>
            <p className="text-gray-300">
              Os materiais abaixo não possuem média cadastrada na tabela <code className="bg-gray-800 px-1 rounded">colhetron_media_analysis</code>. 
              Sem a média, não conseguimos calcular as quantidades convertidas para o faturamento.
            </p>
            <div className="mt-3">
              <Badge variant="destructive" className="bg-red-600">
                {missingItems.length} {missingItems.length === 1 ? 'material' : 'materiais'} sem média
              </Badge>
            </div>
          </div>

          {/* Lista de Materiais */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-medium">Materiais sem Média:</h4>
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
            
            <ScrollArea className="h-[200px] w-full border border-gray-700 rounded-lg">
              <div className="p-3 space-y-2">
                {missingItems.map((materialCode, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                    <code className="font-mono text-yellow-400 font-bold">
                      {materialCode}
                    </code>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Instruções */}
          <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-4">
            <h4 className="text-blue-400 font-medium mb-2">Como Resolver:</h4>
            <ol className="text-gray-300 space-y-1 text-sm">
              <li>1. Cadastre as médias dos materiais listados na tabela <code>colhetron_media_analysis</code></li>
              <li>2. Certifique-se de que o campo <code>media_real</code> está preenchido</li>
              <li>3. Verifique se o <code>codigo</code> do material está exato</li>
              <li>4. Retente a geração do Excel</li>
            </ol>
          </div>

          {/* Botão de Fechar */}
          <div className="flex justify-end pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Entendi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}