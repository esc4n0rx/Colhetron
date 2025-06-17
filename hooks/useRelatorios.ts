// hooks/useRelatorios.ts
import { useState, useEffect } from 'react'
import { SeparationReport, DetailedSeparationReport, ReportFilters, ReportsPaginationData } from '@/types/relatorios'
import { toast } from 'sonner'

interface UseRelatoriosReturn {
  separations: SeparationReport[]
  selectedSeparation: DetailedSeparationReport | null
  pagination: ReportsPaginationData
  isLoading: boolean
  isLoadingDetails: boolean
  error: string | null
  fetchSeparations: (filters?: ReportFilters, page?: number) => Promise<void>
  fetchSeparationDetails: (id: string) => Promise<void>
  clearSelection: () => void
}

export function useRelatorios(): UseRelatoriosReturn {
  const [separations, setSeparations] = useState<SeparationReport[]>([])
  const [selectedSeparation, setSelectedSeparation] = useState<DetailedSeparationReport | null>(null)
  const [pagination, setPagination] = useState<ReportsPaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSeparations = async (filters?: ReportFilters, page: number = 1) => {
    console.log('🔄 [HOOK RELATÓRIOS] Iniciando fetchSeparations:', { filters, page })
    
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        console.log('❌ [HOOK RELATÓRIOS] Token não encontrado no localStorage')
        throw new Error('Token não encontrado')
      }

      console.log('✅ [HOOK RELATÓRIOS] Token encontrado:', token.substring(0, 20) + '...')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      console.log('📋 [HOOK RELATÓRIOS] Parâmetros base:', Object.fromEntries(params.entries()))

      if (filters?.type) {
        params.append('type', filters.type)
        console.log('🏷️ [HOOK RELATÓRIOS] Adicionando filtro type:', filters.type)
      }
      if (filters?.status) {
        params.append('status', filters.status)
        console.log('📊 [HOOK RELATÓRIOS] Adicionando filtro status:', filters.status)
      }
      if (filters?.dateFrom) {
        params.append('dateFrom', filters.dateFrom)
        console.log('📅 [HOOK RELATÓRIOS] Adicionando filtro dateFrom:', filters.dateFrom)
      }
      if (filters?.dateTo) {
        params.append('dateTo', filters.dateTo)
        console.log('📅 [HOOK RELATÓRIOS] Adicionando filtro dateTo:', filters.dateTo)
      }

      const url = `/api/relatorios/separations?${params.toString()}`
      console.log('🌐 [HOOK RELATÓRIOS] URL final:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 [HOOK RELATÓRIOS] Response status:', response.status)
      console.log('📡 [HOOK RELATÓRIOS] Response ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [HOOK RELATÓRIOS] Erro na resposta:', errorData)
        throw new Error(errorData.error || `Erro HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [HOOK RELATÓRIOS] Dados recebidos:', {
        separationsCount: data.separations?.length || 0,
        pagination: data.pagination
      })

      setSeparations(data.separations || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })

    } catch (error) {
      console.error('💥 [HOOK RELATÓRIOS] Erro no fetch:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error(`Erro ao buscar relatórios: ${errorMessage}`)
    } finally {
      setIsLoading(false)
      console.log('🏁 [HOOK RELATÓRIOS] fetchSeparations finalizado')
    }
  }

  const fetchSeparationDetails = async (id: string) => {
    console.log('🔍 [HOOK RELATÓRIOS] Buscando detalhes da separação:', id)
    
    setIsLoadingDetails(true)
    setError(null)

    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        console.log('❌ [HOOK RELATÓRIOS] Token não encontrado para detalhes')
        throw new Error('Token não encontrado')
      }

      const url = `/api/relatorios/separations/${id}`
      console.log('🌐 [HOOK RELATÓRIOS] URL detalhes:', url)

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 [HOOK RELATÓRIOS] Response detalhes status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [HOOK RELATÓRIOS] Erro nos detalhes:', errorData)
        throw new Error(errorData.error || `Erro HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ [HOOK RELATÓRIOS] Detalhes recebidos:', {
        separationId: data.id,
        itemsCount: data.items?.length || 0
      })

      setSelectedSeparation(data)

    } catch (error) {
      console.error('💥 [HOOK RELATÓRIOS] Erro nos detalhes:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error(`Erro ao buscar detalhes: ${errorMessage}`)
    } finally {
      setIsLoadingDetails(false)
      console.log('🏁 [HOOK RELATÓRIOS] fetchSeparationDetails finalizado')
    }
  }

  const clearSelection = () => {
    console.log('🧹 [HOOK RELATÓRIOS] Limpando seleção')
    setSelectedSeparation(null)
  }

  useEffect(() => {
    console.log('🚀 [HOOK RELATÓRIOS] useEffect inicial - carregando separações')
    fetchSeparations()
  }, [])

  return {
    separations,
    selectedSeparation,
    pagination,
    isLoading,
    isLoadingDetails,
    error,
    fetchSeparations,
    fetchSeparationDetails,
    clearSelection
  }
}