// lib/activity-helpers.ts
import { UserActivity, ItemActivityType, ItemActivityStatus } from '@/types/activity'

/**
 * Determina o tipo de atividade com base nos logs de atividade
 * Prioridade: Corte > Reforço > Alteração Manual > Padrão
 */
export function determineActivityType(activities: UserActivity[]): ItemActivityType {
  // Verificar se há corte (maior prioridade)
  const hasCut = activities.some(activity => 
    activity.action === 'Corte de produto realizado' &&
    activity.type === 'separation'
  )
  
  if (hasCut) return 'cut'

  // Verificar se há reforço
  const hasReinforcement = activities.some(activity => 
    activity.action === 'Reforço carregado' &&
    activity.type === 'upload'
  )
  
  if (hasReinforcement) return 'reinforcement'

  // Verificar se há alteração manual
  const hasManualChange = activities.some(activity => 
    activity.action === 'Alteração de produto realizado' &&
    activity.type === 'separation'
  )
  
  if (hasManualChange) return 'manual'

  return 'default'
}

/**
 * Retorna as classes CSS para a cor baseada no tipo de atividade
 */
export function getActivityColorClasses(activityType: ItemActivityType): string {
  switch (activityType) {
    case 'manual':
      return 'text-orange-400 font-semibold'
    case 'cut':
      return 'text-red-400 font-semibold'
    case 'reinforcement':
      return 'text-blue-400 font-semibold'
    case 'default':
    default:
      return 'text-green-400 font-semibold'
  }
}

/**
 * Filtra atividades relevantes para um item específico em uma loja específica
 */
export function filterActivitiesForItem(
  activities: UserActivity[],
  materialCode: string,
  storeCode: string,
  separationId: string
): UserActivity[] {
  return activities.filter(activity => {
    // Verificar se a atividade pertence à separação atual
    if (activity.metadata.separationId !== separationId) {
      return false
    }

    // Para alterações manuais: verificar código do material e loja
    if (activity.action === 'Alteração de produto realizado') {
      return activity.metadata.materialCode === materialCode ||
             activity.metadata.storeCode === storeCode
    }

    // Para cortes: verificar código do material
    if (activity.action === 'Corte de produto realizado') {
      return activity.metadata.materialCode === materialCode
    }

    // Para reforços: sempre incluir (afeta todos os itens)
    if (activity.action === 'Reforço carregado') {
      return true
    }

    return false
  })
}

/**
 * Cria um mapa de status de atividades para todos os itens
 */
export function createActivityStatusMap(
  activities: UserActivity[],
  items: any[],
  stores: string[],
  separationId: string
): Map<string, ItemActivityStatus> {
  const statusMap = new Map<string, ItemActivityStatus>()

  items.forEach(item => {
    stores.forEach(storeCode => {
      const key = `${item.id}-${storeCode}`
      
      const relevantActivities = filterActivitiesForItem(
        activities,
        item.codigo,
        storeCode,
        separationId
      )

      const activityType = determineActivityType(relevantActivities)
      const lastActivity = relevantActivities
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      statusMap.set(key, {
        itemId: item.id,
        storeCode,
        activityType,
        lastActivity
      })
    })
  })

  return statusMap
}