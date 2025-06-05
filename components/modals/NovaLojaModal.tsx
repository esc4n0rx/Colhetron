// components/modals/NovaLojaModal.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, AlertCircle, Plus } from "lucide-react"
import type { LojaItem } from "@/hooks/useCadastroData"

interface NovaLojaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (loja: Omit<LojaItem, 'id'>) => Promise<{ success: boolean; error?: string }>
}

const ufs = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]

export default function NovaLojaModal({ isOpen, onClose, onSave }: NovaLojaModalProps) {
  const [formData, setFormData] = useState<Omit<LojaItem, 'id'>>({
    prefixo: '',
    nome: '',
    tipo: 'CD',
    uf: '',
    zonaSeco: '',
    subzonaSeco: '',
    zonaFrio: '',
    ordemSeco: 0,
    ordemFrio: 0
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.prefixo || !formData.nome || !formData.uf) {
      setError('Prefixo, nome e UF são obrigatórios')
      return
    }

    setIsLoading(true)
    try {
      const result = await onSave(formData)
      
      if (result.success) {
        handleClose()
      } else {
        setError(result.error || 'Erro ao salvar loja')
      }
    } catch (error) {
      setError('Erro inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      prefixo: '',
      nome: '',
      tipo: 'CD',
      uf: '',
      zonaSeco: '',
      subzonaSeco: '',
      zonaFrio: '',
      ordemSeco: 0,
      ordemFrio: 0
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
            className="w-full max-w-2xl"
          >
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold apple-font text-white flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Nova Loja
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Prefixo *</Label>
                      <Input
                        value={formData.prefixo}
                        onChange={(e) => setFormData(prev => ({ ...prev, prefixo: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Ex: CDP30"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Nome *</Label>
                      <Input
                        value={formData.nome}
                        onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Ex: CENTRAL DE PRODUTOS"
                        required
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Tipo</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value: 'CD' | 'Loja Padrão' | 'Administrativo') => 
                          setFormData(prev => ({ ...prev, tipo: value }))
                        }
                        disabled={isLoading}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="CD">CD</SelectItem>
                          <SelectItem value="Loja Padrão">Loja Padrão</SelectItem>
                          <SelectItem value="Administrativo">Administrativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">UF *</Label>
                      <Select
                        value={formData.uf}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, uf: value }))}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {ufs.map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Zona Seco</Label>
                      <Input
                        value={formData.zonaSeco}
                        onChange={(e) => setFormData(prev => ({ ...prev, zonaSeco: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Ex: ZONA 1"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Subzona Seco</Label>
                      <Input
                        value={formData.subzonaSeco}
                        onChange={(e) => setFormData(prev => ({ ...prev, subzonaSeco: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Ex: SUBZONA 1.1"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Zona Frio</Label>
                      <Input
                        value={formData.zonaFrio}
                        onChange={(e) => setFormData(prev => ({ ...prev, zonaFrio: e.target.value }))}
                        className="bg-gray-800 border-gray-700 text-white"
                        placeholder="Ex: ZONA 1"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Ordem Seco</Label>
                      <Input
                        type="number"
                        value={formData.ordemSeco}
                        onChange={(e) => setFormData(prev => ({ ...prev, ordemSeco: parseInt(e.target.value) || 0 }))}
                        className="bg-gray-800 border-gray-700 text-white"
                        min="0"
                        disabled={isLoading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Ordem Frio</Label>
                      <Input
                        type="number"
                        value={formData.ordemFrio}
                        onChange={(e) => setFormData(prev => ({ ...prev, ordemFrio: parseInt(e.target.value) || 0 }))}
                        className="bg-gray-800 border-gray-700 text-white"
                        min="0"
                        disabled={isLoading}
                      />
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
                      {isLoading ? 'Salvando...' : 'Salvar Loja'}
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