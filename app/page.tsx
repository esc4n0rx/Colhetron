"use client"

import { useAuth } from "@/contexts/AuthContext"
import LoginPage from "@/components/LoginPage"
import Dashboard from "@/components/Dashboard"
import { motion } from "framer-motion"

export default function Home() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return user ? <Dashboard /> : <LoginPage />
}
