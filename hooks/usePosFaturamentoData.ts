// hooks/usePosFaturamentoData.ts
"use client"

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { PosFaturamentoItem, PosFaturamentoFormData, PosFaturamentoComparacao } from '@/types/pos-faturamento'

export interface UsePosFaturamentoDataReturn {
  data: PosFaturamentoComparacao[]
  isLoading: boolean
  error: string | null
  separationInfo: { id: string; isActive: boolean; status: string } | null
  canAddItems: boolean
  addItems: (items: PosFaturamentoFormData[]) => Promise<{ success: boolean; error?: string }>
  refresh: () => Promise<void>
  clearData: () => Promise<{ success: boolean; error?: string }>
}

export const usePosFaturamentoData = (): UsePosFaturamentoDataReturn => {
  const [data, setData] = useState<PosFaturamentoComparacao[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [separationInfo, setSeparationInfo] = useState<{ id: string; isActive: boolean; status: string } | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/pos-faturamento', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const result = await response.json()
      setData(result.data || [])
      setSeparationInfo(result.separationInfo || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addItems = useCallback(async (items: PosFaturamentoFormData[]) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/pos-faturamento', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ items })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao adicionar itens')
      }

      await fetchData()
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      }
    }
  }, [fetchData])

  const clearData = useCallback(async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/pos-faturamento', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao limpar dados')
      }

      await fetchData()
      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      }
    }
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const canAddItems = separationInfo?.isActive || false

  return {
    data,
    isLoading,
    error,
    separationInfo,
    canAddItems,
    addItems,
    refresh: fetchData,
    clearData
  }
}