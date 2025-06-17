// components/modals/CustomMediaModal.tsx
"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  AlertTriangle, 
  Info,
  Loader2,
  CheckCircle 
} from 'lucide-react'

interface CustomMediaModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (newMedia: number) => Promise<void>
  item: {
    id: string
    codigo: string
    material: string
    mediaSistema: number
    quantidadeKg: number
    quantidadeCaixas: number
    isCustomMedia?: boolean
  } | null
}

export default function CustomMediaModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  item 
}: CustomMediaModalProps) {
  const [customMedia, setCustomMedia] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Reset quando o modal abre/fecha ou item muda
  useEffect(() => {
    if (isOpen && item) {
      setCustomMedia(item.mediaSistema.toFixed(2))
      setError('')
    } else {
      setCustomMedia('')
      setError('')
    }
  }, [isOpen, item])

  const calculatedMedia = item ? 
    (item.quantidadeCaixas > 0 ? item.quantidadeKg / item.quantidadeCaixas : 0) : 0

  const handleInputChange = (value: string) => {
    setCustomMedia(value)
    setError('')
    
    // Validação em tempo real
    if (value && isNaN(Number(value))) {
      setError('Digite apenas números')
    } else if (value && Number(value) <= 0) {
      setError('A média deve ser maior que zero')
    } else if (value && Number(value) > 999) {
      setError('Valor muito alto para média')
    }
  }

  const handleConfirm = async () => {
    if (!item) return

    const newMediaValue = Number(customMedia)
    
    // Validações finais
    if (!customMedia.trim()) {
      setError('Digite uma média')
      return
    }

    if (isNaN(newMediaValue) || newMediaValue <= 0) {
      setError('Digite uma média válida maior que zero')
      return
    }

    if (newMediaValue > 999) {
      setError('Média muito alta. Verifique o valor.')
      return
    }

    try {
      setIsLoading(true)
      await onConfirm(newMediaValue)
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar média:', error)
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  // Detectar se a média foi alterada
  const isMediaChanged = item && Number(customMedia) !== item.mediaSistema
  const isValidMedia = customMedia && !isNaN(Number(customMedia)) && Number(customMedia) > 0

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-blue-400" />
            <span>Editar Média Sistema</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Defina uma média personalizada para este material
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Item */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Código:</span>
              <span className="text-white font-mono">{item.codigo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Material:</span>
              <span className="text-white text-sm truncate max-w-48" title={item.material}>
                {item.material}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Qtd KG:</span>
              <span className="text-white">{item.quantidadeKg.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Qtd Caixas:</span>
              <span className="text-white">{item.quantidadeCaixas}</span>
            </div>
          </div>

          {/* Médias Comparativas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <span className="text-blue-300">Média Calculada:</span>
              <span className="text-blue-400 font-medium">
                {calculatedMedia.toFixed(2)}
              </span>
            </div>
            
            {item.isCustomMedia && (
              <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <span className="text-purple-300">Média Atual:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-purple-400 font-medium">
                    {item.mediaSistema.toFixed(2)}
                  </span>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Personalizada
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Input da Nova Média */}
          <div className="space-y-2">
            <Label htmlFor="custom-media" className="text-gray-300">
              Nova Média Sistema
            </Label>
            <Input
              id="custom-media"
              type="number"
              step="0.01"
              min="0.01"
              max="999"
              value={customMedia}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Ex: 12.50"
              className={`bg-gray-800 border-gray-700 text-white ${
                error ? 'border-red-500 focus:border-red-500' : ''
              }`}
              disabled={isLoading}
            />
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center space-x-2 text-red-400 text-sm"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>

          {/* Aviso sobre personalização */}
          {isMediaChanged && isValidMedia && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-start space-x-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
            >
              <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-yellow-300 text-sm">
                <p className="font-medium">Atenção:</p>
                <p>Esta média personalizada substituirá o cálculo automático e será mantida até ser alterada novamente.</p>
              </div>
            </motion.div>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
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
            disabled={isLoading || !!error || !isValidMedia}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Salvar Média
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}