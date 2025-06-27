"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
 User, 
 LogOut, 
 Menu, 
 Package, 
 PlusCircle, 
 CheckCircle, 
 Loader2,
 FileText
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface Separation {
 id: string
 type: 'SP' | 'ES' | 'RJ'
 date: string
 status: string
 file_name: string
 total_items: number
 total_stores: number
 created_at: string
}

interface MenuItem {
 id: string
 label: string
 icon: any
}

interface HeaderProps {
 currentSeparation: Separation | null
 onNavigate: (page: string) => void
 onNewSeparationClick: () => void
 onSeparationFinalized?: () => void
 menuItems: MenuItem[]
}

export default function Header({ 
 currentSeparation, 
 onNavigate, 
 onNewSeparationClick, 
 onSeparationFinalized,
 menuItems 
}: HeaderProps) {
 const { user, logout } = useAuth()
 const [isMenuOpen, setIsMenuOpen] = useState(false)
 const [isFinalizingSeparation, setIsFinalizingSeparation] = useState(false)

 const handleLogout = () => {
   logout()
   setIsMenuOpen(false)
 }

 const formatDate = (dateString: string) => {
   return new Date(dateString).toLocaleDateString('pt-BR', {
     day: '2-digit',
     month: '2-digit',
     year: 'numeric'
   })
 }

 const handleFinalizeSeparation = async () => {
   if (!currentSeparation) return
   
   setIsFinalizingSeparation(true)
   try {
     const token = localStorage.getItem('colhetron_token')
     if (!token) throw new Error('Token não encontrado')

     const response = await fetch('/api/separations/finalize', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       }
     })

     if (response.ok) {
       toast.success('Separação finalizada com sucesso!')
       onSeparationFinalized?.()
     } else {
       const error = await response.json()
       toast.error(error.error || 'Erro ao finalizar separação')
     }
   } catch (error) {
     console.error('Erro ao finalizar separação:', error)
     toast.error('Erro ao finalizar separação')
   } finally {
     setIsFinalizingSeparation(false)
   }
 }

 return (
   <header className="bg-gray-900/95 border-b border-gray-800 backdrop-blur-sm sticky top-0 z-50">
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
       <div className="flex items-center justify-between h-16">
         <motion.div 
           className="flex items-center space-x-3"
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.5 }}
         >
           <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
             <Package className="w-6 h-6 text-white" />
           </div>
           <div>
             <h1 className="text-xl font-bold apple-font text-white">Sistema de Separação</h1>
             {currentSeparation && (
               <div className="flex items-center space-x-2">
                 <p className="text-sm text-gray-400">
                   {currentSeparation.type} - {formatDate(currentSeparation.date)}
                 </p>
                 <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                   {currentSeparation.total_items} itens
                 </span>
               </div>
             )}
           </div>
         </motion.div>

         <div className="hidden md:flex items-center space-x-2">
           {currentSeparation ? (
             <Button
               onClick={handleFinalizeSeparation}
               disabled={isFinalizingSeparation}
               size="sm"
               className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50"
               aria-label="Finalizar separação ativa"
             >
               {isFinalizingSeparation ? (
                 <>
                   <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                   Finalizando...
                 </>
               ) : (
                 <>
                   <CheckCircle className="w-4 h-4 mr-2" />
                   Finalizar Separação
                 </>
               )}
             </Button>
           ) : (
             <Button
               onClick={onNewSeparationClick}
               size="sm"
               className="bg-blue-600 text-white hover:bg-blue-700"
               aria-label="Criar nova separação"
             >
               <PlusCircle className="w-4 h-4 mr-2" />
               Nova Separação
             </Button>
           )}

           <Button
             onClick={() => onNavigate("relatorios")}
             size="sm"
             variant="outline"
             className="border-purple-600 text-purple-400 hover:bg-purple-900/20 hover:text-purple-300"
             aria-label="Acessar relatórios"
           >
             <FileText className="w-4 h-4 mr-2" />
             Relatórios
           </Button>

           {menuItems.map((item) => (
             <Button
               key={item.id}
               variant="ghost"
               size="sm"
               onClick={() => onNavigate(item.id)}
               className="text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
             >
               <item.icon className="w-4 h-4 mr-2" />
               {item.label}
             </Button>
           ))}

           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                 <User className="w-4 h-4 mr-2" />
                 {user?.name}
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
               <DropdownMenuItem onClick={() => onNavigate("perfil")} className="text-gray-300 hover:text-white">
                 <User className="w-4 h-4 mr-2" />
                 Perfil
               </DropdownMenuItem>
               <DropdownMenuSeparator className="bg-gray-700" />
               <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300 focus:bg-red-900/50 focus:text-white">
                 <LogOut className="w-4 h-4 mr-2" />
                 Sair
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>

         <div className="md:hidden">
           <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
             <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon">
                 <Menu className="w-5 h-5" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 w-56">
               {currentSeparation ? (
                 <DropdownMenuItem
                   onClick={() => {
                     handleFinalizeSeparation();
                     setIsMenuOpen(false);
                   }}
                   disabled={isFinalizingSeparation}
                   className="text-gray-300 hover:text-white focus:bg-green-900/50 disabled:opacity-50"
                 >
                   {isFinalizingSeparation ? (
                     <>
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       Finalizando...
                     </>
                   ) : (
                     <>
                       <CheckCircle className="w-4 h-4 mr-2" />
                       Finalizar Separação
                     </>
                   )}
                 </DropdownMenuItem>
               ) : (
                 <DropdownMenuItem
                   onClick={() => {
                     onNewSeparationClick();
                     setIsMenuOpen(false);
                   }}
                   className="text-gray-300 hover:text-white focus:bg-blue-900/50"
                 >
                   <PlusCircle className="w-4 h-4 mr-2" />
                   Nova Separação
                 </DropdownMenuItem>
               )}
               
               <DropdownMenuSeparator className="bg-gray-700" />
               
               <DropdownMenuItem
                 onClick={() => {
                   onNavigate("relatorios");
                   setIsMenuOpen(false);
                 }}
                 className="text-purple-400 hover:text-purple-300 focus:bg-purple-900/50"
               >
                 <FileText className="w-4 h-4 mr-2" />
                 Relatórios
               </DropdownMenuItem>
               
               {menuItems.map((item) => (
                 <DropdownMenuItem
                   key={item.id}
                   onClick={() => {
                     onNavigate(item.id)
                     setIsMenuOpen(false)
                   }}
                   className="text-gray-300 hover:text-white"
                 >
                   <item.icon className="w-4 h-4 mr-2" />
                   {item.label}
                 </DropdownMenuItem>
               ))}
               
               <DropdownMenuSeparator className="bg-gray-700" />
               
               <DropdownMenuItem 
                 onClick={() => {
                   onNavigate("perfil"); 
                   setIsMenuOpen(false);
                 }} 
                 className="text-gray-300 hover:text-white"
               >
                 <User className="w-4 h-4 mr-2" />
                 Perfil
               </DropdownMenuItem>
               <DropdownMenuItem 
                 onClick={handleLogout} 
                 className="text-red-400 hover:text-red-300 focus:bg-red-900/50 focus:text-white"
               >
                 <LogOut className="w-4 h-4 mr-2" />
                 Sair
               </DropdownMenuItem>
             </DropdownMenuContent>
           </DropdownMenu>
         </div>
       </div>
     </div>
   </header>
 )
}