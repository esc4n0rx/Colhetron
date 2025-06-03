"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface Separation {
  id: string
  type: "SP" | "ES" | "RJ"
  date: string
  user: string
  status: "active" | "completed"
  startTime: string
}

interface SeparationContextType {
  currentSeparation: Separation | null
  createSeparation: (data: Omit<Separation, "id" | "startTime">) => void
  completeSeparation: () => void
}

const SeparationContext = createContext<SeparationContextType | undefined>(undefined)

export function SeparationProvider({ children }: { children: React.ReactNode }) {
  const [currentSeparation, setCurrentSeparation] = useState<Separation | null>(null)

  const createSeparation = (data: Omit<Separation, "id" | "startTime">) => {
    const newSeparation: Separation = {
      ...data,
      id: Date.now().toString(),
      startTime: new Date().toLocaleTimeString(),
    }
    setCurrentSeparation(newSeparation)
  }

  const completeSeparation = () => {
    if (currentSeparation) {
      setCurrentSeparation({
        ...currentSeparation,
        status: "completed",
      })
    }
  }

  return (
    <SeparationContext.Provider value={{ currentSeparation, createSeparation, completeSeparation }}>
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
