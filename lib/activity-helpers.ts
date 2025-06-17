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
 * Verifica se um material foi afetado por uma atividade de reforço específica
 */
function isMaterialAffectedByReinforcement(
  activity: UserActivity,
  materialCode: string
): boolean {
  const metadata = activity.metadata

  // Verificar nos arrays de códigos de materiais processados
  const affectedCodes = [
    ...(metadata.processedMaterialCodes || []),
    ...(metadata.newMaterialCodes || []),
    ...(metadata.updatedMaterialCodes || []),
    ...(metadata.redistributedMaterialCodes || [])
  ]

  return affectedCodes.includes(materialCode)
}

/**
 * Verifica se uma loja específica foi afetada por um corte
 */
function isStoreAffectedByCut(
  activity: UserActivity,
  materialCode: string,
  storeCode: string
): boolean {
  const metadata = activity.metadata

  // Verificar se o material corresponde
  if (metadata.materialCode !== materialCode) {
    return false
  }

  // Verificar se a loja está nas operações de corte
  if (metadata.storeCodesCut && metadata.storeCodesCut.includes(storeCode)) {
    return true
  }

  // Verificar no breakdown das lojas se disponível
  if (metadata.storeBreakdown) {
    return metadata.storeBreakdown.some(breakdown => breakdown.storeCode === storeCode)
  }

  // Verificar nas operações de corte se disponível
  if (metadata.cutOperations) {
    return metadata.cutOperations.some(operation => operation.store_code === storeCode)
  }

  return false
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
      return (activity.metadata.materialCode === materialCode && 
              activity.metadata.storeCode === storeCode) ||
             activity.metadata.materialCode === materialCode
    }

    // Para cortes: verificar código do material E se a loja específica foi afetada
    if (activity.action === 'Corte de produto realizado') {
      return isStoreAffectedByCut(activity, materialCode, storeCode)
    }

    // Para reforços: verificar se o material específico foi afetado
    if (activity.action === 'Reforço carregado') {
      return isMaterialAffectedByReinforcement(activity, materialCode)
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

/**
 * Utilitário para debug - mostra quais materiais foram afetados por uma atividade
 */
export function getAffectedMaterialsByActivity(activity: UserActivity): string[] {
  const metadata = activity.metadata

  switch (activity.action) {
    case 'Alteração de produto realizado':
      return metadata.materialCode ? [metadata.materialCode] : []
    
    case 'Corte de produto realizado':
      return metadata.materialCode ? [metadata.materialCode] : []
    
    case 'Reforço carregado':
      return [
        ...(metadata.processedMaterialCodes || []),
        ...(metadata.newMaterialCodes || []),
        ...(metadata.updatedMaterialCodes || []),
        ...(metadata.redistributedMaterialCodes || [])
      ]
    
    default:
      return []
  }
}

/**
 * Utilitário para debug - mostra quais lojas foram afetadas por um corte
 */
export function getAffectedStoresByCut(activity: UserActivity): string[] {
  const metadata = activity.metadata

  if (activity.action !== 'Corte de produto realizado') {
    return []
  }

  // Priorizar storeCodesCut se disponível
  if (metadata.storeCodesCut && metadata.storeCodesCut.length > 0) {
    return metadata.storeCodesCut
  }

  // Usar storeBreakdown como fallback
  if (metadata.storeBreakdown && metadata.storeBreakdown.length > 0) {
    return metadata.storeBreakdown.map(breakdown => breakdown.storeCode)
  }

  // Usar cutOperations como último recurso
  if (metadata.cutOperations && metadata.cutOperations.length > 0) {
    return metadata.cutOperations.map(operation => operation.store_code)
  }

  return []
}

/**
 * Utilitário para debug completo - mostra informações detalhadas de uma atividade
 */
export function debugActivity(activity: UserActivity): void {
  if (process.env.NODE_ENV !== 'development') return

  console.group(`🔍 Debug Activity: ${activity.action}`)
  console.log('📋 Details:', activity.details)
  console.log('📅 Created:', activity.created_at)
  console.log('🏷️ Type:', activity.type)
  
  if (activity.action === 'Corte de produto realizado') {
    console.log('🎯 Material:', activity.metadata.materialCode)
    console.log('🏪 Lojas Afetadas:', getAffectedStoresByCut(activity))
    console.log('📊 Cut Operations:', activity.metadata.cutOperations)
  } else if (activity.action === 'Reforço carregado') {
    console.log('📦 Materiais Processados:', getAffectedMaterialsByActivity(activity))
  } else if (activity.action === 'Alteração de produto realizado') {
    console.log('🎯 Material:', activity.metadata.materialCode)
    console.log('🏪 Loja:', activity.metadata.storeCode)
  }
  
  console.log('🔧 Metadata completo:', activity.metadata)
  console.groupEnd()
}