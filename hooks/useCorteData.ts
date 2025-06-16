// app/hooks/useCorteData.ts

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { 
  ProductData, 
  ProductSearchRequest, 
  ProductSearchResponse, 
  CutRequest, 
  CutResponse,
  CutModalState,
  StoreInfo
} from '@/types/corte'

interface UseCorteDataReturn {
  modalState: CutModalState
  setModalState: (state: Partial<CutModalState>) => void
  searchProducts: (request: ProductSearchRequest) => Promise<void>
  getProductDetails: (materialCode: string) => Promise<ProductData | null>
  executeCut: (request: CutRequest) => Promise<CutResponse | null>
  getStoreInfo: () => Promise<StoreInfo[]>
  resetModal: () => void
}

const initialModalState: CutModalState = {
  isOpen: false,
  selectedProduct: null,
  cutType: 'all',
  selectedStores: new Set(),
  partialCuts: new Map(),
  isLoading: false,
  searchQuery: '',
  searchResults: [],
  currentPage: 1,
  itemsPerPage: 10
}

export function useCorteData(): UseCorteDataReturn {
  const [modalState, setModalStateInternal] = useState<CutModalState>(initialModalState)

  const setModalState = useCallback((updates: Partial<CutModalState>) => {
    setModalStateInternal(prev => ({ ...prev, ...updates }))
  }, [])

  const resetModal = useCallback(() => {
    setModalStateInternal(initialModalState)
  }, [])

  /**
   * Buscar produtos por código ou descrição
   */
  const searchProducts = useCallback(async (request: ProductSearchRequest) => {
    try {
      setModalState({ isLoading: true })
      
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const queryParams = new URLSearchParams({
        query: request.query,
        type: request.type
      })

      const response = await fetch(`/api/separations/product-search?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao buscar produtos')
      }

      const data: ProductSearchResponse = await response.json()
      
      setModalState({ 
        searchResults: data.products,
        isLoading: false 
      })

    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar produtos')
      setModalState({ isLoading: false })
    }
  }, [setModalState])

  /**
   * Obter detalhes completos de um produto
   */
  const getProductDetails = useCallback(async (materialCode: string): Promise<ProductData | null> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`/api/separations/product-search?query=${materialCode}&type=code`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao obter detalhes do produto')
      }

      const data: ProductSearchResponse = await response.json()
      return data.products.length > 0 ? data.products[0] : null

    } catch (error) {
      console.error('Erro ao obter detalhes do produto:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao obter detalhes do produto')
      return null
    }
  }, [])

  /**
   * Executar corte de produto
   */
  const executeCut = useCallback(async (request: CutRequest): Promise<CutResponse | null> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/separations/product-cut', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao executar corte')
      }

      const data: CutResponse = await response.json()
      
      if (data.success) {
        toast.success(data.message)
      } else {
        toast.error(data.error || 'Erro ao executar corte')
      }

      return data

    } catch (error) {
      console.error('Erro ao executar corte:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao executar corte')
      return null
    }
  }, [])

  /**
   * Obter informações das lojas
   */
  const getStoreInfo = useCallback(async (): Promise<StoreInfo[]> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/cadastro/lojas', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar informações das lojas')
      }

      const data = await response.json()
      return data.lojas || []

    } catch (error) {
      console.error('Erro ao buscar lojas:', error)
      return []
    }
  }, [])

  return {
    modalState,
    setModalState,
    searchProducts,
    getProductDetails,
    executeCut,
    getStoreInfo,
    resetModal
  }
}