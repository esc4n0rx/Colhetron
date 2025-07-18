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

    // Buscar dados de faturamento
    const items = await getFaturamentoItems(decoded.userId)
    
    // Validar se todos os materiais possuem médias
    const materialCodes = [...new Set(items.map(item => item.material))]
    const missingMediaValidation = await validateMediaExistence(decoded.userId, materialCodes)
    
    if (missingMediaValidation.hasMissingMedia) {
      return NextResponse.json({ 
        error: 'Materiais sem média encontrados',
        missingMaterials: missingMediaValidation.missingMaterials,
        details: missingMediaValidation.details
      }, { status: 400 })
    }

    // Validar status das médias
    const mediaStatusValidation = await validateMediaStatus(decoded.userId, materialCodes)
    
    if (mediaStatusValidation.hasErrors) {
      return NextResponse.json({ 
        error: 'Problemas encontrados na análise de médias',
        errorItems: mediaStatusValidation.errorItems,
        totalItems: mediaStatusValidation.totalItems
      }, { status: 400 })
    }

    return NextResponse.json({ 
      items,
      summary: {
        totalItems: items.length,
        uniqueMaterials: materialCodes.length,
        uniqueStores: [...new Set(items.map(item => item.loja))].length
      }
    })

  } catch (error) {
    console.error('Erro ao gerar tabela de faturamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

async function getFaturamentoItems(userId: string) {
  const { data: activeSeparation, error: sepError } = await supabaseAdmin
    .from('colhetron_separations')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (sepError || !activeSeparation) {
    throw new Error('Nenhuma separação ativa encontrada')
  }

  const { data: separationItems, error: itemsError } = await supabaseAdmin
    .from('colhetron_separation_items')
    .select('id, material_code, description')
    .eq('separation_id', activeSeparation.id)

  if (itemsError || !separationItems) {
    throw new Error('Erro ao buscar itens de separação')
  }

  const itemIds = separationItems.map(item => item.id)
  
  const { data: separationQuantities, error: quantitiesError } = await supabaseAdmin
    .from('colhetron_separation_quantities')
    .select('store_code, quantity, item_id')
    .in('item_id', itemIds)
    .gt('quantity', 0)

  if (quantitiesError || !separationQuantities) {
    throw new Error('Erro ao buscar dados de separação')
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
  
  const { data: lojas, error: lojasError } = await supabaseAdmin
    .from('colhetron_lojas')
    .select('prefixo, centro')
    .in('prefixo', uniqueStoreCodes)

  if (lojasError) {
    throw new Error('Erro ao buscar dados de lojas')
  }

  const storeToCenter = new Map<string, string>()
  lojas?.forEach(loja => {
    if (loja.centro) {
      storeToCenter.set(loja.prefixo, loja.centro)
    }
  })

  // Verificar se todas as lojas têm centro definido
  const lojasWithoutCenter = uniqueStoreCodes.filter(store => !storeToCenter.has(store))
  if (lojasWithoutCenter.length > 0) {
    throw new Error(`Lojas sem centro definido: ${lojasWithoutCenter.join(', ')}. Configure os centros no cadastro de lojas.`)
  }

  const faturamentoMap = new Map<string, any>()

  separationQuantities.forEach(sq => {
    const materialInfo = itemToMaterialMap.get(sq.item_id)
    const centro = storeToCenter.get(sq.store_code)
    
    if (!materialInfo || !centro) return

    const key = `${sq.store_code}-${materialInfo.code}`
    
    if (faturamentoMap.has(key)) {
      const existing = faturamentoMap.get(key)!
      existing.quantidade += sq.quantity
    } else {
      faturamentoMap.set(key, {
        loja: sq.store_code,
        centro: centro,
        material: materialInfo.code,
        description: materialInfo.description,
        quantidade: sq.quantity
      })
    }
  })

  return Array.from(faturamentoMap.values())
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
      `Materiais sem média: ${missingMaterials.join(', ')}` : 
      'Todos os materiais possuem médias cadastradas'
  }
}

async function validateMediaStatus(userId: string, materialCodes: string[]) {
  const { data: mediaItems, error } = await supabaseAdmin
    .from('colhetron_media_analysis')
    .select('id, codigo, material, status')
    .eq('user_id', userId)
    .in('codigo', materialCodes)

  if (error) {
    throw new Error('Erro ao verificar status das médias')
  }

  const errorItems = mediaItems?.filter(item => item.status !== 'OK') || []

  return {
    hasErrors: errorItems.length > 0,
    errorItems: errorItems.map(item => ({
      id: item.id,
      codigo: item.codigo,
      material: item.material,
      status: item.status,
      error: getErrorMessage(item.status)
    })),
    totalItems: mediaItems?.length || 0
  }
}

function getErrorMessage(status: string): string {
  switch (status) {
    case 'ATENÇÃO':
      return 'Diferença significativa entre estoque e quantidade prevista'
    case 'CRÍTICO':
      return 'Problema crítico: estoque zerado ou grande discrepância'
    default:
      return 'Status não identificado'
  }
}