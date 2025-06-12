// components/auth/AuthPage.tsx
"use client"

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { ResetPasswordForm } from './ResetPasswordForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Shield, Users, Mail } from 'lucide-react'
import Image from 'next/image'

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password'

export default function AuthPage() {
  const [currentMode, setCurrentMode] = useState<AuthMode>('login')
  const [resetEmail, setResetEmail] = useState('')

  const handleModeChange = (mode: AuthMode) => {
    setCurrentMode(mode)
  }

  const handleForgotPasswordSuccess = (email: string) => {
    setResetEmail(email)
    setCurrentMode('reset-password')
  }

  const handleResetSuccess = () => {
    setCurrentMode('login')
    setResetEmail('')
  }

  const getTitle = () => {
    switch (currentMode) {
      case 'login':
        return 'Bem-vindo de volta'
      case 'register':
        return 'Criar nova conta'
      case 'forgot-password':
        return 'Recuperar senha'
      case 'reset-password':
        return 'Redefinir senha'
      default:
        return 'Colhetron'
    }
  }

  const getSubtitle = () => {
    switch (currentMode) {
      case 'login':
        return 'Faça login para acessar sua conta'
      case 'register':
        return 'Crie sua conta para começar'
      case 'forgot-password':
        return 'Digite seu email para receber o código de recuperação'
      case 'reset-password':
        return 'Digite o código recebido e sua nova senha'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(120,119,198,0.3),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
            <CardHeader className="text-center space-y-6 pt-8">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Shield className="w-8 h-8 text-white" />
              </motion.div>

              {/* Title */}
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold text-white">
                  {getTitle()}
                </CardTitle>
                <p className="text-white/70 text-sm">
                  {getSubtitle()}
                </p>
              </div>

              {/* Back Button */}
              <AnimatePresence>
                {currentMode !== 'login' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex justify-start"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentMode('login')}
                      className="text-white/70 hover:text-white hover:bg-white/10 p-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardHeader>

            <CardContent className="p-8 pt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMode}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentMode === 'login' && (
                    <LoginForm onForgotPassword={() => setCurrentMode('forgot-password')} />
                  )}
                  {currentMode === 'register' && (
                    <RegisterForm onSuccess={() => setCurrentMode('login')} />
                  )}
                  {currentMode === 'forgot-password' && (
                    <ForgotPasswordForm onSuccess={handleForgotPasswordSuccess} />
                  )}
                  {currentMode === 'reset-password' && (
                    <ResetPasswordForm 
                      email={resetEmail}
                      onSuccess={handleResetSuccess}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Mode Switcher */}
              <AnimatePresence>
                {currentMode === 'login' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 pt-6 border-t border-white/20"
                  >
                    <div className="text-center space-y-4">
                      <p className="text-white/70 text-sm">
                        Não tem uma conta?
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setCurrentMode('register')}
                        className="w-full bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Criar conta gratuita
                      </Button>
                    </div>
                  </motion.div>
                )}
                {currentMode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 pt-6 border-t border-white/20"
                  >
                    <div className="text-center">
                      <p className="text-white/70 text-sm mb-4">
                        Já tem uma conta?
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => setCurrentMode('login')}
                        className="text-white/70 hover:text-white hover:bg-white/10"
                      >
                        Fazer login
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-8 grid grid-cols-3 gap-4 text-center"
          >
            <div className="text-white/60">
              <Shield className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">Seguro</p>
            </div>
            <div className="text-white/60">
              <Users className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">Confiável</p>
            </div>
            <div className="text-white/60">
              <Mail className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">Suporte</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}