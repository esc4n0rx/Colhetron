// components/modals/MelanciaUploadModal.tsx
"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface MelanciaUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (file: File, materialCode: string) => Promise<any>
  isUploading: boolean
}

// Tipos de melancia disponíveis
const MELANCIA_TYPES = [
  { code: '100195', label: 'MELANCIA KG', description: 'Melancia tradicional por kg' },
  { code: '142223', label: 'MELANCIA PINGO DOCE kg', description: 'Melancia Pingo Doce por kg' },
  { code: '154875', label: 'MELANCIA SOET KG', description: 'Melancia Soet por kg' }
]

export default function MelanciaUploadModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  isUploading 
}: MelanciaUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedMaterialCode, setSelectedMaterialCode] = useState<string>('')

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedMaterialCode) return

    try {
      await onUpload(selectedFile, selectedMaterialCode)
      setSelectedFile(null)
      setSelectedMaterialCode('')
      onClose()
    } catch (error) {
      console.error('Erro no upload:', error)
    }
  }

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null)
      setSelectedMaterialCode('')
      onClose()
    }
  }

  const selectedType = MELANCIA_TYPES.find(type => type.code === selectedMaterialCode)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white apple-font flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            Carregar Separação de Melancia
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Selecione o tipo de melancia e faça upload da planilha com os dados.
            <br />
            <strong>Formato esperado:</strong> Loja | Quantidade | KG
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seletor de Tipo de Melancia */}
          <div className="space-y-2">
            <Label htmlFor="melancia-type" className="text-white">
              Tipo de Melancia <span className="text-red-400">*</span>
            </Label>
            <Select 
              value={selectedMaterialCode} 
              onValueChange={setSelectedMaterialCode}
              disabled={isUploading}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue placeholder="Selecione o tipo de melancia..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {MELANCIA_TYPES.map(type => (
                  <SelectItem 
                    key={type.code} 
                    value={type.code}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-gray-400">Código: {type.code}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedType && (
              <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-green-300 text-sm">
                  <strong>Selecionado:</strong> {selectedType.description}
                </p>
              </div>
            )}
          </div>

          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300 text-sm">
              <strong>Instruções:</strong>
              <br />
              • Coluna A: Código da loja
              <br />
              • Coluna B: Quantidade (não utilizada)
              <br />
              • Coluna C: Peso em KG (será usado para atualizar as quantidades)
              <br />
              • Primeira linha deve conter os cabeçalhos
              <br />
              • Aceita números com vírgula (ex: 53,9 kg)
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="file-upload" className="text-white">
              Selecionar arquivo Excel (.xlsx) <span className="text-red-400">*</span>
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="bg-gray-800 border-gray-600 text-white file:bg-green-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1"
            />
          </div>

          {selectedFile && (
            <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm">{selectedFile.name}</span>
                <span className="text-gray-400 text-xs">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedMaterialCode || isUploading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Carregar Melancia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}