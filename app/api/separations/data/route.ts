// app/api/separations/data/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Buscar separação ativa
    const { data: separation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !separation) {
      return NextResponse.json(
        { error: 'Nenhuma separação ativa encontrada' },
        { status: 404 }
      )
    }

    // Buscar dados dos itens com quantidades por loja
    // AJUSTE: Filtrar apenas itens que têm pelo menos uma quantidade > 0
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        colhetron_separation_quantities!inner (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', separation.id)
      .gt('colhetron_separation_quantities.quantity', 0)
      .order('material_code')

    if (itemsError) {
      console.error('Erro ao buscar itens:', itemsError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados da separação' },
        { status: 500 }
      )
    }

    // Filtrar itens que realmente têm quantidades > 0
    const itemsWithQuantities = items?.filter(item => 
      item.colhetron_separation_quantities && 
      item.colhetron_separation_quantities.length > 0 &&
      item.colhetron_separation_quantities.some((q: any) => q.quantity > 0)
    ) || []

    if (itemsWithQuantities.length === 0) {
      return NextResponse.json({ 
        data: [],
        stores: []
      })
    }

    // NOVO: Buscar dados dos materiais para obter o tipoSepar (diurno)
    const materialCodes = itemsWithQuantities.map(item => item.material_code)
    const { data: materialsData, error: materialsError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('material, diurno')
      .in('material', materialCodes)

    if (materialsError) {
      console.error('Erro ao buscar dados dos materiais:', materialsError)
      // Não retornar erro, apenas continuar sem o tipoSepar
    }

    // Criar mapa de material_code -> tipoSepar
    const materialTypeMap = new Map<string, string>()
    materialsData?.forEach(material => {
      materialTypeMap.set(material.material, material.diurno || 'SECO')
    })

    // Buscar todas as lojas únicas que têm quantidade > 0
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code')
      .eq('separation_id', separation.id)
      .gt('quantity', 0)

    if (storesError) {
      console.error('Erro ao buscar lojas:', storesError)
      return NextResponse.json(
        { error: 'Erro ao buscar lojas' },
        { status: 500 }
      )
    }

    // Extrair lojas únicas
    const uniqueStores = [...new Set(stores?.map(s => s.store_code) || [])].sort()

    // Formatar dados para o frontend
    const formattedData = itemsWithQuantities.map(item => {
      const quantities: { [key: string]: number } = {}
      
      // Inicializar todas as lojas com 0
      uniqueStores.forEach(store => {
        quantities[store] = 0
      })
      
      // Preencher com as quantidades reais (apenas > 0)
      item.colhetron_separation_quantities.forEach((qty: any) => {
        if (qty.quantity > 0) {
          quantities[qty.store_code] = qty.quantity
        }
      })

      return {
        id: item.id,
        tipoSepar: materialTypeMap.get(item.material_code) || 'SECO', // AJUSTE: Buscar da tabela colhetron_materiais
        calibre: "", // Campo vazio
        codigo: item.material_code,
        descricao: item.description,
        ...quantities
      }
    })

    return NextResponse.json({ 
      data: formattedData,
      stores: uniqueStores 
    })

  } catch (error) {
    console.error('Erro ao buscar dados:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}