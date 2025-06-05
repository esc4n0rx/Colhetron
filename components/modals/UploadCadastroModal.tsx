// components/modals/UploadCadastroModal.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"

interface UploadCadastroModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'lojas' | 'materiais'
  onUpload: (file: File) => Promise<{ success: boolean; error?: string }>
}

export default function UploadCadastroModal({ isOpen, onClose, type, onUpload }: UploadCadastroModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile)
        setError('')
      } else {
        setError('Apenas arquivos .xlsx são aceitos')
        setFile(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!file) {
      setError('Selecione um arquivo')
      return
    }

    setIsLoading(true)
    try {
      const result = await onUpload(file)
      
      if (result.success) {
        setSuccess(`${type === 'lojas' ? 'Lojas' : 'Materiais'} importados com sucesso!`)
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        setError(result.error || 'Erro no upload')
      }
    } catch (error) {
      setError('Erro inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setError('')
    setSuccess('')
    setIsLoading(false)
    onClose()
  }

  const getColumns = () => {
    if (type === 'lojas') {
      return [
        'PREFIXO', 'NOME', 'Tipo', 'UF', 'ZONA SECO', 'SUBZONA SECO', 
        'ZONA FRIO', 'ORDEM SECO', 'ORDEM FRIO'
      ]
    } else {
      return ['MATERIAL', 'DESCRIÇÃO', 'NOTURNO', 'DIURNO']
    }
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
                  <Upload className="w-5 h-5 mr-2" />
                  Upload {type === 'lojas' ? 'Lojas' : 'Materiais'}
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
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-750 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {file ? (
                          <>
                            <FileSpreadsheet className="w-8 h-8 mb-2 text-green-400" />
                            <p className="text-sm text-green-400 font-semibold">{file.name}</p>
                            <p className="text-xs text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-400">
                              <span className="font-semibold">Clique para upload</span> ou arraste o arquivo
                            </p>
                            <p className="text-xs text-gray-500">Apenas arquivos .xlsx</p>
                          </>
                        )}
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".xlsx" 
                        onChange={handleFileChange}
                        disabled={isLoading}
                      />
                    </label>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h4 className="text-white font-semibold text-sm mb-2">Formato esperado:</h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>• Arquivo Excel (.xlsx)</p>
                      <p>• Primeira linha: cabeçalhos</p>
                      <p>• Colunas esperadas:</p>
                      <div className="ml-2 flex flex-wrap gap-1 mt-1">
                        {getColumns().map((col, index) => (
                          <span key={index} className="bg-gray-700 px-2 py-1 rounded text-xs">
                            {col}
                          </span>
                        ))}
                      </div>
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

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center space-x-2 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg p-3"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{success}</span>
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
                      disabled={!file || isLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {isLoading ? 'Enviando...' : 'Fazer Upload'}
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