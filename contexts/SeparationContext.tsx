"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useSeparations } from "@/hooks/useSeparations"

interface Separation {
  id: string
  type: "SP" | "ES" | "RJ"
  date: string
  status: string
  file_name: string
  total_items: number
  total_stores: number
  created_at: string
}

interface SeparationContextType {
  currentSeparation: Separation | null
  isLoading: boolean
  refreshSeparation: () => void
}

const SeparationContext = createContext<SeparationContextType | undefined>(undefined)

export function SeparationProvider({ children }: { children: React.ReactNode }) {
  const { currentSeparation, isLoading, refreshActiveSeparation } = useSeparations()

  return (
    <SeparationContext.Provider value={{ 
      currentSeparation, 
      isLoading, 
      refreshSeparation: refreshActiveSeparation 
    }}>
      {children}
    </SeparationContext.Provider>
  )
}

export function useSeparation() {
  const context = useContext(SeparationContext)
  if (context === undefined) {
    throw new Error("useSeparation must be used within a SeparationProvider")
  }
  return context
}