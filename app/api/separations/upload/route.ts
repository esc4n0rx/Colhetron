// app/api/separations/upload/route.ts
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
        { status: 400 }
      )
    }

    // Criar separação
    const result = await createSeparation({
      userId: decoded.userId,
      type,
      date,
      fileName: file.name,
      processedData
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Separação criada com sucesso',
      separation: result.data
    })

  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processExcelFile(uint8Array: Uint8Array): Promise<ProcessedData> {
  const workbook = XLSX.read(uint8Array, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  const materials: ProcessedData['materials'] = []
  const stores: string[] = []
  const quantities: ProcessedData['quantities'] = []

  // Ler cabeçalho para extrair códigos das lojas (linha 0, a partir da coluna C)
  let col = 2
  while (true) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })]
    if (!cell || !cell.v) break
    
    const storeCode = String(cell.v).trim()
    if (storeCode) {
      stores.push(storeCode)
    }
    col++
  }

  // Ler dados das linhas (a partir da linha 1)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
  
  for (let row = 1; row <= range.e.r; row++) {
    const materialCodeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    const descriptionCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]

    if (materialCodeCell && materialCodeCell.v && descriptionCell && descriptionCell.v) {
      const materialCode = String(materialCodeCell.v).trim()
      const description = String(descriptionCell.v).trim()

      if (materialCode && description) {
        // Extrair quantidades para cada loja antes de adicionar o material
        const materialQuantities: Array<{
          storeCode: string
          quantity: number
        }> = []
        
        for (let col = 2; col < 2 + stores.length; col++) {
          const quantityCell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
          
          if (quantityCell && quantityCell.v) {
            const quantity = Number(quantityCell.v)
            
            if (!isNaN(quantity) && quantity > 0) {
              materialQuantities.push({
                storeCode: stores[col - 2],
                quantity
              })
            }
          }
        }

        // AJUSTE: Só adicionar o material se ele tiver pelo menos uma quantidade > 0
        if (materialQuantities.length > 0) {
          const materialIndex = materials.length
          materials.push({
            code: materialCode,
            description: description,
            rowNumber: row + 1 // +1 para linha real do Excel
          })

          // Adicionar as quantidades ao array principal
          materialQuantities.forEach(qty => {
            quantities.push({
              materialIndex,
              storeCode: qty.storeCode,
              quantity: qty.quantity
            })
          })
        }
      }
    }
  }

  if (materials.length === 0) {
    throw new Error('Nenhum material com quantidade válida encontrado na planilha')
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
    // Buscar tipo de separação dos materiais
    const materialCodes = processedData.materials.map(m => m.code)
    const { data: globalMaterials, error: materialsError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('material, diurno')
      .in('material', materialCodes)

    if (materialsError) {
      throw new Error(`Erro ao buscar cadastro de materiais: ${materialsError.message}`)
    }

    const materialTypeMap = new Map<string, string>()
    globalMaterials.forEach(m => {
      materialTypeMap.set(m.material, m.diurno || 'SECO')
    })

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
        type_separation: materialTypeMap.get(material.code) || 'SECO'
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

    // Inserir quantidades em lotes com separation_id
    const quantityBatches = []
    for (let i = 0; i < processedData.quantities.length; i += batchSize) {
      const batch = processedData.quantities.slice(i, i + batchSize).map(qty => ({
        item_id: insertedItems[qty.materialIndex].id,
        separation_id: separation.id, // AJUSTE: Adicionar separation_id
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