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

  // hooks/useMediaAnalysisData.ts - addItems corrigido
const addItems = useCallback(async (items: any[]) => {
  try {
    const token = localStorage.getItem('colhetron_token')
    if (!token) {
      throw new Error('Token de autorização não encontrado')
    }

    // CORREÇÃO: Mapear corretamente os nomes das propriedades
    const processedItems = items.map(item => {
      // Remover zeros à esquerda do código
      const codigo = String(item.codigo || '').replace(/^0+/, '') || '0'
      
      // Mapear propriedades corretamente
      const quantidadeKg = Number(item.quantidadeKg || item.quantidade_kg || 0)
      const quantidadeCaixas = Number(item.quantidadeCaixas || item.quantidade_caixas || 0)

      // Calcular média do sistema
      const mediaSistema = quantidadeCaixas > 0 ? (quantidadeKg / quantidadeCaixas) : 0

      return {
        codigo,
        material: String(item.material || ''),
        quantidade_kg: quantidadeKg,  // Nome correto para a API
        quantidade_caixas: quantidadeCaixas,  // Nome correto para a API  
        media_sistema: Number(mediaSistema.toFixed(2))
      }
    }).filter(item => 
      // Filtrar apenas itens válidos
      item.codigo && item.material && item.codigo.length > 0 && item.material.length > 0
    )

    if (processedItems.length === 0) {
      throw new Error('Nenhum item válido encontrado nos dados')
    }

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
      console.error('Erro da API:', errorData)
      throw new Error(errorData.error || 'Falha ao adicionar itens')
    }

    const result = await response.json()
    console.log('Resposta da API:', result)

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