// hooks/useMediaAnalysisData.ts (atualizado)
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface MediaAnalysisItem {
  id: string
  codigo: string
  material: string
  quantidadeKg: number
  quantidadeCaixas: number
  mediaSistema: number
  estoqueAtual: number
  diferencaCaixas: number
  mediaReal: number
  status: 'OK' | 'ATENÇÃO' | 'CRÍTICO'
  created_at: string
  updated_at: string
}

export function useMediaAnalysisData() {
  const [data, setData] = useState<MediaAnalysisItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch('/api/media-analysis/data', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao buscar dados de análise de médias')
      }

      const result = await response.json()
      
      // Mapear campos do banco para o formato do frontend
      const mappedData = (result.data || []).map((item: any) => ({
        id: item.id,
        codigo: item.codigo,
        material: item.material,
        quantidadeKg: item.quantidade_kg,
        quantidadeCaixas: item.quantidade_caixas,
        mediaSistema: item.media_sistema,
        estoqueAtual: item.estoque_atual,
        diferencaCaixas: item.diferenca_caixas,
        mediaReal: item.media_real,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at
      }))
      
      setData(mappedData)

    } catch (err) {
      console.error('Erro ao carregar análise de médias:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const addItems = async (items: Omit<MediaAnalysisItem, 'id' | 'mediaSistema' | 'estoqueAtual' | 'diferencaCaixas' | 'mediaReal' | 'status' | 'created_at' | 'updated_at'>[]) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/media-analysis/bulk-insert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao adicionar itens')
      }

      await fetchData() // Recarregar dados
      return { success: true }

    } catch (error) {
      console.error('Erro ao adicionar itens:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const updateItem = async (id: string, updates: Partial<MediaAnalysisItem>) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      // Mapear campos do frontend para o banco
      const mappedUpdates: any = {}
      if ('quantidadeKg' in updates) mappedUpdates.quantidade_kg = updates.quantidadeKg
      if ('quantidadeCaixas' in updates) mappedUpdates.quantidade_caixas = updates.quantidadeCaixas

      const response = await fetch(`/api/media-analysis/item/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mappedUpdates)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar item')
      }

      const updatedItem = await response.json()
      
      // Mapear resposta e atualizar localmente
      const mappedItem = {
        ...updatedItem,
        quantidadeKg: updatedItem.quantidade_kg,
        quantidadeCaixas: updatedItem.quantidade_caixas,
        mediaSistema: updatedItem.media_sistema,
        estoqueAtual: updatedItem.estoque_atual,
        diferencaCaixas: updatedItem.diferenca_caixas,
        mediaReal: updatedItem.media_real
      }

      setData(prev => prev.map(item => 
        item.id === id ? { ...item, ...mappedItem } : item
      ))

      return { success: true }

    } catch (error) {
      console.error('Erro ao atualizar item:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`/api/media-analysis/item/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao deletar item')
      }

      setData(prev => prev.filter(item => item.id !== id))
      return { success: true }

    } catch (error) {
      console.error('Erro ao deletar item:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const clearAll = async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/media-analysis/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao limpar dados')
      }

      setData([])
      return { success: true }

    } catch (error) {
      console.error('Erro ao limpar dados:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    addItems,
    updateItem,
    deleteItem,
    clearAll,
    refetch: fetchData
  }
}