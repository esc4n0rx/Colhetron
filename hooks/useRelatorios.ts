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
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters?.type) params.append('type', filters.type)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.append('dateTo', filters.dateTo)

      const url = `/api/relatorios/separations?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro HTTP ${response.status}`)
      }

      const data = await response.json()
      setSeparations(data.separations || [])
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error(`Erro ao buscar relatórios: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSeparationDetails = async (id: string) => {
    setIsLoadingDetails(true)
    setError(null)

    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) throw new Error('Token não encontrado')

      const url = `/api/relatorios/separations/${id}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Erro HTTP ${response.status}`)
      }

      const data = await response.json()
      setSelectedSeparation(data)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setError(errorMessage)
      toast.error(`Erro ao buscar detalhes: ${errorMessage}`)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const clearSelection = () => {
    setSelectedSeparation(null)
  }

  useEffect(() => {
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