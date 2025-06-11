// hooks/useSeparacaoData.ts
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface SeparacaoItem {
  id: string
  material: string
  tipoSepar: string
  [key: string]: string | number // Para as colunas das lojas dinâmicas
}

export interface LojaOrdenada {
  prefixo: string
  nome: string
  zonaSeco: string
  subzonaSeco: string
  zonaFrio: string
  ordemSeco: number
  ordemFrio: number
}

export function useSeparacaoData() {
  const [data, setData] = useState<SeparacaoItem[]>([])
  const [lojas, setLojas] = useState<LojaOrdenada[]>([])
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

      const response = await fetch('/api/separations/separation-data', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao buscar dados de separação')
      }

      const result = await response.json()
      setData(result.data || [])
      setLojas(result.lojas || [])

    } catch (err) {
      console.error('Erro ao carregar dados de separação:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Função para ordenar lojas por zona e ordem
  const getOrderedStores = useCallback((tipoSeparacao: string) => {
    return lojas
      .filter(loja => {
        // Filtrar lojas que têm zona definida para o tipo de separação
        const zona = tipoSeparacao === 'FRIO' ? loja.zonaFrio : loja.zonaSeco
        return zona && zona.trim() !== ''
      })
      .sort((a, b) => {
        const ordemA = tipoSeparacao === 'FRIO' ? a.ordemFrio : a.ordemSeco
        const ordemB = tipoSeparacao === 'FRIO' ? b.ordemFrio : b.ordemSeco
        
        // Lojas com ordem 0 ou undefined vão para o final
        if (!ordemA && !ordemB) return a.prefixo.localeCompare(b.prefixo)
        if (!ordemA) return 1
        if (!ordemB) return -1
        
        return ordemA - ordemB
      })
  }, [lojas])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    lojas,
    isLoading,
    error,
    getOrderedStores,
    refetch: fetchData
  }
}