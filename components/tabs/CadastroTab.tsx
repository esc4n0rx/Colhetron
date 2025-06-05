// components/tabs/CadastroTab.tsx
"use client"

import { useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Filter, Loader2, AlertCircle, Plus, Upload, Edit } from "lucide-react"
import { useCadastroData } from "@/hooks/useCadastroData"
import NovaLojaModal from "@/components/modals/NovaLojaModal"
import NovoMaterialModal from "@/components/modals/NovoMaterialModal"
import UploadCadastroModal from "@/components/modals/UploadCadastroModal"
import type { LojaItem, MaterialItem } from "@/hooks/useCadastroData"

interface EditableSelectProps {
  value: string
  options: string[]
  onSave: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

function EditableSelect({ value, options, onSave, disabled, placeholder }: EditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  const handleSave = (newValue: string) => {
    onSave(newValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempValue(value)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Select
        value={tempValue}
        onValueChange={handleSave}
        disabled={disabled}
      >
        <SelectTrigger className="w-24 h-6 text-xs bg-gray-800 border-blue-500 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {options.map(option => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-24 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-xs ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } text-white`}
    >
      {value || placeholder || "-"}
    </div>
  )
}

interface EditableInputProps {
  value: string | number
  onSave: (value: string | number) => void
  disabled?: boolean
  type?: 'text' | 'number'
  placeholder?: string
}

function EditableInput({ value, onSave, disabled, type = 'text', placeholder }: EditableInputProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value.toString())

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const finalValue = type === 'number' ? parseInt(tempValue) || 0 : tempValue
      onSave(finalValue)
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setTempValue(value.toString())
      setIsEditing(false)
    }
  }

  const handleBlur = () => {
    setTempValue(value.toString())
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Input
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="w-24 h-6 text-center text-xs bg-gray-800 border-blue-500 text-white"
        autoFocus
        disabled={disabled}
        type={type}
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      className={`w-24 h-6 flex items-center justify-center cursor-pointer hover:bg-gray-700 rounded text-xs ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } text-white`}
    >
      {value || placeholder || (type === 'number' ? '0' : '-')}
    </div>
  )
}

export default function CadastroTab() {
  const [searchTermLojas, setSearchTermLojas] = useState("")
  const [searchTermMateriais, setSearchTermMateriais] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [filtroUF, setFiltroUF] = useState("Todos")
  const [filtroTurno, setFiltroTurno] = useState("Todos")
  const [showNovaLojaModal, setShowNovaLojaModal] = useState(false)
  const [showNovoMaterialModal, setShowNovoMaterialModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadType, setUploadType] = useState<'lojas' | 'materiais'>('lojas')

  const {
    lojas,
    materiais,
    isLoading,
    error,
    updateLoja,
    updateMaterial,
    createLoja,
    createMaterial,
    uploadLojas,
    uploadMateriais
  } = useCadastroData()

  const filteredLojas = lojas.filter(loja => {
    const matchesSearch = searchTermLojas === "" || 
      loja.nome.toLowerCase().includes(searchTermLojas.toLowerCase()) || 
      loja.prefixo.toLowerCase().includes(searchTermLojas.toLowerCase())
    
    const matchesType = filtroTipo === "Todos" || loja.tipo === filtroTipo
    const matchesUF = filtroUF === "Todos" || loja.uf === filtroUF
    
    return matchesSearch && matchesType && matchesUF
  })

  const filteredMateriais = materiais.filter(material => {
    const matchesSearch = searchTermMateriais === "" || 
      material.descricao.toLowerCase().includes(searchTermMateriais.toLowerCase()) || 
      material.material.includes(searchTermMateriais)
    
    const matchesTurno = filtroTurno === "Todos" || 
      material.noturno === filtroTurno || material.diurno === filtroTurno
    
    return matchesSearch && matchesTurno
  })

  const handleLojaUpdate = useCallback(async (id: string, field: keyof LojaItem, value: any) => {
    const result = await updateLoja({ id, [field]: value })
    if (!result.success && result.error) {
      console.error('Erro ao atualizar loja:', result.error)
    }
  }, [updateLoja])

  const handleMaterialUpdate = useCallback(async (id: string, field: keyof MaterialItem, value: any) => {
    const result = await updateMaterial({ id, [field]: value })
    if (!result.success && result.error) {
      console.error('Erro ao atualizar material:', result.error)
    }
  }, [updateMaterial])

  const handleUpload = async (file: File) => {
    if (uploadType === 'lojas') {
      return await uploadLojas(file)
    } else {
      return await uploadMateriais(file)
    }
  }

  const openUploadModal = (type: 'lojas' | 'materiais') => {
    setUploadType(type)
    setShowUploadModal(true)
  }

  const ufsUnicas = [...new Set(lojas.map(l => l.uf))].sort()
  const tiposUnicos = [...new Set(lojas.map(l => l.tipo))].sort()

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold apple-font text-white">Cadastros</h2>
        <p className="text-gray-400">Gerencie lojas e materiais do sistema</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <span className="ml-3 text-gray-400">Carregando dados...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Tabela de Lojas */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-white apple-font">Cadastro de Lojas</CardTitle>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowNovaLojaModal(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Loja
                  </Button>
                  <Button
                    onClick={() => openUploadModal('lojas')}
                    size="sm"
                    variant="outline"
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* Filtros Lojas */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por nome ou prefixo..."
                    value={searchTermLojas}
                    onChange={(e) => setSearchTermLojas(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
                  />
                </div>

                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-white h-10">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Todos">Todos os tipos</SelectItem>
                    {tiposUnicos.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filtroUF} onValueChange={setFiltroUF}>
                  <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Todos">Todas UFs</SelectItem>
                    {ufsUnicas.map(uf => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-800/50">
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-20">
                        PREFIXO
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-48">
                        NOME
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24">
                        Tipo
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-16">
                        UF
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24">
                        ZONA SECO
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-28">
                        SUBZONA SECO
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24">
                        ZONA FRIO
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24">
                        ORDEM SECO
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs w-24">
                        ORDEM FRIO
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLojas.map((loja) => (
                      <TableRow key={loja.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                        <TableCell className="text-white text-xs border-r border-gray-700 font-medium">
                          <EditableInput
                            value={loja.prefixo}
                            onSave={(value) => handleLojaUpdate(loja.id, 'prefixo', value)}
                          />
                        </TableCell>
                        <TableCell className="text-white text-xs border-r border-gray-700">
                          <EditableInput
                            value={loja.nome}
                            onSave={(value) => handleLojaUpdate(loja.id, 'nome', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableSelect
                            value={loja.tipo}
                            options={['CD', 'Loja Padrão', 'Administrativo']}
                            onSave={(value) => handleLojaUpdate(loja.id, 'tipo', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableInput
                            value={loja.uf}
                            onSave={(value) => handleLojaUpdate(loja.id, 'uf', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableInput
                            value={loja.zonaSeco}
                            onSave={(value) => handleLojaUpdate(loja.id, 'zonaSeco', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableInput
                            value={loja.subzonaSeco}
                            onSave={(value) => handleLojaUpdate(loja.id, 'subzonaSeco', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableInput
                            value={loja.zonaFrio}
                            onSave={(value) => handleLojaUpdate(loja.id, 'zonaFrio', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableInput
                            value={loja.ordemSeco}
                            onSave={(value) => handleLojaUpdate(loja.id, 'ordemSeco', value)}
                            type="number"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <EditableInput
                            value={loja.ordemFrio}
                            onSave={(value) => handleLojaUpdate(loja.id, 'ordemFrio', value)}
                            type="number"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Materiais */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-white apple-font">Cadastro de Materiais</CardTitle>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowNovoMaterialModal(true)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Material
                  </Button>
                  <Button
                    onClick={() => openUploadModal('materiais')}
                    size="sm"
                    variant="outline"
                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </div>

              {/* Filtros Materiais */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por material ou descrição..."
                    value={searchTermMateriais}
                    onChange={(e) => setSearchTermMateriais(e.target.value)}
                    className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
                  />
                </div>

                <Select value={filtroTurno} onValueChange={setFiltroTurno}>
                  <SelectTrigger className="w-40 bg-gray-800/50 border-gray-700 text-white h-10">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Todos">Todos os turnos</SelectItem>
                    <SelectItem value="SECO">SECO</SelectItem>
                    <SelectItem value="FRIO">FRIO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700 bg-gray-800/50">
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-32">
                        MATERIAL
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-80">
                        DESCRIÇÃO
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24">
                        NOTURNO
                      </TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs w-24">
                        DIURNO
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMateriais.map((material) => (
                      <TableRow key={material.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                        <TableCell className="text-blue-400 text-xs border-r border-gray-700 font-mono">
                          <EditableInput
                            value={material.material}
                            onSave={(value) => handleMaterialUpdate(material.id, 'material', value)}
                          />
                        </TableCell>
                        <TableCell className="text-white text-xs border-r border-gray-700">
                          <EditableInput
                            value={material.descricao}
                            onSave={(value) => handleMaterialUpdate(material.id, 'descricao', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center border-r border-gray-700">
                          <EditableSelect
                            value={material.noturno}
                            options={['SECO', 'FRIO']}
                            onSave={(value) => handleMaterialUpdate(material.id, 'noturno', value)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <EditableSelect
                            value={material.diurno}
                            options={['SECO', 'FRIO']}
                            onSave={(value) => handleMaterialUpdate(material.id, 'diurno', value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modais */}
      <NovaLojaModal
        isOpen={showNovaLojaModal}
        onClose={() => setShowNovaLojaModal(false)}
        onSave={createLoja}
      />

      <NovoMaterialModal
        isOpen={showNovoMaterialModal}
        onClose={() => setShowNovoMaterialModal(false)}
        onSave={createMaterial}
      />

      <UploadCadastroModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        type={uploadType}
        onUpload={handleUpload}
      />
    </motion.div>
  )
}