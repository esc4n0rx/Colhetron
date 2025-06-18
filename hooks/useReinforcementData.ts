// hooks/useReinforcementData.ts
import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface LojaOrdenada {
  prefixo: string;
  nome: string;
  zonaSeco: string;
  subzonaSeco: string;
  zonaFrio: string;
  ordemSeco: number;
  ordemFrio: number;
}

export interface ReinforcementItem {
  id: string;
  material: string;
  tipoSepar: string;
  [key: string]: string | number;
}

export function useReinforcementData() {
  const [items, setItems] = useState<ReinforcementItem[]>([])
  const [lojas, setLojas] = useState<string[]>([])
  const [allStoreInfo, setAllStoreInfo] = useState<LojaOrdenada[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  // Função para buscar os dados do último reforço
  const fetchLastReinforcement = useCallback(async (separationId: string) => {
    if (!user) return

    setIsLoading(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token de autorização não encontrado')

      // 1. Buscar dados do reforço
      const reinforcementResponse = await fetch(`/api/separations/last-reinforcement?separationId=${separationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!reinforcementResponse.ok) {
        const errorData = await reinforcementResponse.json()
        throw new Error(errorData.error || 'Falha ao buscar dados do reforço')
      }
      
      const reinforcementData = await reinforcementResponse.json()
      
      // 2. Buscar todas as lojas para ordenação
      const lojasResponse = await fetch('/api/cadastro/lojas', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!lojasResponse.ok) {
        throw new Error('Erro ao buscar dados das lojas para ordenação')
      }

      const lojasData = await lojasResponse.json()
      setAllStoreInfo(lojasData.lojas || [])

      // 3. Processar e formatar os dados do reforço
      const formattedItems: ReinforcementItem[] = []
      const materialMap = new Map<string, ReinforcementItem>()
      
      const materials = reinforcementData.materials || []
      const quantities = reinforcementData.quantities || []

      materials.forEach((mat: any, index: number) => {
        const item: ReinforcementItem = {
          id: mat.code,
          material: mat.description,
          tipoSepar: 'REFORÇO', // Categoria fixa para reforço
          codigo: mat.code,
          descricao: mat.description
        }
        materialMap.set(index.toString(), item)
      })

      quantities.forEach((qty: any) => {
        const item = materialMap.get(qty.materialIndex.toString())
        if (item) {
          item[qty.storeCode] = qty.quantity
        }
      })

      setItems(Array.from(materialMap.values()))
      setLojas(reinforcementData.stores || [])

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const getOrderedStores = useCallback((tipoSeparacao: string): LojaOrdenada[] => {
    return allStoreInfo
      .filter(loja => lojas.includes(loja.prefixo))
      .sort((a, b) => {
        const ordemA = tipoSeparacao === 'FRIO' ? a.ordemFrio : a.ordemSeco
        const ordemB = tipoSeparacao === 'FRIO' ? b.ordemFrio : b.ordemSeco
        
        if (!ordemA && !ordemB) return a.prefixo.localeCompare(b.prefixo)
        if (!ordemA) return 1
        if (!ordemB) return -1
        
        return ordemA - ordemB
      })
  }, [lojas, allStoreInfo])

  return {
    items,
    lojas,
    isLoading,
    error,
    fetchLastReinforcement,
    getOrderedStores
  }
}