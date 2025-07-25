// hooks/usePedidosData.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserActivity, ItemActivityStatus } from '@/types/activity'
import { createActivityStatusMap } from '@/lib/activity-helpers'

interface PedidoItem {
  id: string
  tipoSepar: string
  calibre: string
  codigo: string
  descricao: string
  [key: string]: string | number
}

interface UploadReforcoResponse {
  success: boolean
  message?: string
  error?: string
  processedItems?: number
  updatedItems?: number
  newItems?: number
}

interface UploadRedistribuicaoResponse {
  success: boolean
  message?: string
  error?: string
  processedItems?: number
  updatedItems?: number
  newItems?: number
  redistributedItems?: number
}

interface UploadMelanciaResponse {
  success: boolean
  message?: string
  error?: string
  processedStores?: number
  updatedStores?: number
  notFoundStores?: string[]
  totalKgProcessed?: number
}

export function usePedidosData() {
  const [pedidos, setPedidos] = useState<PedidoItem[]>([])
  const [lojas, setLojas] = useState<string[]>([])
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSeparationId, setActiveSeparationId] = useState<string | null>(null)
  const { user } = useAuth()

  const activityStatusMap = createActivityStatusMap(activities, pedidos, lojas, activeSeparationId ?? '')

  const fetchData = async () => {
    if (!user) return

    try {
      setIsLoading(true)
      setError(null)

      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        setError('Token não encontrado')
        return
      }

      const response = await fetch('/api/separations/data', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar dados')
      }

      const { data, stores, separationId } = await response.json()
      setPedidos(data)
      setLojas(stores)
      setActiveSeparationId(separationId)

      const activitiesResponse = await fetch('/api/activities', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json()
        setActivities(activitiesData.activities || [])
      }

    } catch (error) {
      console.error('Erro ao carregar pedidos:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, storeCode: string, quantity: number) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/separations/update-quantity', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId, storeCode, quantity })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar quantidade')
      }

      setPedidos(prev => prev.map(pedido => 
        pedido.id === itemId 
          ? { ...pedido, [storeCode]: quantity }
          : pedido
      ))

      return { success: true }

    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const updateItemType = async (itemId: string, typeSeparation: string) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/separations/update-type', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemId, typeSeparation })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar tipo de separação')
      }

      // Atualizar dados localmente
      setPedidos(prev => prev.map(pedido => 
        pedido.id === itemId 
          ? { ...pedido, tipoSepar: typeSeparation }
          : pedido
      ))

      return { success: true }

    } catch (error) {
      console.error('Erro ao atualizar tipo de separação:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])


  const uploadReforco = async (file: File): Promise<UploadReforcoResponse> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/separations/upload-reforco', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar reforço')
      }

      const result = await response.json()

      await fetchData()

      return {
        success: true,
        message: result.message,
        processedItems: result.processedItems,
        updatedItems: result.updatedItems,
        newItems: result.newItems
      }

    } catch (error) {
      console.error('Erro ao carregar reforço:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  const uploadRedistribuicao = async (file: File): Promise<UploadRedistribuicaoResponse> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/separations/upload-redistribuicao', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar redistribuição')
      }

      const result = await response.json()

      await fetchData()

      return {
        success: true,
        message: result.message,
        processedItems: result.processedItems,
        updatedItems: result.updatedItems,
        newItems: result.newItems,
        redistributedItems: result.redistributedItems
      }

    } catch (error) {
      console.error('Erro ao carregar redistribuição:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  const uploadMelancia = async (file: File, materialCode: string): Promise<UploadMelanciaResponse> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('materialCode', materialCode)

      const response = await fetch('/api/separations/upload-melancia', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao carregar separação de melancia')
      }

      const result = await response.json()

      await fetchData()

      return {
        success: true,
        message: result.message,
        processedStores: result.processedStores,
        updatedStores: result.updatedStores,
        notFoundStores: result.notFoundStores,
        totalKgProcessed: result.totalKgProcessed
      }

    } catch (error) {
      console.error('Erro ao carregar separação de melancia:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  const getItemActivityStatus = (itemId: string, storeCode: string): ItemActivityStatus | null => {
    return activityStatusMap.get(`${itemId}-${storeCode}`) || null
  }

  useEffect(() => {
    fetchData()
  }, [user])

  return {
    pedidos,
    lojas,
    isLoading,
    error,
    updateQuantity,
    updateItemType,
    uploadReforco,
    uploadRedistribuicao, // Nova função exportada
    uploadMelancia,
    getItemActivityStatus,
    activeSeparationId,
    refetch: fetchData
  }
}