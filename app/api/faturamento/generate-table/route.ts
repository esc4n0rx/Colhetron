import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'



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

    const { items, debug } = await getFaturamentoItems(decoded.userId)

    return NextResponse.json({
      items,
      debug,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro geral na API de faturamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

async function getActiveSeparationMaterials(userId: string): Promise<string[]> {
  const { data: activeSeparation, error: sepError } = await supabaseAdmin
    .from('colhetron_separations')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (sepError || !activeSeparation) {
    return []
  }

  const { data: separationItems, error: itemsError } = await supabaseAdmin
    .from('colhetron_separation_items')
    .select('material_code')
    .eq('separation_id', activeSeparation.id)

  if (itemsError || !separationItems) {
    return []
  }

  return [...new Set(separationItems.map(item => item.material_code))]
}

async function getFaturamentoItems(userId: string) {
  const debugInfo = {
    totalQuantities: 0,
    validQuantities: 0,
    excludedQuantities: 0,
    processedItems: 0,
    skippedItems: 0,
    expectedItems: 0,
    finalItems: 0,
    lojasWithoutCenter: [] as string[],
    processingSteps: [] as string[]
  }

  try {
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Iniciando processamento para usuário: ${userId}`)
    
    // Buscar separação ativa
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Nenhuma separação ativa encontrada`)
      throw new Error('Nenhuma separação ativa encontrada')
    }

    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Separação ativa encontrada: ${activeSeparation.id}`)

    // Buscar itens da separação
    const { data: separationItems, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, material_code, description')
      .eq('separation_id', activeSeparation.id)

    if (itemsError || !separationItems) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Erro ao buscar itens de separação`)
      throw new Error('Erro ao buscar itens de separação')
    }

    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Itens encontrados: ${separationItems.length}`)

    // AJUSTE: Buscar quantidades usando separation_id e filtrando apenas > 0
    const { data: allQuantities, error: quantitiesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code, quantity, item_id')
      .eq('separation_id', activeSeparation.id)
      .gt('quantity', 0) // AJUSTE: Filtrar apenas quantidades > 0

    if (quantitiesError || !allQuantities) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Erro ao buscar dados de separação`)
      throw new Error('Erro ao buscar dados de separação')
    }

    debugInfo.totalQuantities = allQuantities.length
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Total de registros de quantidade > 0: ${allQuantities.length}`)

    // Como já estamos filtrando por quantidade > 0, todos são válidos
    const separationQuantities = allQuantities
    debugInfo.validQuantities = separationQuantities.length
    debugInfo.excludedQuantities = 0
    
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Quantidades válidas: ${debugInfo.validQuantities}, excluídas: ${debugInfo.excludedQuantities}`)

    // Buscar cadastro de lojas
    const uniqueStores = [...new Set(separationQuantities.map(q => q.store_code))]
    const { data: storesData, error: storesError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, centro')
      .in('prefixo', uniqueStores)

    if (storesError) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Erro ao buscar dados das lojas`)
      throw new Error('Erro ao buscar dados das lojas')
    }

    const storesMap = new Map<string, string>()
    storesData?.forEach(store => {
      if (store.centro) {
        storesMap.set(store.prefixo, store.centro)
      } else {
        debugInfo.lojasWithoutCenter.push(store.prefixo)
      }
    })

    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Lojas mapeadas: ${storesMap.size}, sem centro: ${debugInfo.lojasWithoutCenter.length}`)

    // Agrupar dados por material
    const materialsMap = new Map<string, {
      material_code: string
      description: string
      quantities: { [store: string]: number }
      centers: { [center: string]: number }
    }>()

    separationItems.forEach(item => {
      materialsMap.set(item.id, {
        material_code: item.material_code,
        description: item.description,
        quantities: {},
        centers: {}
      })
    })

    // Processar quantidades
    separationQuantities.forEach(qty => {
      const material = materialsMap.get(qty.item_id)
      if (material) {
        material.quantities[qty.store_code] = qty.quantity
        
        const center = storesMap.get(qty.store_code)
        if (center) {
          material.centers[center] = (material.centers[center] || 0) + qty.quantity
        }
      }
    })

    // Converter para array final
    const faturamentoItems = Array.from(materialsMap.values()).map(material => ({
      material: material.material_code,
      descricao: material.description,
      ...material.quantities,
      ...Object.fromEntries(
        Object.entries(material.centers).map(([center, qty]) => [`TOTAL_${center}`, qty])
      ),
      TOTAL_GERAL: Object.values(material.centers).reduce((sum, qty) => sum + qty, 0)
    }))

    debugInfo.finalItems = faturamentoItems.length
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Processamento concluído. Itens finais: ${debugInfo.finalItems}`)

    return { items: faturamentoItems, debug: debugInfo }

  } catch (error) {
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO GERAL: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    throw error
  }
}