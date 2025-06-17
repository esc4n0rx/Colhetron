// hooks/useMediaAnalysisData.ts
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
  forcedStatus?: boolean
  forcedReason?: string
  forcedAt?: string
  customMedia?: boolean 
  customMediaValue?: number 
  customMediaUpdatedAt?: string
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
        forcedStatus: item.forced_status || false,
        forcedReason: item.forced_reason,
        forcedAt: item.forced_at,
        customMedia: item.custom_media || false,
        customMediaValue: item.custom_media_value,
        customMediaUpdatedAt: item.custom_media_updated_at,
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

  const addItems = useCallback(async (items: any[]) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      // Processar itens conforme nova lógica
      const processedItems = items.map(item => {
        // Remover zeros à esquerda do código
        const codigo = String(item.codigo || '').replace(/^0+/, '') || '0'
        
        const quantidadeKg = Number(item.quantidadeKg || item.quantidade_kg || 0)
        const quantidadeCaixas = Number(item.quantidadeCaixas || item.quantidade_caixas || 0)

        // Calcular média do sistema (mantendo valor original)
        const mediaSistema = quantidadeCaixas > 0 ? quantidadeKg / quantidadeCaixas : 0

        return {
          codigo,
          material: String(item.material || ''),
          quantidade_kg: quantidadeKg,
          quantidade_caixas: quantidadeCaixas,
          media_sistema: mediaSistema
        }
      })

      console.log('Enviando itens processados:', processedItems)

      const response = await fetch('/api/media-analysis/bulk-add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ items: processedItems }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao adicionar itens')
      }

      const result = await response.json()
      
      // Recarregar dados após adicionar
      await fetchData()
      
      return result

    } catch (err) {
      console.error('Erro ao adicionar itens:', err)
      throw err
    }
  }, [fetchData])

  const updateItem = useCallback(async (id: string, updates: Partial<MediaAnalysisItem>) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch(`/api/media-analysis/item/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao atualizar item')
      }

      const updatedItem = await response.json()
      
      // Atualizar item específico no estado local
      setData(prevData => 
        prevData.map(item => 
          item.id === id ? {
            ...item,
            ...updates,
            updated_at: updatedItem.updated_at
          } : item
        )
      )
      
      return updatedItem

    } catch (err) {
      console.error('Erro ao atualizar item:', err)
      throw err
    }
  }, [])

  const forceStatusOK = useCallback(async (itemId: string, reason?: string) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch('/api/media-analysis/force-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          item_id: itemId,
          reason: reason 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao forçar status')
      }

      const result = await response.json()
      
      // Atualizar item específico no estado local
      setData(prevData => 
        prevData.map(item => 
          item.id === itemId ? {
            ...item,
            status: 'OK' as const,
            forcedStatus: true,
            forcedReason: reason,
            forcedAt: new Date().toISOString(),
            updated_at: result.item.updated_at
          } : item
        )
      )
      
      return result

    } catch (err) {
      console.error('Erro ao forçar status:', err)
      throw err
    }
  }, [])

  const deleteItem = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch(`/api/media-analysis/item/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao deletar item')
      }

      // Remover item do estado local
      setData(prevData => prevData.filter(item => item.id !== id))

    } catch (err) {
      console.error('Erro ao deletar item:', err)
      throw err
    }
  }, [])

  const clearAllData = useCallback(async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch('/api/media-analysis/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao limpar dados')
      }

      setData([])

    } catch (err) {
      console.error('Erro ao limpar dados:', err)
      throw err
    }
  }, [])

  const updateCustomMedia = useCallback(async (itemId: string, customMedia: number) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch('/api/media-analysis/update-custom-media', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          item_id: itemId,
          custom_media: customMedia 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao atualizar média personalizada')
      }

      const result = await response.json()
      
      setData(prevData => 
        prevData.map(item => 
          item.id === itemId ? {
            ...item,
            mediaSistema: customMedia,
            customMedia: true,
            customMediaValue: customMedia,
            customMediaUpdatedAt: new Date().toISOString(),
            status: result.item.status,
            mediaReal: result.item.media_real,
            diferencaCaixas: result.item.diferenca_caixas,
            updated_at: result.item.updated_at
          } : item
        )
      )
      
      return result

    } catch (err) {
      console.error('Erro ao atualizar média personalizada:', err)
      throw err
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  

  return {
    data,
    isLoading,
    error,
    fetchData,
    addItems,
    updateItem,
    updateCustomMedia,
    forceStatusOK,
    deleteItem,
    clearAllData,
  }
}