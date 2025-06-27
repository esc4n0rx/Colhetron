"use client"

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Lock, Shield, Eye, EyeOff, Loader2, AlertCircle, 
  CheckCircle, Clock, RefreshCw, Check
} from 'lucide-react'

interface ResetPasswordFormProps {
  email: string
  onSuccess: () => void
}

export function ResetPasswordForm({ email, onSuccess }: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [timeLeft, setTimeLeft] = useState(15 * 60)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email },
    mode: 'onChange'
  })

  const password = watch('password')

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

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

  const handleResendCode = async () => {
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      if (response.ok) {
        setTimeLeft(15 * 60) 
        setError('')
      } else {
        setError('Erro ao reenviar código')
      }
    } catch (error) {
      console.error('Erro ao reenviar código:', error)
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess('Senha redefinida com sucesso!')
        setTimeout(() => {
          onSuccess()
        }, 2000)
      } else {
        setError(result.error || 'Erro ao redefinir senha')
      }
    } catch (error) {
      console.error('Erro ao redefinir senha:', error)
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 text-sm font-medium">
              Código expira em
            </span>
          </div>
          <span className={`text-sm font-mono font-bold ${
            timeLeft < 300 ? 'text-red-400' : 'text-blue-400'
          }`}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <p className="text-white/70 text-xs">
          Verifique sua caixa de entrada e spam. O código de 6 dígitos foi enviado para{' '}
          <span className="text-blue-400 font-medium">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('email')} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="code" className="text-white text-sm font-medium">
              Código de verificação
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={isLoading || timeLeft > 14 * 60}
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 text-xs p-1 h-auto"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reenviar
            </Button>
          </div>
          <Input
            id="code"
            type="text"
            placeholder="123456"
            maxLength={6}
            className={`
              text-center text-2xl font-mono tracking-wider bg-white/10 border-white/20 text-white placeholder:text-white/50
              focus:border-blue-400 focus:ring-blue-400/20
              ${errors.code ? 'border-red-400 focus:border-red-400' : ''}
            `}
            {...register('code')}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '')
              e.target.value = value
            }}
          />
          {errors.code && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-sm flex items-center gap-1"
            >
            <AlertCircle className="w-3 h-3" />
             {errors.code.message}
           </motion.p>
         )}
       </div>

       <div className="space-y-2">
         <Label htmlFor="password" className="text-white text-sm font-medium">
           Nova senha
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

       <div className="space-y-2">
         <Label htmlFor="confirmPassword" className="text-white text-sm font-medium">
           Confirmar nova senha
         </Label>
         <div className="relative">
           <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
           <Input
             id="confirmPassword"
             type={showConfirmPassword ? 'text' : 'password'}
             placeholder="Confirme sua nova senha"
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

       {password && (
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
       )}

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

       <Button
         type="submit"
         disabled={isLoading || timeLeft === 0}
         className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
       >
         {isLoading ? (
           <>
             <Loader2 className="w-4 h-4 mr-2 animate-spin" />
             Redefinindo senha...
           </>
         ) : timeLeft === 0 ? (
           'Código expirado'
         ) : (
           <>
             <Shield className="w-4 h-4 mr-2" />
             Redefinir senha
           </>
         )}
       </Button>
     </form>

     {}
     <div className="bg-green-500/10 border border-green-400/20 rounded-lg p-4">
       <div className="flex items-start gap-3">
         <Shield className="w-5 h-5 text-green-400 mt-0.5" />
         <div>
           <h4 className="text-green-400 font-medium text-sm mb-1">
             Segurança aprimorada
           </h4>
           <p className="text-white/70 text-xs leading-relaxed">
             Após redefinir sua senha, você será automaticamente conectado e todos os outros 
             dispositivos serão desconectados por segurança.
           </p>
         </div>
       </div>
     </div>
   </motion.div>
 )
}