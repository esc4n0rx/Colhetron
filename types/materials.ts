// types/materials.ts
export interface MaterialItem {
  id: string
  material: string
  descricao: string
  category: string  // Campo unificado para categoria
  noturno?: string  // Manter para compatibilidade
  diurno?: string   // Manter para compatibilidade
}

export interface MaterialFormData {
  material: string
  descricao: string
  category: string
}

export interface MaterialCategory {
  value: string
  label: string
  count: number
}

export interface DistinctCategoriesResponse {
  categories: string[]
}