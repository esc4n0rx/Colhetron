import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'


const MELANCIA_MATERIAL_CODES = ['100195', '142223', '154875']

interface ProcessedMelanciaData {
  stores: string[]
  quantities: Array<{
    storeCode: string
    kg: number
  }>
}

interface MelanciaProcessingResult {
  processedStores: number
  updatedStores: number
  notFoundStores: string[]
  totalKgProcessed: number
  melanciaItemsFound: Array<{
    materialCode: string
    description: string
  }>
}

/**
 * Função para converter números com vírgula para float
 * Adaptada do PasteDataModal para manter consistência
 */
function parseNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  
  // Remove espaços e substitui vírgula por ponto
  // Remove pontos que são separadores de milhares (mantém apenas a última vírgula/ponto como decimal)
  const cleanValue = String(value).trim()
    .replace(/\./g, '') // Remove pontos de milhares
    .replace(',', '.') // Substitui vírgula decimal por ponto
  
  const parsed = parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : parsed
}

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const materialCode = formData.get('materialCode') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    if (!materialCode || !MELANCIA_MATERIAL_CODES.includes(materialCode)) {
      return NextResponse.json(
        { error: `Código de material inválido. Códigos aceitos: ${MELANCIA_MATERIAL_CODES.join(', ')}` },
        { status: 400 }
      )
    }

    // Processar arquivo Excel
    const buffer = new Uint8Array(await file.arrayBuffer())
    const processedData = await processExcelFile(buffer)

    // Processar dados da melancia
    const result = await processMelancia({
      userId: decoded.userId,
      separationId: separation.id,
      processedData,
      fileName: file.name,
      materialCode // Passar o código específico
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Separação de melancia carregada com sucesso',
      ...result.data
    })

  } catch (error) {
    console.error('Erro no upload de melancia:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processExcelFile(buffer: Uint8Array): Promise<ProcessedMelanciaData> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  if (!worksheet) {
    throw new Error('Planilha não encontrada')
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:C100')
  const stores: string[] = []
  const quantities: Array<{ storeCode: string; kg: number }> = []

  // Processar dados a partir da linha 2 (assumindo header na linha 1)
  for (let row = 1; row <= range.e.r; row++) {
    // Coluna A - Loja
    const lojaCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    // Coluna B - Quantidade (não usada no processamento final)
    // Coluna C - KG
    const kgCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]

    if (lojaCell && lojaCell.v && kgCell && kgCell.v !== undefined) {
      const storeCode = String(lojaCell.v).trim()
      // Usar a função parseNumber para aceitar números com vírgula
      const kg = parseNumber(kgCell.v)

      if (storeCode && kg >= 0) {
        stores.push(storeCode)
        quantities.push({
          storeCode,
          kg
        })
      }
    }
  }

  if (quantities.length === 0) {
    throw new Error('Nenhum dado válido encontrado na planilha')
  }

  return { stores, quantities }
}

async function processMelancia(params: {
  userId: string
  separationId: string
  processedData: ProcessedMelanciaData
  fileName: string
  materialCode: string // Novo parâmetro
}): Promise<{ data: MelanciaProcessingResult | null; error: string | null }> {
  const { separationId, processedData, fileName, materialCode } = params

  try {
    // Buscar o item específico da melancia (código específico) na separação ativa
    const { data: melanciaItems, error: melanciaError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        colhetron_separation_quantities (
          id,
          store_code,
          quantity
        )
      `)
      .eq('separation_id', separationId)
      .eq('material_code', materialCode)

    if (melanciaError || !melanciaItems || melanciaItems.length === 0) {
      throw new Error(`Material de melancia (código ${materialCode}) não encontrado na separação ativa`)
    }

    const melanciaItem = melanciaItems[0]

    const melanciaQuantitiesMap = new Map<string, any>()
    
    melanciaItem.colhetron_separation_quantities.forEach((qty: any) => {
      melanciaQuantitiesMap.set(qty.store_code, qty)
    })

    const updatedStores: string[] = []
    const notFoundStores: string[] = []
    let totalKgProcessed = 0

    for (const quantity of processedData.quantities) {
      const existingQuantity = melanciaQuantitiesMap.get(quantity.storeCode)
      
      if (existingQuantity) {
        const { error: updateError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: quantity.kg })
          .eq('id', existingQuantity.id)

        if (updateError) {
          console.error(`Erro ao atualizar loja ${quantity.storeCode}:`, updateError)
        } else {
          updatedStores.push(quantity.storeCode)
          totalKgProcessed += quantity.kg
          
          await supabaseAdmin
            .from('colhetron_user_activities')
            .insert({
              user_id: params.userId,
              action: 'upload_melancia',
              details: `Melancia ${melanciaItem.material_code} atualizada: Loja ${quantity.storeCode} - ${quantity.kg}kg`,
              type: 'update',
              metadata: {
                separationId: separationId,
                materialCode: melanciaItem.material_code,
                materialDescription: melanciaItem.description,
                storeCode: quantity.storeCode,
                quantity: quantity.kg,
                fileName: fileName
              }
            })
        }
      } else {
        notFoundStores.push(quantity.storeCode)
      }
    }

    const melanciaItemsFound = [{
      materialCode: melanciaItem.material_code,
      description: melanciaItem.description
    }]

    return {
      data: {
        processedStores: processedData.stores.length,
        updatedStores: updatedStores.length,
        notFoundStores,
        totalKgProcessed,
        melanciaItemsFound
      },
      error: null
    }

  } catch (error) {
    console.error('Erro ao processar melancia:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}