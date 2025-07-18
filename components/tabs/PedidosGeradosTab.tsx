// components/tabs/PedidosGeradosTab.tsx
"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
 Search,
 RefreshCw,
 Copy,
 AlertCircle,
 Package,
 Trash2,
 AlertTriangle,
 Plus,
 FileText,
 Calendar,
 User
} from 'lucide-react'
import { toast } from 'sonner'
import { usePedidosGeradosData } from '@/hooks/usePedidosGeradosData'
import { PedidosGeradosItem } from '@/types/pedidos-gerados'

export default function PedidosGeradosTab() {
 const { data, isLoading, error, separationInfo, canAddItems, addItems, refresh, clearData } = usePedidosGeradosData()
 
 const [searchTerm, setSearchTerm] = useState('')
 const [isRefreshing, setIsRefreshing] = useState(false)
 const [isClearing, setIsClearing] = useState(false)
 const [showAddForm, setShowAddForm] = useState(false)
 const [isSubmitting, setIsSubmitting] = useState(false)
 
 // Estados do formulário
 const [formData, setFormData] = useState({
   pedido: '',
   remessa: '',
   dados_adicionais: ''
 })

 // Filtrar dados
 const filteredData = useMemo(() => {
   if (!searchTerm) return data
   
   const search = searchTerm.toLowerCase()
   return data.filter(item => 
     item.pedido.toLowerCase().includes(search) ||
     item.remessa.toLowerCase().includes(search) ||
     (item.dados_adicionais && item.dados_adicionais.toLowerCase().includes(search))
   )
 }, [data, searchTerm])

 const handleRefresh = async () => {
   setIsRefreshing(true)
   await refresh()
   setIsRefreshing(false)
   toast.success('Dados atualizados com sucesso!')
 }

 const handleClearData = async () => {
   if (!confirm('Tem certeza que deseja limpar todos os dados de pedidos gerados?')) {
     return
   }

   setIsClearing(true)
   const result = await clearData()
   setIsClearing(false)
   
   if (result.success) {
     toast.success('Dados limpos com sucesso!')
   } else {
     toast.error(result.error || 'Erro ao limpar dados')
   }
 }

 const handlePasteData = () => {
   const clipboardText = navigator.clipboard.readText()
   clipboardText.then(text => {
     // Processar dados colados - assumindo formato: PEDIDO \t REMESSA \t DADOS_ADICIONAIS
     const lines = text.trim().split('\n')
     const processedItems = []
     
     for (const line of lines) {
       if (!line.trim()) continue
       
       const columns = line.split('\t').map(col => col.trim())
       if (columns.length >= 2) {
         processedItems.push({
           pedido: columns[0] || '',
           remessa: columns[1] || '',
           dados_adicionais: columns[2] || ''
         })
       }
     }
     
     if (processedItems.length > 0) {
       handleSubmitMultiple(processedItems)
     } else {
       toast.error('Nenhum dado válido encontrado na área de transferência')
     }
   }).catch(() => {
     toast.error('Erro ao acessar área de transferência')
   })
 }

 const handleSubmitForm = async (e: React.FormEvent) => {
   e.preventDefault()
   
   if (!formData.pedido || !formData.remessa) {
     toast.error('Pedido e Remessa são obrigatórios')
     return
   }

   setIsSubmitting(true)
   const result = await addItems([formData])
   setIsSubmitting(false)
   
   if (result.success) {
     toast.success('Pedido adicionado com sucesso!')
     setFormData({ pedido: '', remessa: '', dados_adicionais: '' })
     setShowAddForm(false)
   } else {
     toast.error(result.error || 'Erro ao adicionar pedido')
   }
 }

 const handleSubmitMultiple = async (items: any[]) => {
   setIsSubmitting(true)
   const result = await addItems(items)
   setIsSubmitting(false)
   
   if (result.success) {
     toast.success(`${items.length} pedidos adicionados com sucesso!`)
   } else {
     toast.error(result.error || 'Erro ao adicionar pedidos')
   }
 }

 const formatDate = (dateString: string) => {
   return new Date(dateString).toLocaleDateString('pt-BR', {
     day: '2-digit',
     month: '2-digit',
     year: 'numeric',
     hour: '2-digit',
     minute: '2-digit'
   })
 }

 if (error) {
   return (
     <motion.div
       initial={{ opacity: 0, y: 20 }}
       animate={{ opacity: 1, y: 0 }}
       className="flex items-center justify-center py-12"
     >
       <div className="text-center">
         <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
         <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
         <p className="text-gray-400">{error}</p>
         <Button onClick={handleRefresh} className="mt-4">
           Tentar novamente
         </Button>
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
     <Card className="bg-gray-900/50 border-gray-800">
       <CardHeader>
         <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
           <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
               <FileText className="w-5 h-5 text-white" />
             </div>
             <div>
               <CardTitle className="text-xl font-bold apple-font text-white">
                 Pedidos Gerados
               </CardTitle>
               <p className="text-gray-400 text-sm">
                 Registro de pedidos e remessas para análises futuras
               </p>
             </div>
             {separationInfo && (
               <Badge className={
                 separationInfo.isActive ? 
                 'bg-green-500/20 text-green-400 border-green-400/30' :
                 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30'
               }>
                 {separationInfo.isActive ? 'Separação Ativa' : 'Separação Finalizada'}
               </Badge>
             )}
           </div>
           <div className="flex items-center space-x-3">
             <Button
               variant="outline"
               size="sm"
               onClick={handleRefresh}
               disabled={isRefreshing}
               className="border-gray-700 text-gray-300 hover:bg-gray-800"
             >
               <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
               Atualizar
             </Button>
             {canAddItems && (
               <>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={handlePasteData}
                   disabled={isSubmitting}
                   className="border-gray-700 text-gray-300 hover:bg-gray-800"
                 >
                   <Copy className="w-4 h-4 mr-2" />
                   Colar Dados
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setShowAddForm(!showAddForm)}
                   className="border-gray-700 text-gray-300 hover:bg-gray-800"
                 >
                   <Plus className="w-4 h-4 mr-2" />
                   Adicionar Pedido
                 </Button>
               </>
             )}
             {data.length > 0 && (
               <Button
                 variant="destructive"
                 size="sm"
                 onClick={handleClearData}
                 disabled={isClearing}
                 className="bg-red-600 hover:bg-red-700"
               >
                 <Trash2 className="w-4 h-4 mr-2" />
                 {isClearing ? 'Limpando...' : 'Limpar Dados'}
               </Button>
             )}
           </div>
         </div>
       </CardHeader>
       <CardContent>
         <div className="flex items-center justify-between mb-4">
           <div className="flex items-center space-x-4">
             <div className="text-sm text-gray-400">
               <span className="font-medium text-white">{filteredData.length}</span> pedidos
               {searchTerm && (
                 <span> (filtrados de {data.length})</span>
               )}
             </div>
             {!canAddItems && (
               <div className="flex items-center space-x-2 text-yellow-400">
                 <AlertTriangle className="w-4 h-4" />
                 <span className="text-sm">
                   {!separationInfo ? 'Crie uma separação primeiro.' : 'Separação não está ativa.'}
                 </span>
               </div>
             )}
           </div>
           <div className="flex items-center space-x-2">
             <Search className="w-4 h-4 text-gray-400" />
             <Input
               aria-label="Buscar por pedido ou remessa"
               placeholder="Buscar por pedido ou remessa..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-64 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
             />
           </div>
         </div>
       </CardContent>
     </Card>

     {/* Formulário de Adicionar Pedido */}
     <AnimatePresence>
       {showAddForm && (
         <motion.div
           initial={{ opacity: 0, height: 0 }}
           animate={{ opacity: 1, height: 'auto' }}
           exit={{ opacity: 0, height: 0 }}
           transition={{ duration: 0.3 }}
         >
           <Card className="bg-gray-900/50 border-gray-800">
             <CardHeader>
               <CardTitle className="text-lg font-semibold text-white">
                 Adicionar Novo Pedido
               </CardTitle>
             </CardHeader>
             <CardContent>
               <form onSubmit={handleSubmitForm} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="pedido" className="text-gray-300">
                       Pedido *
                     </Label>
                     <Input
                       id="pedido"
                       value={formData.pedido}
                       onChange={(e) => setFormData(prev => ({ ...prev, pedido: e.target.value }))}
                       placeholder="Número do pedido"
                       className="bg-gray-800 border-gray-700 text-white"
                       required
                     />
                   </div>
                   <div>
                     <Label htmlFor="remessa" className="text-gray-300">
                       Remessa *
                     </Label>
                     <Input
                       id="remessa"
                       value={formData.remessa}
                       onChange={(e) => setFormData(prev => ({ ...prev, remessa: e.target.value }))}
                       placeholder="Número da remessa"
                       className="bg-gray-800 border-gray-700 text-white"
                       required
                     />
                   </div>
                 </div>
                 <div>
                   <Label htmlFor="dados_adicionais" className="text-gray-300">
                     Dados Adicionais
                   </Label>
                   <Textarea
                     id="dados_adicionais"
                     value={formData.dados_adicionais}
                     onChange={(e) => setFormData(prev => ({ ...prev, dados_adicionais: e.target.value }))}
                     placeholder="Informações adicionais sobre o pedido..."
                     className="bg-gray-800 border-gray-700 text-white"
                     rows={3}
                   />
                 </div>
                 <div className="flex justify-end space-x-3">
                   <Button
                     type="button"
                     variant="outline"
                     onClick={() => setShowAddForm(false)}
                     className="border-gray-700 text-gray-300 hover:bg-gray-800"
                   >
                     Cancelar
                   </Button>
                   <Button
                     type="submit"
                     disabled={isSubmitting}
                     className="bg-blue-600 hover:bg-blue-700"
                   >
                     {isSubmitting ? 'Salvando...' : 'Salvar Pedido'}
                   </Button>
                 </div>
               </form>
             </CardContent>
           </Card>
         </motion.div>
       )}
     </AnimatePresence>

     {/* Tabela de Dados */}
     <Card className="bg-gray-900/50 border-gray-800">
       <CardContent className="p-0">
         <div className="overflow-x-auto">
           <table className="w-full">
             <thead className="border-b border-gray-800">
               <tr className="text-left">
                 <th className="p-4 text-gray-300 font-medium">Pedido</th>
                 <th className="p-4 text-gray-300 font-medium">Remessa</th>
                 <th className="p-4 text-gray-300 font-medium">Dados Adicionais</th>
                 <th className="p-4 text-gray-300 font-medium">Data de Criação</th>
               </tr>
             </thead>
             <tbody>
               <AnimatePresence>
                 {isLoading ? (
                   <tr>
                     <td colSpan={4} className="p-8 text-center">
                       <div className="flex items-center justify-center">
                         <motion.div
                           animate={{ rotate: 360 }}
                           transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                           className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mr-3"
                         />
                         <span className="text-gray-400">Carregando dados...</span>
                       </div>
                     </td>
                   </tr>
                 ) : filteredData.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="p-8 text-center text-gray-400">
                       <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                       <p className="text-lg font-medium mb-2">Nenhum pedido encontrado</p>
                       <p className="text-sm">
                         {searchTerm
                           ? 'Tente ajustar sua busca ou limpar o filtro'
                           : data.length === 0
                             ? 'Use "Adicionar Pedido" ou "Colar Dados" para começar'
                             : 'Todos os pedidos foram filtrados pela busca'
                         }
                       </p>
                     </td>
                   </tr>
                 ) : (
                   filteredData.map((item, index) => (
                     <motion.tr
                       key={item.id}
                       layout
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0 }}
                       transition={{ delay: index * 0.05 }}
                       className="border-t border-gray-800 hover:bg-gray-800/30 transition-colors"
                     >
                       <td className="p-4 text-white font-medium">{item.pedido}</td>
                       <td className="p-4 text-white font-medium">{item.remessa}</td>
                       <td className="p-4 text-gray-300">
                         {item.dados_adicionais ? (
                           <div className="max-w-xs truncate" title={item.dados_adicionais}>
                             {item.dados_adicionais}
                           </div>
                         ) : (
                           <span className="text-gray-500 italic">Sem dados adicionais</span>
                         )}
                       </td>
                       <td className="p-4 text-gray-400 text-sm">
                         <div className="flex items-center space-x-2">
                           <Calendar className="w-4 h-4" />
                           <span>{formatDate(item.created_at)}</span>
                         </div>
                       </td>
                     </motion.tr>
                   ))
                 )}
               </AnimatePresence>
             </tbody>
           </table>
         </div>
       </CardContent>
     </Card>
   </motion.div>
 )
}