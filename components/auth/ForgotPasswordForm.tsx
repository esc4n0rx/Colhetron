"use client"

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Loader2, AlertCircle, CheckCircle, Send } from 'lucide-react'

interface ForgotPasswordFormProps {
  onSuccess: (email: string) => void
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange'
  })

  const watchedEmail = watch('email')

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess('Código enviado! Verifique seu email.')
        setTimeout(() => {
          onSuccess(data.email)
        }, 2000)
      } else {
        setError(result.error || 'Erro ao enviar código')
      }
    } catch (error) {
      console.error('Erro ao solicitar recuperação:', error)
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
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="text-blue-400 font-medium text-sm mb-1">
              Como funciona?
            </h4>
            <p className="text-white/70 text-xs leading-relaxed">
              Digite seu email e enviaremos um código de 6 dígitos para recuperação da senha. 
              O código expira em 15 minutos.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white text-sm font-medium">
            Email da conta
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <Input
              id="email"
              type="email"
              placeholder="Digite seu email cadastrado"
              className={`
                pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50
                focus:border-blue-400 focus:ring-blue-400/20
                ${errors.email ? 'border-red-400 focus:border-red-400' : ''}
              `}
              {...register('email')}
            />
            {!errors.email && watchedEmail && (
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
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando código...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar código
            </>
          )}
        </Button>
      </form>

      <div className="bg-yellow-500/10 border border-yellow-400/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <h4 className="text-yellow-400 font-medium text-sm mb-1">
              Dica de segurança
            </h4>
            <p className="text-white/70 text-xs leading-relaxed">
              Se você não tem mais acesso ao email cadastrado, entre em contato com o suporte.
              Nunca compartilhe códigos de recuperação com terceiros.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}