// app/api/separations/upload-reforco/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import * as XLSX from 'xlsx'

interface ProcessedReforcoData {
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

interface ReforcoProcessingResult {
  processedItems: number
  updatedItems: number
  newItems: number
  redistributedItems: number
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

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    // Validar arquivo Excel
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Apenas arquivos Excel (.xlsx, .xls) ou CSV são aceitos' },
        { status: 400 }
      )
    }

    // Verificar se há uma separação ativa para o usuário
    const { data: activeSeparation, error: separationError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, type, date')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (separationError || !activeSeparation) {
      return NextResponse.json(
        { error: 'Nenhuma separação ativa encontrada. Crie uma separação antes de carregar reforços.' },
        { status: 404 }
      )
    }

    // Converter arquivo para buffer
    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)

    // Processar planilha Excel/CSV
    let processedData: ProcessedReforcoData
    try {
      processedData = await processReforcoFile(uint8Array)
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      return NextResponse.json(
        { error: 'Erro ao processar arquivo. Verifique o formato da planilha.' },
        { status: 400 }
      )
    }

    // Processar reforço na separação ativa
    const reforcoResult = await processReforco({
        userId: decoded.userId,
        separationId: activeSeparation.id,
        processedData,
        fileName: file.name
      })
  
      if (reforcoResult.error || !reforcoResult.data) {
        return NextResponse.json(
          { error: reforcoResult.error || 'Erro ao processar reforço' },
          { status: 500 }
        )
      }

    await logActivity({
        userId: decoded.userId,
        action: 'Reforço carregado',
        details: `Reforço processado: ${reforcoResult.data.processedItems} materiais`,
        type: 'upload',
        metadata: {
          fileName: file.name,
          separationId: activeSeparation.id,
          processedItems: reforcoResult.data.processedItems,
          updatedItems: reforcoResult.data.updatedItems,
          newItems: reforcoResult.data.newItems,
          redistributedItems: reforcoResult.data.redistributedItems
        }
      })

    return NextResponse.json({
      success: true,
      message: `Reforço processado com sucesso! ${reforcoResult.data.processedItems} materiais processados.`,
      ...reforcoResult.data
    })

  } catch (error) {
    console.error('Erro no upload de reforço:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processReforcoFile(buffer: Uint8Array): Promise<ProcessedReforcoData> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  if (!worksheet) {
    throw new Error('Planilha não encontrada')
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Z100')
  const materials: ProcessedReforcoData['materials'] = []
  const stores: string[] = []
  const quantities: ProcessedReforcoData['quantities'] = []

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

        // Extrair quantidades para cada loja (incluindo quantidades 0 para redistribuição)
        for (let col = 2; col < 2 + stores.length; col++) {
          const quantityCell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
          const storeCode = stores[col - 2]
          
          let quantity = 0
          if (quantityCell && quantityCell.v !== undefined && quantityCell.v !== null) {
            quantity = Number(quantityCell.v)
            if (isNaN(quantity)) quantity = 0
          }
          
          // Adicionar todas as quantidades (inclusive 0) para processar redistribuição
          quantities.push({
            materialIndex,
            storeCode,
            quantity
          })
        }
      }
    }
  }

  if (materials.length === 0) {
    throw new Error('Nenhum material encontrado na planilha de reforço')
  }

  if (stores.length === 0) {
    throw new Error('Nenhuma loja encontrada na planilha de reforço')
  }

  return { materials, stores, quantities }
}

async function processReforco(params: {
  userId: string
  separationId: string
  processedData: ProcessedReforcoData
  fileName: string
}): Promise<{ data: ReforcoProcessingResult | null; error: string | null }> {
  const { userId, separationId, processedData, fileName } = params

  try {
    // Buscar cadastro de materiais do usuário
    const { data: userMaterials, error: materialsError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('material, diurno')
      .eq('user_id', userId)

    if (materialsError) {
      throw new Error(`Erro ao buscar cadastro de materiais: ${materialsError.message}`)
    }

    const materialTypeMap = new Map<string, string>()
    userMaterials.forEach(m => {
      materialTypeMap.set(m.material, m.diurno)
    })

    let processedItems = 0
    let updatedItems = 0
    let newItems = 0
    let redistributedItems = 0

    // Processar cada material do reforço
    for (const material of processedData.materials) {
      try {
        // Verificar se o material já existe na separação ativa
        const { data: existingItem, error: itemError } = await supabaseAdmin
          .from('colhetron_separation_items')
          .select('id')
          .eq('separation_id', separationId)
          .eq('material_code', material.code)
          .single()

        let itemId: string

        if (itemError || !existingItem) {
          // Material não existe na separação, criar novo
          const { data: newItem, error: createError } = await supabaseAdmin
            .from('colhetron_separation_items')
            .insert([{
              separation_id: separationId,
              material_code: material.code,
              description: material.description,
              row_number: material.rowNumber,
              type_separation: materialTypeMap.get(material.code) || 'SECO'
            }])
            .select('id')
            .single()

          if (createError || !newItem) {
            console.error(`Erro ao criar item ${material.code}:`, createError)
            continue
          }

          itemId = newItem.id
          newItems++
        } else {
          itemId = existingItem.id
          updatedItems++
        }

        // Buscar quantidades atuais do material por loja
        const { data: currentQuantities, error: quantitiesError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .select('store_code, quantity')
          .eq('item_id', itemId)

        if (quantitiesError) {
          console.error(`Erro ao buscar quantidades para ${material.code}:`, quantitiesError)
          continue
        }

        const currentQuantitiesMap = new Map<string, number>()
        currentQuantities.forEach(q => {
          currentQuantitiesMap.set(q.store_code, q.quantity)
        })

        // Processar quantidades do reforço para este material
        const materialQuantities = processedData.quantities.filter(q => q.materialIndex === processedData.materials.indexOf(material))
        
        for (const reforcoQty of materialQuantities) {
          const currentQuantity = currentQuantitiesMap.get(reforcoQty.storeCode) || 0
          const reforcoQuantity = reforcoQty.quantity
          let newQuantity = 0

          // Aplicar regras de negócio
          if (currentQuantity === 0 && reforcoQuantity > 0) {
            // Não tinha separação ativa, adicionar
            newQuantity = reforcoQuantity
          } else if (currentQuantity > 0 && reforcoQuantity > 0) {
            // Já tinha quantidade, somar
            newQuantity = currentQuantity + reforcoQuantity
          } else if (currentQuantity > 0 && reforcoQuantity === 0) {
            // Antes tinha, agora não tem -> zerar (redistribuição)
            newQuantity = 0
            redistributedItems++
          } else {
            // Ambos são 0, manter 0 ou não existia
            newQuantity = 0
          }

          // Atualizar ou inserir quantidade
          if (currentQuantitiesMap.has(reforcoQty.storeCode)) {
            // Atualizar quantidade existente
            const { error: updateError } = await supabaseAdmin
              .from('colhetron_separation_quantities')
              .update({ quantity: newQuantity })
              .eq('item_id', itemId)
              .eq('store_code', reforcoQty.storeCode)

            if (updateError) {
              console.error(`Erro ao atualizar quantidade ${material.code}-${reforcoQty.storeCode}:`, updateError)
            }
          } else if (newQuantity > 0) {
            // Inserir nova quantidade (só se > 0)
            const { error: insertError } = await supabaseAdmin
              .from('colhetron_separation_quantities')
              .insert([{
                item_id: itemId,
                store_code: reforcoQty.storeCode,
                quantity: newQuantity
              }])

            if (insertError) {
              console.error(`Erro ao inserir quantidade ${material.code}-${reforcoQty.storeCode}:`, insertError)
            }
          }
        }

        processedItems++

      } catch (error) {
        console.error(`Erro ao processar material ${material.code}:`, error)
        continue
      }
    }

    // Atualizar totais da separação
    const { error: updateSeparationError } = await supabaseAdmin
      .from('colhetron_separations')
      .update({
        total_items: supabaseAdmin.rpc('get_separation_items_count', { sep_id: separationId })
      })
      .eq('id', separationId)

    if (updateSeparationError) {
      console.error('Erro ao atualizar totais da separação:', updateSeparationError)
    }

    return {
      data: {
        processedItems,
        updatedItems,
        newItems,
        redistributedItems
      },
      error: null
    }

  } catch (error) {
    console.error('Erro no processamento do reforço:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido no processamento'
    }
  }
}