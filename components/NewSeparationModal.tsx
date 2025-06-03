"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSeparation } from "@/contexts/SeparationContext"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, FileSpreadsheet } from "lucide-react"

interface NewSeparationModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NewSeparationModal({ isOpen, onClose }: NewSeparationModalProps) {
  const [type, setType] = useState<"SP" | "ES" | "RJ" | "">("")
  const [date, setDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const { createSeparation } = useSeparation()
  const { user } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (type && date && user) {
      createSeparation({
        type: type as "SP" | "ES" | "RJ",
        date,
        user: user.name,
        status: "active",
      })
      onClose()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.name.endsWith(".xlsx")) {
      setFile(selectedFile)
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
                <CardTitle className="text-xl font-bold apple-font text-white">Nova Separação</CardTitle>
                <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="type" className="text-gray-300">
                        Tipo de Separação
                      </Label>
                      <Select value={type} onValueChange={(value) => setType(value as "SP" | "ES" | "RJ")}>
                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
                      <Label htmlFor="user" className="text-gray-300">
                        Usuário
                      </Label>
                      <Input
                        id="user"
                        value={user?.name || ""}
                        disabled
                        className="bg-gray-800 border-gray-700 text-gray-400"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-300">Upload do Arquivo (.xlsx)</Label>
                      <div className="mt-2">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-750 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {file ? (
                              <>
                                <FileSpreadsheet className="w-8 h-8 mb-2 text-green-400" />
                                <p className="text-sm text-green-400 font-semibold">{file.name}</p>
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
                          <input type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} />
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={!type || !date || !file}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 transition-all duration-200"
                  >
                    Criar Separação
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
