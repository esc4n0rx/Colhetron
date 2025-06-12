// components/auth/RegisterForm.tsx
"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { registerSchema, type RegisterFormData } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
// components/auth/RegisterForm.tsx (continuação)
import { 
 Eye, EyeOff, Mail, Lock, User, Loader2, 
 AlertCircle, CheckCircle, Shield, Check
} from 'lucide-react'

interface RegisterFormProps {
 onSuccess: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
 const [showPassword, setShowPassword] = useState(false)
 const [showConfirmPassword, setShowConfirmPassword] = useState(false)
 const [isLoading, setIsLoading] = useState(false)
 const [error, setError] = useState('')
 const [success, setSuccess] = useState('')
 const { register: registerUser } = useAuth()

 const {
   register,
   handleSubmit,
   formState: { errors },
   watch
 } = useForm<RegisterFormData>({
   resolver: zodResolver(registerSchema),
   mode: 'onChange'
 })

 const watchedFields = watch()
 const password = watch('password')

 // Função para calcular força da senha
 const getPasswordStrength = (password: string) => {
   if (!password) return { score: 0, label: '', color: '' }
   
   let score = 0
   const checks = {
     length: password.length >= 8,
     lowercase: /[a-z]/.test(password),
     uppercase: /[A-Z]/.test(password),
     number: /\d/.test(password),
     symbol: /[@$!%*?&]/.test(password)
   }
   
   score = Object.values(checks).filter(Boolean).length
   
   if (score < 2) return { score: score * 20, label: 'Muito fraca', color: 'bg-red-500' }
   if (score < 3) return { score: score * 20, label: 'Fraca', color: 'bg-orange-500' }
   if (score < 4) return { score: score * 20, label: 'Média', color: 'bg-yellow-500' }
   if (score < 5) return { score: score * 20, label: 'Forte', color: 'bg-blue-500' }
   return { score: 100, label: 'Muito forte', color: 'bg-green-500' }
 }

 const passwordStrength = getPasswordStrength(password || '')

 const onSubmit = async (data: RegisterFormData) => {
   setError('')
   setSuccess('')
   setIsLoading(true)

   try {
     const result = await registerUser({
       name: data.name,
       email: data.email,
       password: data.password,
       role: 'user'
     })
     
     if (result.success) {
       setSuccess('Conta criada com sucesso! Redirecionando...')
       setTimeout(() => {
         onSuccess()
       }, 2000)
     } else {
       setError(result.error || 'Erro ao criar conta')
     }
   } catch (error) {
     console.error('Erro no registro:', error)
     setError('Erro de conexão. Tente novamente.')
   } finally {
     setIsLoading(false)
   }
 }

 return (
   <motion.form
     onSubmit={handleSubmit(onSubmit)}
     className="space-y-6"
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     transition={{ duration: 0.3 }}
   >
     {/* Name Field */}
     <div className="space-y-2">
       <Label htmlFor="name" className="text-white text-sm font-medium">
         Nome completo
       </Label>
       <div className="relative">
         <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
         <Input
           id="name"
           type="text"
           placeholder="Seu nome completo"
           className={`
             pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50
             focus:border-purple-400 focus:ring-purple-400/20
             ${errors.name ? 'border-red-400 focus:border-red-400' : ''}
           `}
           {...register('name')}
         />
         {!errors.name && watchedFields.name && watchedFields.name.length >= 2 && (
           <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
         )}
       </div>
       {errors.name && (
         <motion.p
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-red-400 text-sm flex items-center gap-1"
         >
           <AlertCircle className="w-3 h-3" />
           {errors.name.message}
         </motion.p>
       )}
     </div>

     {/* Email Field */}
     <div className="space-y-2">
       <Label htmlFor="email" className="text-white text-sm font-medium">
         Email
       </Label>
       <div className="relative">
         <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
         <Input
           id="email"
           type="email"
           placeholder="seu@email.com"
           className={`
             pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50
             focus:border-purple-400 focus:ring-purple-400/20
             ${errors.email ? 'border-red-400 focus:border-red-400' : ''}
           `}
           {...register('email')}
         />
         {!errors.email && watchedFields.email && (
           <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
         )}
       </div>
       {errors.email && (
         <motion.p
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-red-400 text-sm flex items-center gap-1"
         >
           <AlertCircle className="w-3 h-3" />
           {errors.email.message}
         </motion.p>
       )}
     </div>

     {/* Password Field */}
     <div className="space-y-2">
       <Label htmlFor="password" className="text-white text-sm font-medium">
         Senha
       </Label>
       <div className="relative">
         <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
         <Input
           id="password"
           type={showPassword ? 'text' : 'password'}
           placeholder="Crie uma senha forte"
           className={`
             pl-10 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/50
             focus:border-purple-400 focus:ring-purple-400/20
             ${errors.password ? 'border-red-400 focus:border-red-400' : ''}
           `}
           {...register('password')}
         />
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white hover:bg-transparent p-1"
           onClick={() => setShowPassword(!showPassword)}
         >
           {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </Button>
       </div>

       {/* Password Strength Indicator */}
       {password && (
         <motion.div
           initial={{ opacity: 0, height: 0 }}
           animate={{ opacity: 1, height: 'auto' }}
           className="space-y-2"
         >
           <div className="flex items-center justify-between">
             <span className="text-xs text-white/70">Força da senha:</span>
             <span className={`text-xs font-medium ${
               passwordStrength.score < 40 ? 'text-red-400' :
               passwordStrength.score < 60 ? 'text-orange-400' :
               passwordStrength.score < 80 ? 'text-yellow-400' :
               'text-green-400'
             }`}>
               {passwordStrength.label}
             </span>
           </div>
           <Progress 
             value={passwordStrength.score} 
             className="h-2 bg-white/20"
           />
         </motion.div>
       )}

       {errors.password && (
         <motion.p
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-red-400 text-sm flex items-center gap-1"
         >
           <AlertCircle className="w-3 h-3" />
           {errors.password.message}
         </motion.p>
       )}
     </div>

     {/* Confirm Password Field */}
     <div className="space-y-2">
       <Label htmlFor="confirmPassword" className="text-white text-sm font-medium">
         Confirmar senha
       </Label>
       <div className="relative">
         <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
         <Input
           id="confirmPassword"
           type={showConfirmPassword ? 'text' : 'password'}
           placeholder="Confirme sua senha"
           className={`
             pl-10 pr-12 bg-white/10 border-white/20 text-white placeholder:text-white/50
             focus:border-purple-400 focus:ring-purple-400/20
             ${errors.confirmPassword ? 'border-red-400 focus:border-red-400' : ''}
           `}
           {...register('confirmPassword')}
         />
         <Button
           type="button"
           variant="ghost"
           size="sm"
           className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white hover:bg-transparent p-1"
           onClick={() => setShowConfirmPassword(!showConfirmPassword)}
         >
           {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
         </Button>
         {!errors.confirmPassword && watchedFields.confirmPassword && watchedFields.password === watchedFields.confirmPassword && (
           <CheckCircle className="absolute right-10 top-1/2 transform -translate-y-1/2 text-green-400 w-4 h-4" />
         )}
       </div>
       {errors.confirmPassword && (
         <motion.p
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-red-400 text-sm flex items-center gap-1"
         >
           <AlertCircle className="w-3 h-3" />
           {errors.confirmPassword.message}
         </motion.p>
       )}
     </div>

     {/* Password Requirements */}
     <motion.div
       initial={{ opacity: 0, height: 0 }}
       animate={{ opacity: 1, height: 'auto' }}
       className="bg-white/5 rounded-lg p-4 border border-white/10"
     >
       <h4 className="text-white/80 text-sm font-medium mb-3">Requisitos da senha:</h4>
       <div className="grid grid-cols-1 gap-2 text-xs">
         <div className={`flex items-center gap-2 ${
           password && password.length >= 8 ? 'text-green-400' : 'text-white/50'
         }`}>
           <Check className="w-3 h-3" />
           Pelo menos 8 caracteres
         </div>
         <div className={`flex items-center gap-2 ${
           password && /[a-z]/.test(password) ? 'text-green-400' : 'text-white/50'
         }`}>
           <Check className="w-3 h-3" />
           Uma letra minúscula
         </div>
         <div className={`flex items-center gap-2 ${
           password && /[A-Z]/.test(password) ? 'text-green-400' : 'text-white/50'
         }`}>
           <Check className="w-3 h-3" />
           Uma letra maiúscula
         </div>
         <div className={`flex items-center gap-2 ${
           password && /\d/.test(password) ? 'text-green-400' : 'text-white/50'
         }`}>
           <Check className="w-3 h-3" />
           Um número
         </div>
         <div className={`flex items-center gap-2 ${
           password && /[@$!%*?&]/.test(password) ? 'text-green-400' : 'text-white/50'
         }`}>
           <Check className="w-3 h-3" />
           Um símbolo (@$!%*?&)
         </div>
       </div>
     </motion.div>

     {/* Success Alert */}
     {success && (
       <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <Alert className="border-green-400/50 bg-green-400/10">
           <CheckCircle className="h-4 w-4 text-green-400" />
           <AlertDescription className="text-green-400">
             {success}
           </AlertDescription>
         </Alert>
       </motion.div>
     )}

     {/* Error Alert */}
     {error && (
       <motion.div
         initial={{ opacity: 0, y: -10 }}
         animate={{ opacity: 1, y: 0 }}
       >
         <Alert className="border-red-400/50 bg-red-400/10">
           <AlertCircle className="h-4 w-4 text-red-400" />
           <AlertDescription className="text-red-400">
             {error}
           </AlertDescription>
         </Alert>
       </motion.div>
     )}

     {/* Submit Button */}
     <Button
       type="submit"
       disabled={isLoading}
       className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
     >
       {isLoading ? (
         <>
           <Loader2 className="w-4 h-4 mr-2 animate-spin" />
           Criando conta...
         </>
       ) : (
         'Criar conta'
       )}
     </Button>
   </motion.form>
 )
}