"use client"

import type React from "react"
import Image from "next/image"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Eye, EyeOff, AlertCircle, User, UserPlus } from "lucide-react"

export default function LoginPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { login, register } = useAuth()

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setName("")
    setConfirmPassword("")
    setError("")
    setSuccess("")
  }

  const handleModeSwitch = (checked: boolean) => {
    setIsRegisterMode(checked)
    resetForm()
  }

  const validateForm = () => {
    if (!email || !password) {
      setError("Todos os campos são obrigatórios")
      return false
    }

    if (isRegisterMode) {
      if (!name) {
        setError("Nome é obrigatório")
        return false
      }
      if (name.length < 2) {
        setError("Nome deve ter pelo menos 2 caracteres")
        return false
      }
      if (password.length < 6) {
        setError("Senha deve ter pelo menos 6 caracteres")
        return false
      }
      if (password !== confirmPassword) {
        setError("Senhas não coincidem")
        return false
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Email inválido")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (isRegisterMode) {
        const result = await register({
          email,
          password,
          name,
          role: 'user'
        })

        if (result.success) {
          setSuccess("Conta criada com sucesso! Redirecionando...")
        } else {
          setError(result.error || "Erro no registro")
        }
      } else {
        const result = await login(email, password)

        if (!result.success) {
          setError(result.error || "Erro no login")
        }
      }
    } catch (error) {
      console.error('Erro na autenticação:', error)
      setError("Erro de conexão")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-blue-950 to-purple-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="gradient-border">
          <div className="gradient-border-inner p-8">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader className="text-center space-y-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center relative overflow-hidden"
                >
                  <Image 
                    src="/logo.png" 
                    alt="Colhetron Logo" 
                    width={40} 
                    height={40}
                    className="object-contain"
                    priority
                  />
                </motion.div>
                <CardTitle className="text-2xl font-bold apple-font text-white">
                  Sistema Colhetron
                </CardTitle>
                <p className="text-gray-400 apple-font">
                  {isRegisterMode ? "Crie sua conta para acessar" : "Faça login para acessar o sistema"}
                </p>

                <div className="flex items-center justify-center space-x-3 bg-gray-800/30 rounded-lg p-3">
                  <User className={`w-4 h-4 ${!isRegisterMode ? 'text-blue-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${!isRegisterMode ? 'text-white' : 'text-gray-400'}`}>
                    Login
                  </span>
                  <Switch
                    checked={isRegisterMode}
                    onCheckedChange={handleModeSwitch}
                    className="data-[state=checked]:bg-blue-600"
                  />
                  <span className={`text-sm ${isRegisterMode ? 'text-white' : 'text-gray-400'}`}>
                    Registro
                  </span>
                  <UserPlus className={`w-4 h-4 ${isRegisterMode ? 'text-blue-400' : 'text-gray-500'}`} />
                </div>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isRegisterMode ? 'register' : 'login'}
                      initial={{ opacity: 0, x: isRegisterMode ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRegisterMode ? -20 : 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {isRegisterMode && (
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-gray-300">Nome Completo</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <Input
                              id="name"
                              type="text"
                              placeholder="Seu nome completo"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
                              required={isRegisterMode}
                              disabled={isLoading}
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
                            required
                            disabled={isLoading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-300">Senha</Label>
                        <div className="relative">
                          <div className="absolute left-3 top-3 w-5 h-5 text-gray-400">🔒</div>
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder={isRegisterMode ? "Mínimo 6 caracteres" : "Sua senha"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 pr-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
                            required
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                            disabled={isLoading}
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {isRegisterMode && (
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar Senha</Label>
                          <div className="relative">
                            <div className="absolute left-3 top-3 w-5 h-5 text-gray-400">🔒</div>
                            <Input
                              id="confirmPassword"
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirme sua senha"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="pl-10 pr-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 transition-colors"
                              required={isRegisterMode}
                              disabled={isLoading}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                              disabled={isLoading}
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
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
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center space-x-2 text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg p-3"
                      >
                        <div className="w-4 h-4 text-green-400">✓</div>
                        <span>{success}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : isRegisterMode ? (
                      "Criar Conta"
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  )
}