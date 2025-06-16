// app/types/corte.ts

/**
 * Dados de um produto na separação ativa
 */
export interface ProductData {
    id: string
    material_code: string
    description: string
    total_distributed: number
    stores: ProductStoreQuantity[]
  }
  
  /**
   * Quantidade de um produto por loja
   */
  export interface ProductStoreQuantity {
    store_code: string
    quantity: number
    item_id: string
  }
  
  /**
   * Informações de uma loja
   */
  export interface StoreInfo {
    prefixo: string
    nome: string
    centro?: string
    tipo: 'CD' | 'Loja Padrão' | 'Administrativo'
    uf?: string
  }
  
  /**
   * Tipos de corte disponíveis
   */
  export type CutType = 'all' | 'specific' | 'partial'
  
  /**
   * Dados para corte de lojas específicas
   */
  export interface SpecificStoreCut {
    store_code: string
    cut_all: boolean
  }
  
  /**
   * Dados para corte parcial
   */
  export interface PartialStoreCut {
    store_code: string
    quantity_to_cut: number
    current_quantity: number
  }
  
  /**
   * Payload para execução do corte
   */
  export interface CutRequest {
    material_code: string
    cut_type: CutType
    stores?: SpecificStoreCut[]
    partial_cuts?: PartialStoreCut[]
  }
  
  /**
   * Resposta da API de corte
   */
  export interface CutResponse {
    success: boolean
    message: string
    affected_stores: number
    total_cut_quantity: number
    material_code: string
    error?: string
  }
  
  /**
   * Dados para busca de produtos
   */
  export interface ProductSearchRequest {
    query: string
    type: 'code' | 'description'
  }
  
  /**
   * Resultado da busca de produtos
   */
  export interface ProductSearchResponse {
    products: ProductData[]
    total: number
  }
  
  /**
   * Estado do modal de corte
   */
  export interface CutModalState {
    isOpen: boolean
    selectedProduct: ProductData | null
    cutType: CutType
    selectedStores: Set<string>
    partialCuts: Map<string, number>
    isLoading: boolean
    searchQuery: string
    searchResults: ProductData[]
    currentPage: number
    itemsPerPage: number
  }
  
  /**
   * Props do modal de corte
   */
  export interface CutModalProps {
    isOpen: boolean
    onClose: () => void
    onCutExecuted: () => void
  }
  
  /**
   * Dados de estatísticas do corte
   */
  export interface CutStats {
    total_stores: number
    affected_stores: number
    total_cut_quantity: number
    remaining_quantity: number
  }