// app/api/faturamento/generate-table/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

interface FaturamentoItem {
  loja: string
  centro: string
  material: string
  quantidade: number
}

interface SeparationQuantityWithItem {
  store_code: string
  quantity: number
  colhetron_separation_items: {
    id: string
    material_code: string
    separation_id: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // 1. Buscar separação ativa
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada' 
      }, { status: 404 })
    }

    // 2. Buscar itens da separação primeiro
    const { data: separationItems, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, material_code')
      .eq('separation_id', activeSeparation.id)

    if (itemsError || !separationItems) {
      console.error('Erro ao buscar itens de separação:', itemsError)
      return NextResponse.json({ error: 'Erro ao buscar itens de separação' }, { status: 500 })
    }

    // 3. Buscar quantidades para esses itens
    const itemIds = separationItems.map(item => item.id)
    
    const { data: separationQuantities, error: quantitiesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code, quantity, item_id')
      .in('item_id', itemIds)
      .gt('quantity', 0)

    if (quantitiesError) {
      console.error('Erro ao buscar quantidades de separação:', quantitiesError)
      return NextResponse.json({ error: 'Erro ao buscar dados de separação' }, { status: 500 })
    }

    if (!separationQuantities || separationQuantities.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma quantidade de separação encontrada' 
      }, { status: 404 })
    }

    // 4. Criar mapa de item_id para material_code
    const itemToMaterialMap = new Map<string, string>()
    separationItems.forEach(item => {
      itemToMaterialMap.set(item.id, item.material_code)
    })

    // 5. Buscar mapeamento de lojas (prefixo -> centro)
    const uniqueStoreCodes = [...new Set(separationQuantities.map(sq => sq.store_code))]
    
    const { data: lojas, error: lojasError } = await supabaseAdmin
    .from('colhetron_lojas')
    .select('prefixo, centro')
    .in('prefixo', uniqueStoreCodes)

    if (lojasError) {
      console.error('Erro ao buscar lojas:', lojasError)
      return NextResponse.json({ error: 'Erro ao buscar dados de lojas' }, { status: 500 })
    }

    const storeToCenter = new Map<string, string>()
    lojas?.forEach(loja => {
      if (loja.centro) {
        storeToCenter.set(loja.prefixo, loja.centro)
      }
    })

    // 6. Verificar se há lojas sem centro definido
    const lojasWithoutCenter = uniqueStoreCodes.filter(store => !storeToCenter.has(store))
    if (lojasWithoutCenter.length > 0) {
      return NextResponse.json({ 
        error: `As seguintes lojas não têm centro definido: ${lojasWithoutCenter.join(', ')}. Configure os centros na aba de cadastro de lojas.` 
      }, { status: 400 })
    }

    // 7. Agrupar dados por loja e material
    const faturamentoMap = new Map<string, FaturamentoItem>()

    separationQuantities.forEach(sq => {
      const materialCode = itemToMaterialMap.get(sq.item_id)
      const centro = storeToCenter.get(sq.store_code)
      
      if (!materialCode || !centro) return // Pular se não encontrar material ou centro

      const key = `${sq.store_code}-${materialCode}`
      
      if (faturamentoMap.has(key)) {
        // Somar quantidade se já existe
        const existing = faturamentoMap.get(key)!
        existing.quantidade += sq.quantity
      } else {
        // Criar novo item
        faturamentoMap.set(key, {
          loja: sq.store_code,
          centro: centro,
          material: materialCode,
          quantidade: sq.quantity
        })
      }
    })

    const items = Array.from(faturamentoMap.values())
      .sort((a, b) => {
        // Ordenar por loja, depois por material
        if (a.loja !== b.loja) return a.loja.localeCompare(b.loja)
        return a.material.localeCompare(b.material)
      })

    if (items.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum item válido encontrado para faturamento. Verifique se as lojas têm centros definidos.' 
      }, { status: 404 })
    }

    return NextResponse.json({ items })

  } catch (error) {
    console.error('Erro ao gerar tabela de faturamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}