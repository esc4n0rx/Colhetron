// app/api/faturamento/generate-table/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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

    // PRIMEIRO: Validar médias para TODOS os materiais da separação (independente do saldo)
    const allMaterialCodes = await getAllMaterialCodesFromSeparation(decoded.userId)
    
    if (allMaterialCodes.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada ou separação sem materiais.' 
      }, { status: 404 })
    }

    // Validar se todos os materiais possuem médias (ANTES de filtrar por saldo)
    const missingMediaValidation = await validateMediaExistence(decoded.userId, allMaterialCodes)
    
    if (missingMediaValidation.hasMissingMedia) {
      return NextResponse.json({ 
        error: 'Materiais sem média encontrados',
        missingMaterials: missingMediaValidation.missingMaterials,
        details: missingMediaValidation.details
      }, { status: 400 })
    }

    // Validar status das médias
    const mediaStatusValidation = await validateMediaStatus(decoded.userId, allMaterialCodes)
    
    if (mediaStatusValidation.hasErrors) {
      return NextResponse.json({ 
        error: 'Problemas encontrados na análise de médias',
        errorItems: mediaStatusValidation.errorItems,
        totalItems: mediaStatusValidation.totalItems
      }, { status: 400 })
    }

    // SEGUNDO: Buscar dados de faturamento (só materiais com saldo > 0)
    const { items, debugInfo } = await getFaturamentoItems(decoded.userId)

    return NextResponse.json({ 
      items,
      summary: {
        totalItems: items.length,
        uniqueMaterials: [...new Set(items.map(item => item.material))].length,
        uniqueStores: [...new Set(items.map(item => item.loja))].length,
        totalMaterialsInSeparation: allMaterialCodes.length
      },
      debug: debugInfo
    })

  } catch (error) {
    console.error('Erro ao gerar tabela de faturamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

async function getAllMaterialCodesFromSeparation(userId: string): Promise<string[]> {
  // Buscar separação ativa
  const { data: activeSeparation, error: sepError } = await supabaseAdmin
    .from('colhetron_separations')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (sepError || !activeSeparation) {
    return []
  }

  // Buscar TODOS os materiais da separação (independente do saldo)
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

    const itemIds = separationItems.map(item => item.id)
    
    // Buscar TODAS as quantidades primeiro para debug
    const { data: allQuantities, error: quantitiesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code, quantity, item_id')
      .in('item_id', itemIds)

    if (quantitiesError || !allQuantities) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Erro ao buscar dados de separação`)
      throw new Error('Erro ao buscar dados de separação')
    }

    debugInfo.totalQuantities = allQuantities.length
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Total de registros de quantidade: ${allQuantities.length}`)

    // Filtrar apenas quantidades > 0
    const separationQuantities = allQuantities.filter(q => q.quantity > 0)
    debugInfo.validQuantities = separationQuantities.length
    debugInfo.excludedQuantities = allQuantities.length - separationQuantities.length
    
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Quantidades válidas (>0): ${separationQuantities.length}`)
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Quantidades excluídas (=0): ${debugInfo.excludedQuantities}`)

    if (separationQuantities.length === 0) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Nenhuma quantidade válida encontrada`)
      throw new Error('Nenhuma quantidade válida encontrada para faturamento')
    }

    // Mapear itens para códigos de material
    const itemToMaterialMap = new Map<string, { code: string; description: string }>()
    separationItems.forEach(item => {
      itemToMaterialMap.set(item.id, { 
        code: item.material_code, 
        description: item.description 
      })
    })

    // Buscar códigos únicos de loja
    const uniqueStoreCodes = [...new Set(separationQuantities.map(sq => sq.store_code))]
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Lojas únicas encontradas: ${uniqueStoreCodes.length} - ${uniqueStoreCodes.join(', ')}`)
    
    const { data: lojas, error: lojasError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, centro')
      .in('prefixo', uniqueStoreCodes)

    if (lojasError) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Erro ao buscar dados de lojas`)
      throw new Error('Erro ao buscar dados de lojas')
    }

    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Lojas encontradas no cadastro: ${lojas?.length || 0}`)

    const storeToCenter = new Map<string, string>()
    lojas?.forEach(loja => {
      if (loja.centro) {
        storeToCenter.set(loja.prefixo, loja.centro)
      }
    })

    // Verificar lojas sem centro
    const lojasWithoutCenter = uniqueStoreCodes.filter(store => !storeToCenter.has(store))
    debugInfo.lojasWithoutCenter = lojasWithoutCenter
    
    if (lojasWithoutCenter.length > 0) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] AVISO: Lojas sem centro definido: ${lojasWithoutCenter.join(', ')}`)
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] Continuando processamento sem essas lojas`)
    }

    // Calcular itens esperados (para validação)
    const expectedItemsSet = new Set<string>()
    separationQuantities.forEach(sq => {
      const materialInfo = itemToMaterialMap.get(sq.item_id)
      const centro = storeToCenter.get(sq.store_code)
      if (materialInfo && centro) {
        expectedItemsSet.add(`${sq.store_code}-${materialInfo.code}`)
      }
    })
    debugInfo.expectedItems = expectedItemsSet.size

    const faturamentoMap = new Map<string, any>()

    // Processar cada quantidade
    separationQuantities.forEach(sq => {
      const materialInfo = itemToMaterialMap.get(sq.item_id)
      const centro = storeToCenter.get(sq.store_code)
      
      if (!materialInfo) {
        debugInfo.processingSteps.push(`[${new Date().toISOString()}] AVISO: Material não encontrado para item_id: ${sq.item_id}`)
        debugInfo.skippedItems++
        return
      }
      
      if (!centro) {
        debugInfo.processingSteps.push(`[${new Date().toISOString()}] AVISO: Centro não encontrado para loja: ${sq.store_code}`)
        debugInfo.skippedItems++
        return
      }

      const key = `${sq.store_code}-${materialInfo.code}`
      
      if (faturamentoMap.has(key)) {
        const existing = faturamentoMap.get(key)!
        existing.quantidade += sq.quantity
        debugInfo.processingSteps.push(`[${new Date().toISOString()}] Agregando quantidade ${sq.quantity} para ${key} (total: ${existing.quantidade})`)
      } else {
        faturamentoMap.set(key, {
          loja: sq.store_code,
          centro: centro,
          material: materialInfo.code,
          description: materialInfo.description,
          quantidade: sq.quantity
        })
        debugInfo.processingSteps.push(`[${new Date().toISOString()}] Criando novo item ${key} com quantidade ${sq.quantity}`)
      }
      
      debugInfo.processedItems++
    })

    debugInfo.finalItems = faturamentoMap.size
    
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] Processamento concluído:`)
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] - Itens processados: ${debugInfo.processedItems}`)
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] - Itens ignorados: ${debugInfo.skippedItems}`)
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] - Itens finais: ${debugInfo.finalItems}`)

    // Validação final
    if (debugInfo.finalItems < debugInfo.expectedItems) {
      debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO: Perda de dados detectada! Esperado ${debugInfo.expectedItems}, obtido ${debugInfo.finalItems}`)
    }

    const finalItems = Array.from(faturamentoMap.values())
    
    return { items: finalItems, debugInfo }

  } catch (error) {
    debugInfo.processingSteps.push(`[${new Date().toISOString()}] ERRO CRÍTICO: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    throw error
  }
}

async function validateMediaExistence(userId: string, materialCodes: string[]) {
  const { data: existingMedia, error } = await supabaseAdmin
    .from('colhetron_media_analysis')
    .select('codigo')
    .eq('user_id', userId)
    .in('codigo', materialCodes)

  if (error) {
    throw new Error('Erro ao verificar médias existentes')
  }

  const existingCodes = new Set(existingMedia?.map(item => item.codigo) || [])
  const missingMaterials = materialCodes.filter(code => !existingCodes.has(code))

  return {
    hasMissingMedia: missingMaterials.length > 0,
    missingMaterials,
    details: missingMaterials.length > 0 ? 
      `Execute a análise de médias para os seguintes materiais: ${missingMaterials.join(', ')}` : 
      'Todas as médias estão disponíveis'
  }
}

async function validateMediaStatus(userId: string, materialCodes: string[]) {
  const { data: mediaStatus, error } = await supabaseAdmin
    .from('colhetron_media_analysis')
    .select('codigo, status, error')
    .eq('user_id', userId)
    .in('codigo', materialCodes)
    .neq('status', 'OK')

  if (error) {
    throw new Error('Erro ao verificar status das médias')
  }

  const errorItems = mediaStatus?.map(item => ({
    id: item.codigo,
    codigo: item.codigo,
    material: item.codigo,
    status: item.status,
    error: item.error || 'Status não concluído'
  })) || []

  return {
    hasErrors: errorItems.length > 0,
    errorItems,
    totalItems: materialCodes.length
  }
}