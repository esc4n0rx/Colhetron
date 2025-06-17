// types/activity.ts
export interface ActivityMetadata {
  separationId?: string
  materialCode?: string
  storeCode?: string
  quantity?: number
  cutType?: string
  totalCutQuantity?: number
  affectedStores?: number
  processedItems?: number
  updatedItems?: number
  newItems?: number
  redistributedItems?: number
  separationItemId?: string
  fileName?: string
  reason?: string
  date?: string
  
  // Novos campos para rastreamento específico de materiais no reforço
  processedMaterialCodes?: string[]
  newMaterialCodes?: string[]
  updatedMaterialCodes?: string[]
  redistributedMaterialCodes?: string[]
  
  // Campos adicionais para cortes
  storeCodesCut?: string[]
  completeCuts?: number
  partialCuts?: number
  cutOperations?: Array<{
    storeCode: string
    before: number
    after: number
    cut: number
    type: string
  }>
  quantityDetails?: {
    beforeCut: number
    afterCut: number
    totalCut: number
  }
  storeBreakdown?: Array<{
    storeCode: string
    before: number
    after: number
    cut: number
    type: string
  }>
  timestamp?: string
}

export interface UserActivity {
  id: string
  user_id: string
  action: string
  details: string
  type: 'upload' | 'login' | 'separation' | 'media_analysis' | 'profile_update' | 'settings_change' | 'update'
  metadata: ActivityMetadata
  created_at: string
}

export type ItemActivityType = 'manual' | 'cut' | 'reinforcement' | 'default'

export interface ItemActivityStatus {
  itemId: string
  storeCode: string
  activityType: ItemActivityType
  lastActivity?: UserActivity
}