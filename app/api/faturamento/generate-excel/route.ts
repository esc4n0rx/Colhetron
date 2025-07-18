// app/api/faturamento/generate-excel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
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
    
    if (items.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum item encontrado para faturamento. Verifique se há uma separação ativa com dados válidos.' 
      }, { status: 404 })
    }

    // Validar médias de forma mais robusta
    const materialCodes = [...new Set(items.map(item => item.material))]
    const mediaValidation = await validateAndGetMedias(decoded.userId, materialCodes)
    
    if (!mediaValidation.success) {
      return NextResponse.json({ 
        error: mediaValidation.error,
        missingMaterials: mediaValidation.missingMaterials,
        details: mediaValidation.details
      }, { status: 400 })
    }

    // Gerar dados do Excel com validação adicional
    const excelData = await generateExcelData(items, mediaValidation.mediaMap as Map<string, number>)
    
    // Criar workbook Excel
    const workbook = createExcelWorkbook(excelData)
    
    // Converter para buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // Log da operação
    await logFaturamentoGeneration(decoded.userId, items.length, materialCodes.length)

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="faturamento_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Erro ao gerar template Excel:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
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

  const itemToMaterialMap = new Map<string, { code: string; description: string }>()
  separationItems.forEach(item => {
    itemToMaterialMap.set(item.id, { 
      code: item.material_code, 
      description: item.description 
    })
  })

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

  const lojasWithoutCenter = uniqueStoreCodes.filter(store => !storeToCenter.has(store))
  if (lojasWithoutCenter.length > 0) {
    throw new Error(`Lojas sem centro definido: ${lojasWithoutCenter.join(', ')}`)
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

async function validateAndGetMedias(userId: string, materialCodes: string[]) {
  const { data: mediaItems, error: mediaError } = await supabaseAdmin
    .from('colhetron_media_analysis')
    .select('codigo, media_sistema, status')
    .eq('user_id', userId)
    .in('codigo', materialCodes)

  if (mediaError) {
    return {
      success: false,
      error: 'Erro ao buscar médias do sistema',
      details: mediaError.message
    }
  }

  const mediaMap = new Map<string, number>()
  const existingCodes = new Set<string>()
  
  mediaItems?.forEach(item => {
    existingCodes.add(item.codigo)
    mediaMap.set(item.codigo, item.media_sistema)
  })

  const missingMaterials = materialCodes.filter(code => !existingCodes.has(code))
  
  if (missingMaterials.length > 0) {
    return {
      success: false,
      error: `Médias não encontradas para os materiais: ${missingMaterials.join(', ')}. Execute a análise de médias primeiro.`,
      missingMaterials,
      details: 'Materiais sem média cadastrada no sistema'
    }
  }

  // Verificar se há médias zeradas (possível problema)
  const zeroMedias = mediaItems?.filter(item => item.media_sistema === 0) || []
  if (zeroMedias.length > 0) {
    console.warn('Médias zeradas encontradas:', zeroMedias.map(item => item.codigo))
  }

  return {
    success: true,
    mediaMap,
    totalItems: mediaItems?.length || 0
  }
}

async function generateExcelData(items: any[], mediaMap: Map<string, number>) {
  const currentDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  
  const excelData = items.map(item => {
    const mediaSistema = mediaMap.get(item.material) || 0
    const qtdCalculada = item.quantidade * mediaSistema

    // Validação adicional
    if (mediaSistema === 0) {
      console.warn(`Média zero encontrada para material ${item.material}`)
    }

    return {
      'Data': currentDate,
      'Centro': item.centro,
      'Grupo Comprador': 'F06',
      'Código fornecedor': 'CD03',
      'Codigo': item.material,
      'QTD': Math.round(qtdCalculada * 100) / 100,
      'DP': 'DP01'
    }
  })

  return excelData
}

function createExcelWorkbook(data: any[]) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  
  // Configurar larguras das colunas
  const columnWidths = [
    { wch: 12 }, // Data
    { wch: 10 }, // Centro
    { wch: 15 }, // Grupo Comprador
    { wch: 15 }, // Código fornecedor
    { wch: 15 }, // Codigo
    { wch: 12 }, // QTD
    { wch: 8 }   // DP
  ]
  worksheet['!cols'] = columnWidths

  // Adicionar formatação de cabeçalho
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:G1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    if (worksheet[cellAddress]) {
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "EEEEEE" } }
      }
    }
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturamento')
  
  return workbook
}

async function logFaturamentoGeneration(userId: string, totalItems: number, totalMaterials: number) {
  try {
    // Log simples da operação
    console.log(`Faturamento gerado para usuário ${userId}: ${totalItems} itens, ${totalMaterials} materiais únicos`)
  } catch (error) {
    console.error('Erro ao registrar log:', error)
  }
}