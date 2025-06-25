// app/api/separations/upload-melancia/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

// Código específico da melancia
const MELANCIA_MATERIAL_CODE = '100195'

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
  melanciaItemFound: boolean
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

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
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
      fileName: file.name
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
      const kg = Number(kgCell.v)

      if (storeCode && !isNaN(kg) && kg >= 0) {
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
}): Promise<{ data: MelanciaProcessingResult | null; error: string | null }> {
  const { separationId, processedData, fileName } = params

  try {
    // Buscar o item específico da melancia (código 100195) na separação ativa
    const { data: melanciaItem, error: melanciaError } = await supabaseAdmin
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
      .eq('material_code', MELANCIA_MATERIAL_CODE)
      .single()

    if (melanciaError || !melanciaItem) {
      throw new Error(`Material melancia (código ${MELANCIA_MATERIAL_CODE}) não encontrado na separação ativa. Verifique se este produto está incluído na separação.`)
    }

    console.log(`🍉 Encontrado item de melancia: ${melanciaItem.material_code} - ${melanciaItem.description}`)

    let processedStores = 0
    let updatedStores = 0
    const notFoundStores: string[] = []
    let totalKgProcessed = 0

    // Criar mapa das quantidades atuais por loja
    const currentQuantitiesMap = new Map<string, { id: string; quantity: number }>()
    melanciaItem.colhetron_separation_quantities.forEach(q => {
      currentQuantitiesMap.set(q.store_code, { id: q.id, quantity: q.quantity })
    })

    // Processar cada loja da planilha
    for (const { storeCode, kg } of processedData.quantities) {
      const currentQuantity = currentQuantitiesMap.get(storeCode)

      if (currentQuantity) {
        // Loja existe na separação, atualizar quantidade
        const { error: updateError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: kg })
          .eq('id', currentQuantity.id)

        if (updateError) {
          console.error(`❌ Erro ao atualizar quantidade para loja ${storeCode}:`, updateError)
          continue
        }

        console.log(`✅ Atualizada loja ${storeCode}: ${currentQuantity.quantity} → ${kg} kg`)
        updatedStores++
        totalKgProcessed += kg
      } else {
        // Loja não existe na separação para o item melancia
        notFoundStores.push(storeCode)
      }

      processedStores++
    }

    return {
      data: {
        processedStores,
        updatedStores,
        notFoundStores,
        totalKgProcessed,
        melanciaItemFound: true
      },
      error: null
    }

  } catch (error) {
    console.error('Erro no processamento da melancia:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido no processamento'
    }
  }
}