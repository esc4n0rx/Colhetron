// lib/activity-logger.ts
import { supabaseAdmin } from '@/lib/supabase'

export interface ActivityLogData {
  userId: string
  action: string
  details?: string
  type?: 'upload' | 'login' | 'separation' | 'media_analysis' | 'profile_update' | 'settings_change'| 'update'
  metadata?: Record<string, any>
}

export async function logActivity(data: ActivityLogData): Promise<void> {
  try {
    await supabaseAdmin
      .from('colhetron_user_activities')
      .insert([{
        user_id: data.userId,
        action: data.action,
        details: data.details || '',
        type: data.type || 'info',
        metadata: data.metadata || {},
        created_at: new Date().toISOString()
      }])

  } catch (error) {
    console.error('Erro ao registrar atividade:', error)
    // Não falhar a operação principal por erro de log
  }
}

// Função para integrar com as APIs existentes
export function withActivityLog<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  getActivityData: (...args: T) => ActivityLogData
) {
  return async (...args: T): Promise<R> => {
    const result = await fn(...args)
    
    // Registrar atividade apenas se a operação foi bem-sucedida
    try {
      const activityData = getActivityData(...args)
      await logActivity(activityData)
    } catch (error) {
      console.error('Erro ao registrar atividade:', error)
    }
    
    return result
  }
}