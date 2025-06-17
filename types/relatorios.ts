// types/relatorios.ts
export interface SeparationReport {
  id: string
  type: 'SP' | 'ES' | 'RJ'
  date: string
  status: string
  file_name: string
  total_items: number
  total_stores: number
  created_at: string
  updated_at?: string
  user: {
    name: string
    email: string
  }
}

export interface SeparationItemReport {
  id: string
  material_code: string
  description: string
  type_separation: 'SECO' | 'FRIO' | 'ORGANICO'
  quantities: SeparationQuantityReport[]
}

export interface SeparationQuantityReport {
  store_code: string
  quantity: number
}

export interface DetailedSeparationReport extends SeparationReport {
  items: SeparationItemReport[]
}

export interface ReportFilters {
  type?: 'SP' | 'ES' | 'RJ'
  dateFrom?: string
  dateTo?: string
  status?: 'completed' | 'active'
}

export interface ReportsPaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}