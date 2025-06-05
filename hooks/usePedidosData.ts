// hooks/usePedidosData.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface PedidoItem {
  id: string
  tipoSepar: string
  calibre: string
  codigo: string
  descricao: string
  [key: string]: string | number // Para as colunas das lojas
}

export function usePedidosData() {
  const [pedidos, setPedidos] = useState<PedidoItem[]>([])
  const [lojas, setLojas] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

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

      const { data, stores } = await response.json()
      setPedidos(data)
      setLojas(stores)

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

      // Atualizar dados localmente
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

  useEffect(() => {
    fetchData()
  }, [user])

  return {
    pedidos,
    lojas,
    isLoading,
    error,
    updateQuantity,
    refetch: fetchData
  }
}