// app/api/separations/upload/route.ts (ATUALIZADO)
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

interface ProcessedData {
  materials: Array<{
    code: string
    description: string
    rowNumber: number
  }>
  stores: string[]
  quantities: Array<{
    materialIndex: number
    storeCode: string
    quantity: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
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

    // Processar dados do formulário
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const date = formData.get('date') as string

    if (!file || !type || !date) {
      return NextResponse.json(
        { error: 'Arquivo, tipo e data são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar tipo
    if (!['SP', 'ES', 'RJ'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido' },
        { status: 400 }
      )
    }

    // Validar arquivo Excel
    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Apenas arquivos .xlsx são aceitos' },
        { status: 400 }
      )
    }

    // Converter arquivo para buffer
    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)

    // Processar planilha Excel
    let processedData: ProcessedData
    try {
      processedData = await processExcelFile(uint8Array)
    } catch (error) {
      console.error('Erro ao processar Excel:', error)
      return NextResponse.json(
        { error: 'Erro ao processar arquivo Excel. Verifique o formato.' },
        { status: 400 }
      )
    }

    // Verificar se há uma separação ativa para o usuário
    const { data: existingSeparation } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (existingSeparation) {
      return NextResponse.json(
        { error: 'Você já possui uma separação ativa. Finalize-a antes de criar uma nova.' },
        { status: 409 }
      )
    }

    // Iniciar transação para criar separação
    const separationResult = await createSeparation({
      userId: decoded.userId,
      type,
      date,
      fileName: file.name,
      processedData
    })

    if (separationResult.error) {
      return NextResponse.json(
        { error: separationResult.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Separação criada com sucesso',
      separation: separationResult.data
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processExcelFile(buffer: Uint8Array): Promise<ProcessedData> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  if (!worksheet) {
    throw new Error('Planilha não encontrada')
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100')
  const materials: ProcessedData['materials'] = []
  const stores: string[] = []
  const quantities: ProcessedData['quantities'] = []

  // Extrair nomes das lojas da primeira linha (C1 até BL1)
  for (let col = 2; col <= range.e.c; col++) { // Começa na coluna C (índice 2)
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    const cell = worksheet[cellAddress]
    
    if (cell && cell.v && typeof cell.v === 'string' && cell.v.trim()) {
      stores.push(cell.v.trim())
    }
  }

  // Processar dados dos materiais (a partir da linha 2)
  for (let row = 1; row <= Math.min(range.e.r, 65); row++) { // Até linha 65 como especificado
    // Coluna A - Material Code
    const materialCodeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    // Coluna B - Description
    const descriptionCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]

    if (materialCodeCell && materialCodeCell.v && descriptionCell && descriptionCell.v) {
      const materialCode = String(materialCodeCell.v).trim()
      const description = String(descriptionCell.v).trim()

      if (materialCode && description) {
        const materialIndex = materials.length
        materials.push({
          code: materialCode,
          description: description,
          rowNumber: row + 1 // +1 para linha real do Excel
        })

        // Extrair quantidades para cada loja
        for (let col = 2; col < 2 + stores.length; col++) {
          const quantityCell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
          
          if (quantityCell && quantityCell.v) {
            const quantity = Number(quantityCell.v)
            
            if (!isNaN(quantity) && quantity > 0) {
              quantities.push({
                materialIndex,
                storeCode: stores[col - 2],
                quantity
              })
            }
          }
        }
      }
    }
  }

  if (materials.length === 0) {
    throw new Error('Nenhum material encontrado na planilha')
  }

  if (stores.length === 0) {
    throw new Error('Nenhuma loja encontrada na planilha')
  }

  return { materials, stores, quantities }
}

async function createSeparation(params: {
  userId: string
  type: string
  date: string
  fileName: string
  processedData: ProcessedData
}) {
  const { userId, type, date, fileName, processedData } = params

  try {
    // Busca o cadastro de materiais do usuário para fazer o mapeamento
    const { data: userMaterials, error: materialsError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('material, diurno')
      .eq('user_id', userId);

    if (materialsError) {
      throw new Error(`Erro ao buscar cadastro de materiais: ${materialsError.message}`);
    }

    const materialTypeMap = new Map<string, string>();
    userMaterials.forEach(m => {
      materialTypeMap.set(m.material, m.diurno);
    });

    // Criar separação principal
    const { data: separation, error: separationError } = await supabaseAdmin
      .from('colhetron_separations')
      .insert([
        {
          user_id: userId,
          type,
          date,
          file_name: fileName,
          total_items: processedData.materials.length,
          total_stores: processedData.stores.length,
          status: 'active'
        }
      ])
      .select()
      .single()

    if (separationError) {
      throw new Error(`Erro ao criar separação: ${separationError.message}`)
    }

    // Inserir materiais em lotes
    const batchSize = 100
    const materialBatches = []
    
    for (let i = 0; i < processedData.materials.length; i += batchSize) {
      const batch = processedData.materials.slice(i, i + batchSize).map(material => ({
        separation_id: separation.id,
        material_code: material.code,
        description: material.description,
        row_number: material.rowNumber,
        type_separation: materialTypeMap.get(material.code) || 'SECO' // Default 'SECO' se não encontrado
      }))
      materialBatches.push(batch)
    }

    const insertedItems: any[] = []
    for (const batch of materialBatches) {
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('colhetron_separation_items')
        .insert(batch)
        .select()

      if (itemsError) {
        throw new Error(`Erro ao inserir materiais: ${itemsError.message}`)
      }
      
      insertedItems.push(...items)
    }

    // Inserir quantidades em lotes
    const quantityBatches = []
    for (let i = 0; i < processedData.quantities.length; i += batchSize) {
      const batch = processedData.quantities.slice(i, i + batchSize).map(qty => ({
        item_id: insertedItems[qty.materialIndex].id,
        store_code: qty.storeCode,
        quantity: qty.quantity
      }))
      quantityBatches.push(batch)
    }

    for (const batch of quantityBatches) {
      const { error: quantitiesError } = await supabaseAdmin
        .from('colhetron_separation_quantities')
        .insert(batch)

      if (quantitiesError) {
        throw new Error(`Erro ao inserir quantidades: ${quantitiesError.message}`)
      }
    }

    return { data: separation, error: null }

  } catch (error) {
    console.error('Erro na criação da separação:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}