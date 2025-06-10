// components/NewSeparationModal.tsx (ATUALIZADO E SIMPLIFICADO)
"use client"

import React from "react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSeparations } from "@/hooks/useSeparations"
import { useSeparation } from "@/contexts/SeparationContext"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, X, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from "lucide-react"

interface NewSeparationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewSeparationModal({ isOpen, onClose }: NewSeparationModalProps) {
  const [type, setType] = useState<"SP" | "ES" | "RJ" | "">("")
  const [date, setDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const { createSeparation, uploadProgress } = useSeparations()
  const { user } = useAuth()

  React.useEffect(() => {
    const today = new Date()
    const spDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    setDate(spDate.toISOString().split('T')[0])
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!type || !date || !file || !user) {
      setError("Todos os campos são obrigatórios")
      return
    }

    const result = await createSeparation({
      type: type as "SP" | "ES" | "RJ",
      date,
      file
    })

    if (!result.success) {
      setError(result.error || "Erro ao criar separação")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.name.endsWith(".xlsx")) {
        setFile(selectedFile)
        setError("")
      } else {
        setError("Apenas arquivos .xlsx são aceitos")
        setFile(null)
      }
    }
  }

  const resetForm = () => {
    setType("")
    setFile(null)
    setError("")
    const today = new Date()
    const spDate = new Date(today.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    setDate(spDate.toISOString().split('T')[0])
  }

  const handleClose = () => {
    if (!uploadProgress) {
      resetForm()
      onClose()
    }
  }

  React.useEffect(() => {
    if (uploadProgress?.stage === 'completed') {
      setTimeout(() => {
        resetForm()
        onClose()
      }, 1500)
    }
  }, [uploadProgress, onClose])

  const getProgressColor = () => {
    if (!uploadProgress) return "bg-blue-600"
    
    switch (uploadProgress.stage) {
      case 'uploading': return "bg-blue-600"
      case 'processing': return "bg-yellow-600"
      case 'saving': return "bg-purple-600"
      case 'completed': return "bg-green-600"
      default: return "bg-blue-600"
    }
  }

  const getStageIcon = () => {
    if (!uploadProgress) return null
    
    switch (uploadProgress.stage) {
      case 'uploading': return <Upload className="w-5 h-5" />
      case 'processing': return <Loader2 className="w-5 h-5 animate-spin" />
      case 'saving': return <Loader2 className="w-5 h-5 animate-spin" />
      case 'completed': return <CheckCircle className="w-5 h-5" />
      default: return null
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
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()} // Impede que o clique no card feche o modal
          >
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold apple-font text-white">
                  Nova Separação
                </CardTitle>
                {!uploadProgress && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleClose} 
                    className="text-gray-400 hover:text-white h-8 w-8"
                    aria-label="Fechar modal"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {uploadProgress ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                     <div className="text-center">
                      <motion.div
                        animate={{ 
                          scale: uploadProgress.stage === 'completed' ? [1, 1.1, 1] : 1,
                         color: uploadProgress.stage === 'completed' ? '#10B981' : '#3B82F6'
                       }}
                       transition={{ duration: 0.5 }}
                       className="flex items-center justify-center mb-4 text-blue-500"
                     >
                       {getStageIcon()}
                     </motion.div>
                     <h3 className="text-lg font-semibold text-white mb-2">
                       {uploadProgress.message}
                     </h3>
                   </div>

                   <div className="space-y-2">
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-400">Progresso</span>
                       <span className="text-white">{uploadProgress.progress}%</span>
                     </div>
                     <Progress 
                       value={uploadProgress.progress}
                       className={`h-2 ${getProgressColor()}`}
                     />
                   </div>

                   <div className="text-xs text-gray-400 text-center">
                     {uploadProgress.stage === 'uploading' && "Enviando arquivo para o servidor..."}
                     {uploadProgress.stage === 'processing' && "Lendo dados da planilha Excel..."}
                     {uploadProgress.stage === 'saving' && "Organizando dados no sistema..."}
                     {uploadProgress.stage === 'completed' && "Separação criada! O modal fechará em breve..."}
                   </div>
                 </motion.div>
               ) : (
                 <form onSubmit={handleSubmit} className="space-y-6">
                   <div className="space-y-4">
                     <div>
                       <Label htmlFor="type" className="text-gray-300">
                         Tipo de Separação
                       </Label>
                       <Select required value={type} onValueChange={(value) => setType(value as "SP" | "ES" | "RJ")}>
                         <SelectTrigger id="type" className="bg-gray-800 border-gray-700 text-white">
                           <SelectValue placeholder="Selecione o tipo" />
                         </SelectTrigger>
                         <SelectContent className="bg-gray-800 border-gray-700">
                           <SelectItem value="SP">São Paulo (SP)</SelectItem>
                           <SelectItem value="ES">Espírito Santo (ES)</SelectItem>
                           <SelectItem value="RJ">Rio de Janeiro (RJ)</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     <div>
                       <Label htmlFor="date" className="text-gray-300">
                         Data
                       </Label>
                       <Input
                         id="date"
                         type="date"
                         value={date}
                         onChange={(e) => setDate(e.target.value)}
                         className="bg-gray-800 border-gray-700 text-white"
                         required
                       />
                     </div>
                     
                     <div>
                       <Label htmlFor="file-upload" className="text-gray-300">Upload da Planilha (.xlsx)</Label>
                       <div className="mt-2">
                         <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-750 transition-colors">
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
                                   <span className="font-semibold">Clique para upload</span> ou arraste
                                 </p>
                                 <p className="text-xs text-gray-500">Apenas arquivos .xlsx</p>
                               </>
                             )}
                           </div>
                           <input 
                             id="file-upload"
                             type="file" 
                             className="hidden" 
                             accept=".xlsx" 
                             onChange={handleFileChange} 
                           />
                         </label>
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

                   <Button
                     type="submit"
                     disabled={!type || !date || !file}
                     className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-200 disabled:opacity-50"
                   >
                     Criar Separação
                   </Button>
                 </form>
               )}
              </CardContent>
            </Card>
          </motion.div>
       </motion.div>
     )}
   </AnimatePresence>
 )
}