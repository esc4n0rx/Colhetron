// components/Header.tsx (ATUALIZADO)
"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { useSeparation } from "@/contexts/SeparationContext"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Info, Download, User, LogOut, Menu, Package, PlusCircle } from "lucide-react"

interface HeaderProps {
  onNavigate: (page: string) => void
  onNewSeparationClick: () => void
}

export default function Header({ onNavigate, onNewSeparationClick }: HeaderProps) {
  const { user, logout } = useAuth()
  const { currentSeparation } = useSeparation()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuItems = [
    { id: "configuracoes", label: "Configurações", icon: Settings },
    { id: "sobre", label: "Sobre", icon: Info },
    { id: "atualizacoes", label: "Atualizações", icon: Download },
  ]

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    // Adiciona o timezone para evitar problemas de data
    const userTimezoneOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <header className="bg-gray-900/50 backdrop-blur-lg border-b border-gray-800">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
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

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center space-x-2">
             <Button
                onClick={onNewSeparationClick}
                disabled={!!currentSeparation}
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50"
                aria-label="Criar nova separação"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Nova Separação
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

          {/* Menu Mobile */}
          <div className="md:hidden">
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 w-56">
                <DropdownMenuItem
                    onClick={() => {
                      onNewSeparationClick();
                      setIsMenuOpen(false);
                    }}
                    disabled={!!currentSeparation}
                    className="text-gray-300 hover:text-white focus:bg-blue-900/50 disabled:opacity-50"
                  >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nova Separação
                  </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
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
                 <DropdownMenuItem onClick={() => {onNavigate("perfil"); setIsMenuOpen(false);}} className="text-gray-300 hover:text-white">
                  <User className="w-4 h-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:text-red-300 focus:bg-red-900/50 focus:text-white">
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