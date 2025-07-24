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
  codigo: string;
  descricao: string;
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
      
      console.log('Dados recebidos:', reinforcementData)

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
      
      const materials = reinforcementData.materials || []
      const quantities = reinforcementData.quantities || []
      const stores = reinforcementData.stores || []

      console.log('Processando:', { materialsCount: materials.length, quantitiesCount: quantities.length, storesCount: stores.length })

      // AJUSTE: Criar mapa de itens baseado no uniqueKey
      const itemsMap = new Map<string, ReinforcementItem>()

      // Primeiro, criar todos os itens baseados nos materiais
      materials.forEach((material: any, materialIndex: number) => {
        const item: ReinforcementItem = {
          id: material.uniqueKey || `${material.code}_${materialIndex}`,
          material: `${material.code} - ${material.description}`,
          tipoSepar: 'REFORÇO',
          codigo: material.code,
          descricao: material.description
        }

        // Inicializar todas as lojas com 0
        stores.forEach((store: string) => {
          item[store] = 0
        })

        itemsMap.set(materialIndex.toString(), item)
      })

      // Em seguida, aplicar as quantidades
      quantities.forEach((qty: any) => {
        const item = itemsMap.get(qty.materialIndex.toString())
        if (item && qty.quantity > 0) {
          item[qty.storeCode] = qty.quantity
        }
      })

      const finalItems = Array.from(itemsMap.values())
      
      console.log('Itens processados:', {
        count: finalItems.length,
        sample: finalItems[0] // Log do primeiro item para debug
      })

      setItems(finalItems)
      setLojas(stores)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido'
      console.error('Erro no fetchLastReinforcement:', err)
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