// types/pedidos-gerados.ts
export interface PedidosGeradosItem {
    id: string
    user_id: string
    separation_id: string
    pedido: string
    remessa: string
    dados_adicionais?: string
    created_at: string
    updated_at: string
  }
  
  export interface PedidosGeradosFormData {
    pedido: string
    remessa: string
    dados_adicionais?: string
  }