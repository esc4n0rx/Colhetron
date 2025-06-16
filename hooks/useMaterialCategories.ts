// hooks/useMaterialCategories.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface MaterialCategory {
  value: string
  label: string
}

export function useMaterialCategories() {
  const [categories, setCategories] = useState<MaterialCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchCategories = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const response = await fetch('/api/materials/distinct-categories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar categorias')
      }

      const data = await response.json()
      
      // Converter string array em MaterialCategory array
      const categoryOptions = data.categories.map((cat: string) => ({
        value: cat,
        label: cat
      }))

      setCategories(categoryOptions)

    } catch (error) {
      console.error('Erro ao carregar categorias:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const refreshCategories = useCallback(() => {
    fetchCategories()
  }, [fetchCategories])

  return {
    categories,
    isLoading,
    error,
    refreshCategories
  }
}