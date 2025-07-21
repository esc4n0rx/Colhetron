// app/api/separations/upload-melancia/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import * as XLSX from 'xlsx'

const MELANCIA_MATERIAL_CODES = ['100195', '142223', '154875']

interface ProcessedMelanciaData {
  stores: string[]
  quantities: Array<{ storeCode: string; kg: number }>
}

interface MelanciaProcessingResult {
  processedStores: number
  updatedStores: number
  notFoundStores: number
  totalKgProcessed: number
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleanValue = value.replace(',', '.')
    const num = parseFloat(cleanValue)
    return isNaN(num) ? 0 : num
  }
  return 0
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const materialCode = formData.get('materialCode') as string

    if (!file || !materialCode) {
      return NextResponse.json(
        { error: 'Arquivo e código do material são obrigatórios' },
        { status: 400 }
      )
    }

    if (!MELANCIA_MATERIAL_CODES.includes(materialCode)) {
      return NextResponse.json(
        { error: `Código de material inválido. Códigos aceitos: ${MELANCIA_MATERIAL_CODES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verificar separação ativa
    const { data: separation, error: separationError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, type, date')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (separationError || !separation) {
      return NextResponse.json(
        { error: 'Nenhuma separação ativa encontrada. Crie uma separação antes de carregar melancia.' },
        { status: 404 }
      )
    }

    // Processar arquivo Excel
    const buffer = new Uint8Array(await file.arrayBuffer())
    const processedData = await processExcelFile(buffer)

    // Filtrar apenas quantidades > 0
    const filteredQuantities = processedData.quantities.filter(q => q.kg > 0)
    
    if (filteredQuantities.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma quantidade válida (> 0) encontrada na planilha' },
        { status: 400 }
      )
    }

    // Processar dados da melancia
    const result = await processMelancia({
      userId: decoded.userId,
      separationId: separation.id,
      processedData: { ...processedData, quantities: filteredQuantities },
      fileName: file.name,
      materialCode
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
    const lojaCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    const kgCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]

    if (lojaCell && lojaCell.v && kgCell && kgCell.v !== undefined) {
      const storeCode = String(lojaCell.v).trim()
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
  materialCode: string
}): Promise<{ data: MelanciaProcessingResult | null; error: string | null }> {
  const { separationId, processedData, materialCode } = params

  try {
    // Buscar o item específico da melancia na separação ativa
    const { data: melanciaItems, error: melanciaError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, material_code, description')
      .eq('separation_id', separationId)
      .eq('material_code', materialCode)

    if (melanciaError || !melanciaItems || melanciaItems.length === 0) {
      throw new Error(`Material de melancia (código ${materialCode}) não encontrado na separação ativa`)
    }

    const melanciaItem = melanciaItems[0]

    // Buscar quantidades existentes usando separation_id
    const { data: existingQuantities, error: quantitiesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code, quantity')
      .eq('separation_id', separationId)
      .eq('item_id', melanciaItem.id)

    if (quantitiesError) {
      throw new Error(`Erro ao buscar quantidades existentes: ${quantitiesError.message}`)
    }

    const existingQuantitiesMap = new Map<string, number>()
    existingQuantities?.forEach(qty => {
      existingQuantitiesMap.set(qty.store_code, qty.quantity)
    })

    const updatedStores: string[] = []
    const notFoundStores: string[] = []
    let totalKgProcessed = 0

    for (const quantity of processedData.quantities) {
      const hasExistingQuantity = existingQuantitiesMap.has(quantity.storeCode)
      
      if (hasExistingQuantity) {
        // Atualizar quantidade existente
        const { error: updateError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: quantity.kg })
          .eq('separation_id', separationId)
          .eq('item_id', melanciaItem.id)
          .eq('store_code', quantity.storeCode)

        if (updateError) {
          console.error(`Erro ao atualizar ${quantity.storeCode}:`, updateError)
        } else {
          updatedStores.push(quantity.storeCode)
          totalKgProcessed += quantity.kg
        }
      } else {
        // Inserir nova quantidade com separation_id
        const { error: insertError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .insert([{
            item_id: melanciaItem.id,
            separation_id: separationId, // AJUSTE: Incluir separation_id
            store_code: quantity.storeCode,
            quantity: quantity.kg
          }])

        if (insertError) {
          console.error(`Erro ao inserir ${quantity.storeCode}:`, insertError)
          notFoundStores.push(quantity.storeCode)
        } else {
          updatedStores.push(quantity.storeCode)
          totalKgProcessed += quantity.kg
        }
      }
    }

    return {
      data: {
        processedStores: processedData.quantities.length,
        updatedStores: updatedStores.length,
        notFoundStores: notFoundStores.length,
        totalKgProcessed
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