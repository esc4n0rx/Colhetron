// components/tabs/CadastroTab.tsx
"use client"

import React, { useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Loader2, Search, Filter, Plus, Upload, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useCadastroData, LojaItem, MaterialItem } from '@/hooks/useCadastroData'

// Componente de paginação
interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 rounded-b-lg border-t border-gray-700">
      <div className="text-sm text-gray-400">
        Mostrando {startItem} a {endItem} de {totalItems} resultados
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (currentPage <= 3) {
              pageNum = i + 1
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = currentPage - 2 + i
            }

            return (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 p-0 ${
                  currentPage === pageNum
                    ? "bg-blue-600 text-white"
                    : "border-gray-600 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {pageNum}
              </Button>
            )
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

// Componente para célula editável
interface EditableCellProps {
  value: any
  onSave: (value: any) => void
  type?: 'text' | 'number' | 'select'
  options?: string[]
  placeholder?: string
  disabled?: boolean
}

function EditableCell({ value, onSave, type = 'text', options, placeholder, disabled = false }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    onSave(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  if (disabled || (!isEditing && type !== 'select')) {
    return (
      <div
        onClick={() => !disabled && setIsEditing(true)}
        className={`p-2 rounded cursor-pointer hover:bg-gray-700/50 transition-colors ${
          disabled ? 'cursor-not-allowed opacity-50' : ''
        } text-white`}
      >
        {value || placeholder || (type === 'number' ? '0' : '-')}
      </div>
    )
  }

  if (type === 'select') {
    return (
      <Select value={value} onValueChange={(newValue) => onSave(newValue)}>
        <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-700">
          {options?.map(option => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  return (
    <div className="flex gap-1">
      <Input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(type === 'number' ? Number(e.target.value) : e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') handleCancel()
        }}
        className="bg-gray-800 border-gray-600 text-white h-8 text-sm"
        autoFocus
      />
      <Button size="sm" onClick={handleSave} className="h-8 px-2 bg-green-600 hover:bg-green-700">
        ✓
      </Button>
      <Button size="sm" onClick={handleCancel} className="h-8 px-2 bg-red-600 hover:bg-red-700">
        ✗
      </Button>
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
  
  // Estados de paginação
  const [currentPageLojas, setCurrentPageLojas] = useState(1)
  const [currentPageMateriais, setCurrentPageMateriais] = useState(1)
  const itemsPerPage = 20

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

  // Filtros e paginação para lojas
  const filteredLojas = useMemo(() => {
    return lojas.filter(loja => {
      const matchesSearch = searchTermLojas === "" || 
        loja.nome.toLowerCase().includes(searchTermLojas.toLowerCase()) || 
        loja.prefixo.toLowerCase().includes(searchTermLojas.toLowerCase())
      
      const matchesType = filtroTipo === "Todos" || loja.tipo === filtroTipo
      const matchesUF = filtroUF === "Todos" || loja.uf === filtroUF
      
      return matchesSearch && matchesType && matchesUF
    })
  }, [lojas, searchTermLojas, filtroTipo, filtroUF])

  const paginatedLojas = useMemo(() => {
    const startIndex = (currentPageLojas - 1) * itemsPerPage
    return filteredLojas.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredLojas, currentPageLojas, itemsPerPage])

  const totalPagesLojas = Math.ceil(filteredLojas.length / itemsPerPage)

  // Filtros e paginação para materiais
  const filteredMateriais = useMemo(() => {
    return materiais.filter(material => {
      const matchesSearch = searchTermMateriais === "" || 
        material.descricao.toLowerCase().includes(searchTermMateriais.toLowerCase()) || 
        material.material.includes(searchTermMateriais)
      
      const matchesTurno = filtroTurno === "Todos" || 
        material.noturno === filtroTurno || material.diurno === filtroTurno
      
      return matchesSearch && matchesTurno
    })
  }, [materiais, searchTermMateriais, filtroTurno])

  const paginatedMateriais = useMemo(() => {
    const startIndex = (currentPageMateriais - 1) * itemsPerPage
    return filteredMateriais.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredMateriais, currentPageMateriais, itemsPerPage])

  const totalPagesMateriais = Math.ceil(filteredMateriais.length / itemsPerPage)

  const handleLojaUpdate = useCallback(async (id: string, field: keyof LojaItem, value: any) => {
    const result = await updateLoja({ id, [field]: value })
    if (!result.success && result.error) {
      toast.error('Erro ao atualizar loja: ' + result.error)
    } else {
      toast.success('Loja atualizada com sucesso!')
    }
  }, [updateLoja])

  const handleMaterialUpdate = useCallback(async (id: string, field: keyof MaterialItem, value: any) => {
    const result = await updateMaterial({ id, [field]: value })
    if (!result.success && result.error) {
      toast.error('Erro ao atualizar material: ' + result.error)
    } else {
      toast.success('Material atualizado com sucesso!')
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
                <CardTitle className="text-white apple-font">
                  Cadastro de Lojas ({filteredLojas.length} {filteredLojas.length === 1 ? 'loja' : 'lojas'})
                </CardTitle>
                
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
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-24">
                       PREFIXO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold border-r border-gray-700 min-w-48">
                       NOME
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-32">
                       TIPO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-16">
                       UF
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-24">
                       CENTRO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-28">
                       ZONA SECO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-32">
                       SUBZONA SECO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-28">
                       ZONA FRIO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-28">
                       ORDEM SECO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center w-28">
                       ORDEM FRIO
                     </TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {paginatedLojas.map((loja) => (
                     <TableRow key={loja.id} className="border-gray-700 hover:bg-gray-700/50">
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.prefixo}
                           onSave={(value) => handleLojaUpdate(loja.id, 'prefixo', value)}
                           placeholder="Prefixo"
                         />
                       </TableCell>
                       <TableCell className="border-r border-gray-700">
                         <EditableCell
                           value={loja.nome}
                           onSave={(value) => handleLojaUpdate(loja.id, 'nome', value)}
                           placeholder="Nome da loja"
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.tipo}
                           onSave={(value) => handleLojaUpdate(loja.id, 'tipo', value)}
                           type="select"
                           options={['CD', 'Loja Padrão', 'Administrativo']}
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.uf}
                           onSave={(value) => handleLojaUpdate(loja.id, 'uf', value)}
                           placeholder="UF"
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.centro}
                           onSave={(value) => handleLojaUpdate(loja.id, 'centro', value)}
                           placeholder="Centro"
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.zonaSeco}
                           onSave={(value) => handleLojaUpdate(loja.id, 'zonaSeco', value)}
                           placeholder="Zona"
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.subzonaSeco}
                           onSave={(value) => handleLojaUpdate(loja.id, 'subzonaSeco', value)}
                           placeholder="Subzona"
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.zonaFrio}
                           onSave={(value) => handleLojaUpdate(loja.id, 'zonaFrio', value)}
                           placeholder="Zona"
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={loja.ordemSeco}
                           onSave={(value) => handleLojaUpdate(loja.id, 'ordemSeco', value)}
                           type="number"
                           placeholder="0"
                         />
                       </TableCell>
                       <TableCell className="text-center">
                         <EditableCell
                           value={loja.ordemFrio}
                           onSave={(value) => handleLojaUpdate(loja.id, 'ordemFrio', value)}
                           type="number"
                           placeholder="0"
                         />
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
             
             {/* Paginação Lojas */}
             {totalPagesLojas > 1 && (
               <Pagination
                 currentPage={currentPageLojas}
                 totalPages={totalPagesLojas}
                 onPageChange={setCurrentPageLojas}
                 totalItems={filteredLojas.length}
                 itemsPerPage={itemsPerPage}
               />
             )}
           </CardContent>
         </Card>

         {/* Tabela de Materiais */}
         <Card className="bg-gray-900/50 border-gray-800">
           <CardHeader>
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <CardTitle className="text-white apple-font">
                 Cadastro de Materiais ({filteredMateriais.length} {filteredMateriais.length === 1 ? 'material' : 'materiais'})
               </CardTitle>
               
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
                   placeholder="Buscar por descrição ou código..."
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
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-32">
                       CÓDIGO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold border-r border-gray-700 min-w-60">
                       DESCRIÇÃO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center border-r border-gray-700 w-28">
                       NOTURNO
                     </TableHead>
                     <TableHead className="text-gray-300 font-bold text-center w-28">
                       DIURNO
                     </TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {paginatedMateriais.map((material) => (
                     <TableRow key={material.id} className="border-gray-700 hover:bg-gray-700/50">
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={material.material}
                           onSave={(value) => handleMaterialUpdate(material.id, 'material', value)}
                           placeholder="Código"
                         />
                       </TableCell>
                       <TableCell className="border-r border-gray-700">
                         <EditableCell
                           value={material.descricao}
                           onSave={(value) => handleMaterialUpdate(material.id, 'descricao', value)}
                           placeholder="Descrição do material"
                         />
                       </TableCell>
                       <TableCell className="text-center border-r border-gray-700">
                         <EditableCell
                           value={material.noturno}
                           onSave={(value) => handleMaterialUpdate(material.id, 'noturno', value)}
                           type="select"
                           options={['SECO', 'FRIO']}
                         />
                       </TableCell>
                       <TableCell className="text-center">
                         <EditableCell
                           value={material.diurno}
                           onSave={(value) => handleMaterialUpdate(material.id, 'diurno', value)}
                           type="select"
                           options={['SECO', 'FRIO']}
                         />
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </div>
             
             {/* Paginação Materiais */}
             {totalPagesMateriais > 1 && (
               <Pagination
                 currentPage={currentPageMateriais}
                 totalPages={totalPagesMateriais}
                 onPageChange={setCurrentPageMateriais}
                 totalItems={filteredMateriais.length}
                 itemsPerPage={itemsPerPage}
               />
             )}
           </CardContent>
         </Card>
       </>
     )}

     {/* Modais */}
     <UploadModal
       isOpen={showUploadModal}
       onClose={() => setShowUploadModal(false)}
       onUpload={handleUpload}
       type={uploadType}
     />

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
   </motion.div>
 )
}

// Modal de Upload
interface UploadModalProps {
 isOpen: boolean
 onClose: () => void
 onUpload: (file: File) => Promise<{ success: boolean; error?: string }>
 type: 'lojas' | 'materiais'
}

function UploadModal({ isOpen, onClose, onUpload, type }: UploadModalProps) {
 const [selectedFile, setSelectedFile] = useState<File | null>(null)
 const [isUploading, setIsUploading] = useState(false)

 const handleUpload = async () => {
   if (!selectedFile) return

   setIsUploading(true)
   try {
     const result = await onUpload(selectedFile)
     if (result.success) {
       toast.success(`${type === 'lojas' ? 'Lojas' : 'Materiais'} importados com sucesso!`)
       onClose()
       setSelectedFile(null)
     } else {
       toast.error(result.error || 'Erro no upload')
     }
   } catch (error) {
     toast.error('Erro inesperado no upload')
   } finally {
     setIsUploading(false)
   }
 }

 const expectedColumns = type === 'lojas' 
   ? 'PREFIXO, NOME, Tipo, UF, CENTRO, ZONA SECO, SUBZONA SECO, ZONA FRIO, ORDEM SECO, ORDEM FRIO'
   : 'MATERIAL, DESCRIÇÃO, NOTURNO, DIURNO'

 return (
   <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="bg-gray-900 border-gray-700 text-white">
       <DialogHeader>
         <DialogTitle>Upload de {type === 'lojas' ? 'Lojas' : 'Materiais'}</DialogTitle>
       </DialogHeader>
       
       <div className="space-y-4">
         <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
           <p className="text-sm text-blue-300 mb-2">
             <strong>Formato esperado:</strong>
           </p>
           <p className="text-xs text-blue-200 font-mono">
             {expectedColumns}
           </p>
           {type === 'lojas' && (
             <p className="text-xs text-blue-200 mt-2">
               * Colunas obrigatórias: PREFIXO, NOME, UF<br/>
               * Nova coluna CENTRO agora suportada
             </p>
           )}
         </div>

         <div className="space-y-2">
           <Label>Arquivo Excel (.xlsx ou .xls)</Label>
           <Input
             type="file"
             accept=".xlsx,.xls"
             onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
             className="bg-gray-800 border-gray-700 text-white"
           />
         </div>

         <div className="flex justify-end gap-2">
           <Button
             variant="outline"
             onClick={onClose}
             className="border-gray-600 text-gray-300"
           >
             Cancelar
           </Button>
           <Button
             onClick={handleUpload}
             disabled={!selectedFile || isUploading}
             className="bg-blue-600 hover:bg-blue-700"
           >
             {isUploading ? (
               <>
                 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                 Importando...
               </>
             ) : (
               'Importar'
             )}
           </Button>
         </div>
       </div>
     </DialogContent>
   </Dialog>
 )
}

// Modal Nova Loja
interface NovaLojaModalProps {
 isOpen: boolean
 onClose: () => void
 onSave: (loja: Omit<LojaItem, 'id'>) => Promise<{ success: boolean; error?: string }>
}

function NovaLojaModal({ isOpen, onClose, onSave }: NovaLojaModalProps) {
 const [formData, setFormData] = useState({
   prefixo: '',
   nome: '',
   tipo: 'CD' as const,
   uf: '',
   centro: '',
   zonaSeco: '',
   subzonaSeco: '',
   zonaFrio: '',
   ordemSeco: 0,
   ordemFrio: 0
 })
 const [isSaving, setIsSaving] = useState(false)

 const handleSave = async () => {
   if (!formData.prefixo || !formData.nome || !formData.uf) {
     toast.error('Campos obrigatórios: Prefixo, Nome e UF')
     return
   }

   setIsSaving(true)
   try {
     const result = await onSave(formData)
     if (result.success) {
       toast.success('Loja criada com sucesso!')
       onClose()
       setFormData({
         prefixo: '',
         nome: '',
         tipo: 'CD',
         uf: '',
         centro: '',
         zonaSeco: '',
         subzonaSeco: '',
         zonaFrio: '',
         ordemSeco: 0,
         ordemFrio: 0
       })
     } else {
       toast.error(result.error || 'Erro ao criar loja')
     }
   } catch (error) {
     toast.error('Erro inesperado')
   } finally {
     setIsSaving(false)
   }
 }

 return (
   <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
       <DialogHeader>
         <DialogTitle>Nova Loja</DialogTitle>
       </DialogHeader>
       
       <div className="grid grid-cols-2 gap-4">
         <div className="space-y-2">
           <Label>Prefixo *</Label>
           <Input
             value={formData.prefixo}
             onChange={(e) => setFormData(prev => ({ ...prev, prefixo: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Ex: 001"
           />
         </div>

         <div className="space-y-2">
           <Label>Nome *</Label>
           <Input
             value={formData.nome}
             onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Nome da loja"
           />
         </div>

         <div className="space-y-2">
           <Label>Tipo</Label>
           <Select 
             value={formData.tipo} 
             onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipo: value }))}
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
           <Label>UF *</Label>
           <Input
             value={formData.uf}
             onChange={(e) => setFormData(prev => ({ ...prev, uf: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Ex: SP"
             maxLength={2}
           />
         </div>

         <div className="space-y-2">
           <Label>Centro</Label>
           <Input
             value={formData.centro}
             onChange={(e) => setFormData(prev => ({ ...prev, centro: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Código do centro"
           />
         </div>

         <div className="space-y-2">
           <Label>Zona Seco</Label>
           <Input
             value={formData.zonaSeco}
             onChange={(e) => setFormData(prev => ({ ...prev, zonaSeco: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Ex: A"
           />
         </div>

         <div className="space-y-2">
           <Label>Subzona Seco</Label>
           <Input
             value={formData.subzonaSeco}
             onChange={(e) => setFormData(prev => ({ ...prev, subzonaSeco: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Ex: A1"
           />
         </div>

         <div className="space-y-2">
           <Label>Zona Frio</Label>
           <Input
             value={formData.zonaFrio}
             onChange={(e) => setFormData(prev => ({ ...prev, zonaFrio: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Ex: F"
           />
         </div>

         <div className="space-y-2">
           <Label>Ordem Seco</Label>
           <Input
             type="number"
             value={formData.ordemSeco}
             onChange={(e) => setFormData(prev => ({ ...prev, ordemSeco: Number(e.target.value) }))}
             className="bg-gray-800 border-gray-700 text-white"
             min="0"
           />
         </div>

         <div className="space-y-2">
           <Label>Ordem Frio</Label>
           <Input
             type="number"
             value={formData.ordemFrio}
             onChange={(e) => setFormData(prev => ({ ...prev, ordemFrio: Number(e.target.value) }))}
             className="bg-gray-800 border-gray-700 text-white"
             min="0"
           />
         </div>
       </div>

       <div className="flex justify-end gap-2 pt-4">
         <Button
           variant="outline"
           onClick={onClose}
           className="border-gray-600 text-gray-300"
         >
           Cancelar
         </Button>
         <Button
           onClick={handleSave}
           disabled={isSaving}
           className="bg-green-600 hover:bg-green-700"
         >
           {isSaving ? (
             <>
               <Loader2 className="w-4 h-4 mr-2 animate-spin" />
               Salvando...
             </>
           ) : (
             'Salvar'
           )}
         </Button>
       </div>
     </DialogContent>
   </Dialog>
 )
}

// Modal Novo Material
interface NovoMaterialModalProps {
 isOpen: boolean
 onClose: () => void
 onSave: (material: Omit<MaterialItem, 'id'>) => Promise<{ success: boolean; error?: string }>
}

function NovoMaterialModal({ isOpen, onClose, onSave }: NovoMaterialModalProps) {
 const [formData, setFormData] = useState({
   material: '',
   descricao: '',
   noturno: 'SECO' as const,
   diurno: 'SECO' as const
 })
 const [isSaving, setIsSaving] = useState(false)

 const handleSave = async () => {
   if (!formData.material || !formData.descricao) {
     toast.error('Campos obrigatórios: Código e Descrição')
     return
   }

   setIsSaving(true)
   try {
     const result = await onSave(formData)
     if (result.success) {
       toast.success('Material criado com sucesso!')
       onClose()
       setFormData({
         material: '',
         descricao: '',
         noturno: 'SECO',
         diurno: 'SECO'
       })
     } else {
       toast.error(result.error || 'Erro ao criar material')
     }
   } catch (error) {
     toast.error('Erro inesperado')
   } finally {
     setIsSaving(false)
   }
 }

 return (
   <Dialog open={isOpen} onOpenChange={onClose}>
     <DialogContent className="bg-gray-900 border-gray-700 text-white">
       <DialogHeader>
         <DialogTitle>Novo Material</DialogTitle>
       </DialogHeader>
       
       <div className="space-y-4">
         <div className="space-y-2">
           <Label>Código *</Label>
           <Input
             value={formData.material}
             onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Código do material"
           />
         </div>

         <div className="space-y-2">
           <Label>Descrição *</Label>
           <Input
             value={formData.descricao}
             onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
             className="bg-gray-800 border-gray-700 text-white"
             placeholder="Descrição do material"
           />
         </div>

         <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
             <Label>Noturno</Label>
             <Select 
               value={formData.noturno} 
               onValueChange={(value: any) => setFormData(prev => ({ ...prev, noturno: value }))}
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
             <Label>Diurno</Label>
             <Select 
               value={formData.diurno} 
               onValueChange={(value: any) => setFormData(prev => ({ ...prev, diurno: value }))}
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
       </div>

       <div className="flex justify-end gap-2 pt-4">
         <Button
           variant="outline"
           onClick={onClose}
           className="border-gray-600 text-gray-300"
         >
           Cancelar
         </Button>
         <Button
           onClick={handleSave}
           disabled={isSaving}
           className="bg-green-600 hover:bg-green-700"
         >
           {isSaving ? (
             <>
               <Loader2 className="w-4 h-4 mr-2 animate-spin" />
               Salvando...
             </>
           ) : (
             'Salvar'
           )}
         </Button>
       </div>
     </DialogContent>
   </Dialog>
 )
}