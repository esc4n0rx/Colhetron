// hooks/useCadastroData.ts
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface LojaItem {
  id: string
  prefixo: string
  nome: string
  tipo: 'CD' | 'Loja Padrão' | 'Administrativo'
  uf: string
  centro: string // Nova propriedade
  zonaSeco: string
  subzonaSeco: string
  zonaFrio: string
  ordemSeco: number
  ordemFrio: number
}

export interface MaterialItem {
  id: string
  material: string
  descricao: string
  noturno: 'SECO' | 'FRIO'
  diurno: 'SECO' | 'FRIO'
}

export function useCadastroData() {
  const [lojas, setLojas] = useState<LojaItem[]>([])
  const [materiais, setMateriais] = useState<MaterialItem[]>([])
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

      // Buscar lojas
      const lojasResponse = await fetch('/api/cadastro/lojas', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      // Buscar materiais
      const materiaisResponse = await fetch('/api/cadastro/materiais', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!lojasResponse.ok || !materiaisResponse.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const lojasData = await lojasResponse.json()
      const materiaisData = await materiaisResponse.json()

      setLojas(lojasData.lojas || [])
      setMateriais(materiaisData.materiais || [])

    } catch (error) {
      console.error('Erro ao carregar dados de cadastro:', error)
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
    } finally {
      setIsLoading(false)
    }
  }

  const updateLoja = async (loja: Partial<LojaItem> & { id: string }) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`/api/cadastro/lojas/${loja.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loja)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar loja')
      }

      setLojas(prev => prev.map(l => l.id === loja.id ? { ...l, ...loja } : l))
      return { success: true }

    } catch (error) {
      console.error('Erro ao atualizar loja:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const createLoja = async (loja: Omit<LojaItem, 'id'>) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/cadastro/lojas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loja)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar loja')
      }

      const newLoja = await response.json()
      setLojas(prev => [...prev, newLoja])
      return { success: true }

    } catch (error) {
      console.error('Erro ao criar loja:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const updateMaterial = async (material: Partial<MaterialItem> & { id: string }) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch(`/api/cadastro/materiais/${material.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(material)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar material')
      }

      setMateriais(prev => prev.map(m => m.id === material.id ? { ...m, ...material } : m))
      return { success: true }

    } catch (error) {
      console.error('Erro ao atualizar material:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const createMaterial = async (material: Omit<MaterialItem, 'id'>) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const response = await fetch('/api/cadastro/materiais', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(material)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar material')
      }

      const newMaterial = await response.json()
      setMateriais(prev => [...prev, newMaterial])
      return { success: true }

    } catch (error) {
      console.error('Erro ao criar material:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const uploadLojas = async (file: File) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/cadastro/lojas/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro no upload')
      }

      await fetchData() // Recarregar dados
      return { success: true }

    } catch (error) {
      console.error('Erro no upload de lojas:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }
    }
  }

  const uploadMateriais = async (file: File) => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/cadastro/materiais/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro no upload')
      }

      await fetchData() // Recarregar dados
      return { success: true }

    } catch (error) {
      console.error('Erro no upload de materiais:', error)
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
    lojas,
    materiais,
    isLoading,
    error,
    updateLoja,
    updateMaterial,
    createLoja,
    createMaterial,
    uploadLojas,
    uploadMateriais,
    refetch: fetchData
  }
}