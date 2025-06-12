// components/ui/loading.tsx
"use client"

import { motion } from "framer-motion"
import { Loader2, Shield } from "lucide-react"

interface LoadingProps {
  title?: string
  subtitle?: string
  type?: 'auth' | 'redirect' | 'general'
}

export function Loading({ 
  title = "Colhetron", 
  subtitle = "Carregando...", 
  type = 'general' 
}: LoadingProps) {
  const getIcon = () => {
    switch (type) {
      case 'auth':
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-3 border-white border-t-transparent rounded-full"
          />
        )
      case 'redirect':
        return (
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut", repeat: Infinity }}
            className="w-10 h-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        )
      default:
        return <Shield className="w-10 h-10 text-white" />
    }
  }

  const getGradient = () => {
    switch (type) {
      case 'redirect':
        return 'from-green-500 to-emerald-500'
      default:
        return 'from-purple-500 to-pink-500'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(120,119,198,0.3),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`w-20 h-20 bg-gradient-to-r ${getGradient()} rounded-2xl flex items-center justify-center shadow-2xl`}
        >
          {getIcon()}
        </motion.div>

        {/* Texto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-center space-y-2"
        >
          <h2 className="text-white text-xl font-semibold">{title}</h2>
          <p className="text-white/70 text-sm">{subtitle}</p>
        </motion.div>

        {/* Loading indicator adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex items-center space-x-2 text-white/60"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Aguarde...</span>
        </motion.div>

        {/* Progress bar para redirect */}
        {type === 'redirect' && (
          <motion.div
            className="w-48 h-1 bg-white/20 rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
            />
          </motion.div>
        )}
      </div>
    </div>
  )
}