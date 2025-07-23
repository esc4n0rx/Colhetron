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

    // Buscar dados dos itens com quantidades por loja e tipo de separação
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        type_separation,
        colhetron_separation_quantities (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', separation.id)
      .order('material_code')

    if (itemsError) {
      console.error('Erro ao buscar itens:', itemsError)
      return NextResponse.json(
        { error: 'Erro ao buscar dados da separação' },
        { status: 500 }
      )
    }

    // Buscar todas as lojas únicas
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code')
      .in('item_id', items.map(item => item.id))

    if (storesError) {
      console.error('Erro ao buscar lojas:', storesError)
      return NextResponse.json(
        { error: 'Erro ao buscar lojas' },
        { status: 500 }
      )
    }

    // Obter lojas únicas e ordenadas
    const uniqueStores = [...new Set(stores.map(s => s.store_code))].sort()

    // Transformar dados para o formato esperado pelo frontend
    const formattedData = items.map(item => {
      const baseItem = {
        id: item.id,
        tipoSepar: item.type_separation || '',
        calibre: '', // Assumindo que não há calibre na base atual
        codigo: item.material_code,
        descricao: item.description
      }

      // Adicionar quantidades por loja
      const storeQuantities: { [key: string]: number } = {}
      uniqueStores.forEach(store => {
        const quantity = item.colhetron_separation_quantities?.find(
          q => q.store_code === store
        )?.quantity || 0
        storeQuantities[store] = quantity
      })

      return { ...baseItem, ...storeQuantities }
    })

    return NextResponse.json({
      data: formattedData,
      stores: uniqueStores
    })

  } catch (error) {
    console.error('Erro na API de separações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}