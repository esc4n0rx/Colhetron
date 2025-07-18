// components/modals/RedistribuicaoUploadModal.tsx
"use client"

import { useState, useEffect } from 'react'
import { RefreshCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface RedistribuicaoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<any>;
  isUploading: boolean;
}

export default function RedistribuicaoUploadModal({ isOpen, onClose, onUpload, isUploading }: RedistribuicaoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      setSelectedFile(null);
    }
  };
  
  useEffect(() => {
    if (!isOpen) {
        setSelectedFile(null);
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <RefreshCcw className="w-5 h-5 mr-2 text-green-400" />
            Carregar Arquivo de Redistribuição
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Selecione um arquivo Excel (.xlsx) com os dados de redistribuição. 
            As quantidades serão substituídas pelos novos valores.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="bg-gray-800 border-gray-700 text-white"
            disabled={isUploading}
          />
          
          {selectedFile && (
            <div className="p-3 bg-gray-800 rounded border border-gray-700">
              <p className="text-sm text-gray-300">
                Arquivo selecionado: <span className="text-green-400">{selectedFile.name}</span>
              </p>
            </div>
          )}
          
          <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded">
            <p className="text-sm text-yellow-200">
              <strong>Atenção:</strong> A redistribuição substitui as quantidades existentes pelos novos valores da planilha.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isUploading ? (
              <>
                <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar Redistribuição'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}