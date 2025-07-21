// app/api/faturamento/generate-excel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function GET(request: NextRequest) {
  return generateExcel(request)
}

export async function POST(request: NextRequest) {
  return generateExcel(request)
}

async function generateExcel(request: NextRequest) {
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

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum item encontrado para gerar o Excel' },
        { status: 404 }
      )
    }

    // Criar planilha Excel
    const worksheet = XLSX.utils.json_to_sheet(items)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturamento')

    // Converter para buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `faturamento_${timestamp}.xlsx`

    // Retornar arquivo
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Erro ao gerar Excel de faturamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
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

    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Itens de separação encontrados: ${separationItems.length}`)
    debugInfo.expectedItems = separationItems.length

    // Buscar quantidades dos itens
    const itemIds = separationItems.map(item => item.id)
    const { data: separationQuantities, error: quantitiesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('item_id, store_code, quantity')
      .in('item_id', itemIds)

    if (quantitiesError || !separationQuantities) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Erro ao buscar quantidades`)
      throw new Error('Erro ao buscar quantidades dos itens')
    }

    debugInfo.totalQuantities = separationQuantities.length
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Quantidades encontradas: ${separationQuantities.length}`)

    // Buscar médias calculadas
    const { data: mediasData, error: mediasError } = await supabaseAdmin
      .from('colhetron_medias_calculadas')
      .select('item_id, store_code, media_calculada')
      .in('item_id', itemIds)

    if (mediasError) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] AVISO: Erro ao buscar médias - usando quantidades originais`)
    }

    const mediasMap = new Map<string, number>()
    mediasData?.forEach(media => {
      const key = `${media.item_id}-${media.store_code}`
      mediasMap.set(key, media.media_calculada)
    })

    // Aplicar médias às quantidades (se disponíveis)
    const allQuantities = separationQuantities.map(qty => {
      const mediaKey = `${qty.item_id}-${qty.store_code}`
      const mediaCalculada = mediasMap.get(mediaKey)
      
      return {
        ...qty,
        quantity: mediaCalculada !== undefined ? mediaCalculada : qty.quantity
      }
    }).filter(qty => qty.quantity > 0)

    debugInfo.validQuantities = allQuantities.length
    debugInfo.excludedQuantities = debugInfo.totalQuantities - debugInfo.validQuantities

    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Quantidades válidas após filtros: ${debugInfo.validQuantities}`)

    // Buscar dados das lojas com centro
    const storeCodes = [...new Set(allQuantities.map(qty => qty.store_code))]
    const { data: storesData, error: storesError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, centro')
      .in('prefixo', storeCodes)

    if (storesError || !storesData) {
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
    allQuantities.forEach(qty => {
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
      Material: material.material_code,
      Descrição: material.description,
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