// components/modals/NovoMaterialModal.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, AlertCircle, Plus } from "lucide-react"
import type { MaterialItem } from "@/hooks/useCadastroData"

interface NovoMaterialModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (material: Omit<MaterialItem, 'id'>) => Promise<{ success: boolean; error?: string }>
}

export default function NovoMaterialModal({ isOpen, onClose, onSave }: NovoMaterialModalProps) {
  const [formData, setFormData] = useState<Omit<MaterialItem, 'id'>>({
    material: '',
    descricao: '',
    noturno: 'SECO',
    diurno: 'SECO'
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.material || !formData.descricao) {
      setError('Material e descrição são obrigatórios')
      return
    }

    setIsLoading(true)
    try {
      const result = await onSave(formData)
      
      if (result.success) {
        handleClose()
      } else {
        setError(result.error || 'Erro ao salvar material')
      }
    } catch (error) {
      setError('Erro inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      material: '',
      descricao: '',
      noturno: 'SECO',
      diurno: 'SECO'
    })
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md"
          >
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold apple-font text-white flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Material
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClose} 
                  className="text-gray-400 hover:text-white"
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Material *</Label>
                    <Input
                      value={formData.material}
                      onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Ex: 100111"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Descrição *</Label>
                    <Input
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      className="bg-gray-800 border-gray-700 text-white"
                      placeholder="Ex: CENOURA KG"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Noturno</Label>
                      <Select
                        value={formData.noturno}
                        onValueChange={(value: 'SECO' | 'FRIO') => 
                          setFormData(prev => ({ ...prev, noturno: value }))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="SECO">SECO</SelectItem>
                          <SelectItem value="FRIO">FRIO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Diurno</Label>
                      <Select
                        value={formData.diurno}
                        onValueChange={(value: 'SECO' | 'FRIO') => 
                          setFormData(prev => ({ ...prev, diurno: value }))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="SECO">SECO</SelectItem>
                          <SelectItem value="FRIO">FRIO</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={isLoading}
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {isLoading ? 'Salvando...' : 'Salvar Material'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}