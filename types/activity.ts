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
  
  // Campos específicos para reforço
  processedMaterialCodes?: string[]
  newMaterialCodes?: string[]
  updatedMaterialCodes?: string[]
  redistributedMaterialCodes?: string[]
  
  // Campos específicos para corte
  separationType?: string
  separationDate?: string
  separationFileName?: string
  materialDescription?: string
  materialRowNumber?: number
  materialTypeSeparation?: string
  storeCodesCut?: string[]
  completeCuts?: number
  partialCuts?: number
  cutOperations?: Array<{
    store_code: string
    previous_quantity: number
    new_quantity: number
    cut_quantity: number
    operation_type: string
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