// types/pos-faturamento.ts
export interface PosFaturamentoItem {
    id: string
    user_id: string
    separation_id: string
    codigo: string
    material: string
    quantidade_kg: number
    quantidade_caixas: number
    estoque_atual: number
    diferenca: number
    status: 'OK' | 'Divergente' | 'novo'
    created_at: string
    updated_at: string
  }
  
  export interface PosFaturamentoComparacao {
    codigo: string
    material: string
    quantidade_kg: number
    quantidade_caixas_antes: number
    quantidade_caixas_atual: number
    estoque_atual: number
    diferenca: number
    status: 'OK' | 'Divergente' | 'novo'
  }
  
  export interface PosFaturamentoFormData {
    codigo: string
    material: string
    quantidade_kg: number
    quantidade_caixas: number
    estoque_atual: number
  }