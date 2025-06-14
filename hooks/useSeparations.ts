import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Separation {
  id: string
  type: 'SP' | 'ES' | 'RJ'
  date: string
  status: string
  file_name: string
  total_items: number
  total_stores: number
  created_at: string
}

interface UploadProgress {
  stage: 'uploading' | 'processing' | 'saving' | 'completed'
  progress: number
  message: string
}

export function useSeparations() {
  const [currentSeparation, setCurrentSeparation] = useState<Separation | null>(null)
  const [allSeparations, setAllSeparations] = useState<Separation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchActiveSeparation()
    } else {
      setCurrentSeparation(null)
      setAllSeparations([])
      setIsLoading(false)
    }
  }, [user])

  const fetchActiveSeparation = async () => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) return

      const response = await fetch('/api/separations/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const { separation } = await response.json()
        setCurrentSeparation(separation)
      }
    } catch (error) {
      console.error('Erro ao buscar separação ativa:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllSeparations = async (): Promise<Separation[]> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) return []

      const response = await fetch('/api/separations/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const { separations } = await response.json()
        setAllSeparations(separations)
        return separations
      }
      return []
    } catch (error) {
      console.error('Erro ao buscar todas as separações:', error)
      return []
    }
  }

  const deleteSeparation = async (separationId: string): Promise<{ success: boolean; error?: string; fileName?: string }> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        return { success: false, error: 'Token não encontrado' }
      }

      const response = await fetch('/api/separations/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ separationId })
      })

      const result = await response.json()

      if (response.ok) {
        // Atualizar listas locais
        if (currentSeparation?.id === separationId) {
          setCurrentSeparation(null)
        }
        setAllSeparations(prev => prev.filter(sep => sep.id !== separationId))
        
        return { 
          success: true, 
          fileName: result.fileName 
        }
      } else {
        return { 
          success: false, 
          error: result.error || 'Erro ao deletar separação' 
        }
      }
    } catch (error) {
      console.error('Erro ao deletar separação:', error)
      return { 
        success: false, 
        error: 'Erro de conexão' 
      }
    }
  }

  const createSeparation = async (data: {
    type: 'SP' | 'ES' | 'RJ'
    date: string
    file: File
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = localStorage.getItem('colhetron_token')
      if (!token) {
        return { success: false, error: 'Token não encontrado' }
      }

      // Simular progresso do upload
      setUploadProgress({
        stage: 'uploading',
        progress: 0,
        message: 'Fazendo upload do arquivo...'
      })

      const formData = new FormData()
      formData.append('file', data.file)
      formData.append('type', data.type)
      formData.append('date', data.date)

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev) return null
          
          let newProgress = prev.progress + 10
          let newStage = prev.stage
          let newMessage = prev.message

          if (newProgress >= 30 && prev.stage === 'uploading') {
            newStage = 'processing'
            newMessage = 'Processando planilha Excel...'
          } else if (newProgress >= 70 && prev.stage === 'processing') {
            newStage = 'saving'
            newMessage = 'Salvando dados no sistema...'
          }

          return {
            stage: newStage,
            progress: Math.min(newProgress, 90),
            message: newMessage
          }
        })
      }, 200)

      const response = await fetch('/api/separations/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      clearInterval(progressInterval)

      const result = await response.json()

      if (response.ok) {
        setUploadProgress({
          stage: 'completed',
          progress: 100,
          message: 'Separação criada com sucesso!'
        })

        setTimeout(() => {
          setUploadProgress(null)
          fetchActiveSeparation()
        }, 1500)

        return { success: true }
      } else {
        setUploadProgress(null)
        return { success: false, error: result.error || 'Erro no upload' }
      }
    } catch (error) {
      setUploadProgress(null)
      console.error('Erro ao criar separação:', error)
      return { success: false, error: 'Erro de conexão' }
    }
  }

  return {
    currentSeparation,
    allSeparations,
    isLoading,
    uploadProgress,
    createSeparation,
    deleteSeparation,
    fetchAllSeparations,
    fetchActiveSeparation,
    refreshActiveSeparation: fetchActiveSeparation
  }
}