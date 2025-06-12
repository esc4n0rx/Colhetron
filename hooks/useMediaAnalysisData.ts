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

  const addItems = useCallback(async (items: any[]) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      // Processar itens e calcular valores automaticamente
      const processedItems = items.map(item => {
        // Remover zeros à esquerda do código
        const codigo = item.codigo.replace(/^0+/, '') || '0'
        
        // Se quantidade de caixas não foi fornecida ou é zero, calcular
        let quantidadeCaixas = item.quantidadeCaixas || 0
        if (quantidadeCaixas === 0 && item.quantidadeKg > 0) {
          quantidadeCaixas = 1 // Assume 1 caixa se não especificado
        }

        // Calcular média do sistema
        const mediaSistema = quantidadeCaixas > 0 ? (item.quantidadeKg / quantidadeCaixas) : 0

        return {
          codigo,
          material: item.material,
          quantidade_kg: item.quantidadeKg,
          quantidade_caixas: quantidadeCaixas,
          media_sistema: mediaSistema
        }
      })

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

      // Recarregar dados após adicionar
      await fetchData()
      
      return { success: true }
    } catch (err) {
      console.error('Erro ao adicionar itens:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      }
    }
  }, [fetchData])

  const clearAll = useCallback(async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token de autorização não encontrado')
      }

      const response = await fetch('/api/media-analysis/clear', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao limpar dados')
      }

      setData([])
      return { success: true }
    } catch (err) {
      console.error('Erro ao limpar dados:', err)
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Erro desconhecido' 
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    addItems,
    clearAll,
    refetch: fetchData
  }
}