// components/modals/ForceStatusModal.tsx
"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  CheckCircle, 
  Loader2 
} from 'lucide-react'

interface ForceStatusModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => Promise<void>
  item: {
    id: string
    codigo: string
    material: string
    status: string
  } | null
}

export default function ForceStatusModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  item 
}: ForceStatusModalProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    if (!item) return

    try {
      setIsLoading(true)
      await onConfirm(reason.trim() || undefined)
      
      // Reset e fechar modal
      setReason('')
      onClose()
    } catch (error) {
      console.error('Erro ao forçar status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setReason('')
      onClose()
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CRÍTICO':
        return 'bg-red-500/20 text-red-400 border-red-400/30'
      case 'ATENÇÃO':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-400/30'
    }
  }

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <span>Forçar Status para OK</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Esta ação irá alterar o status do item para "OK" independentemente da análise automática.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Item */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Código:</span>
              <span className="font-mono text-white">{item.codigo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Material:</span>
              <span className="text-white text-right text-sm max-w-48 truncate">
                {item.material}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status Atual:</span>
              <Badge className={getStatusColor(item.status)}>
                {item.status}
              </Badge>
            </div>
          </div>

          {/* Status Final */}
          <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">
                Novo Status: OK
              </span>
            </div>
            <p className="text-sm text-green-300/80 mt-1">
              O item será marcado como aprovado manualmente.
            </p>
          </div>

          {/* Campo de Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-gray-300">
              Motivo da alteração (opcional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Ex: Verificado fisicamente, diferença aceitável para este produto..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 min-h-[80px] resize-none"
              maxLength={500}
              disabled={isLoading}
            />
            <div className="text-xs text-gray-500 text-right">
              {reason.length}/500 caracteres
            </div>
          </div>

          {/* Botões */}
          <div className="flex space-x-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}