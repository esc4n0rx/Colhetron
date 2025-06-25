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
  processedMaterialCodes: string[]
  newMaterialCodes: string[]
  updatedMaterialCodes: string[]
  redistributedMaterialCodes: string[]
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

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
        { status: 400 }
      )
    }

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Apenas arquivos Excel (.xlsx, .xls) ou CSV são aceitos' },
        { status: 400 }
      )
    }

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

    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)

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
        redistributedItems: reforcoResult.data.redistributedItems,
        processedMaterialCodes: reforcoResult.data.processedMaterialCodes,
        newMaterialCodes: reforcoResult.data.newMaterialCodes,
        updatedMaterialCodes: reforcoResult.data.updatedMaterialCodes,
        redistributedMaterialCodes: reforcoResult.data.redistributedMaterialCodes
      }
    })
    
    const { data: reinforcementPrint, error: printSaveError } = await supabaseAdmin
      .from('colhetron_reinforcement_prints')
      .insert({
        separation_id: activeSeparation.id,
        user_id: decoded.userId,
        file_name: file.name,
        data: processedData, 
      })
      .select('id')
      .single()

    if (printSaveError) {
      console.error('Erro ao salvar dados de reforço para impressão:', printSaveError)
    }

    return NextResponse.json({
      success: true,
      message: `Reforço processado com sucesso! ${reforcoResult.data.processedItems} materiais processados.`,
      reinforcementPrintId: reinforcementPrint?.id || null,
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

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const materials: ProcessedReforcoData['materials'] = []
  const stores: string[] = []
  const quantities: ProcessedReforcoData['quantities'] = []

  // Encontrar última linha com dados na coluna A (material)
  let lastMaterialRow = 0
  for (let row = 1; row <= range.e.r; row++) {
    const materialCodeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    if (materialCodeCell && materialCodeCell.v && String(materialCodeCell.v).trim()) {
      lastMaterialRow = row
    }
  }

  if (lastMaterialRow === 0) {
    throw new Error('Nenhum material encontrado na coluna A')
  }

  // Encontrar última coluna com dados na linha 1 (lojas) - começa na coluna C (índice 2)
  let lastStoreCol = 1 // Começar em B para garantir que tem pelo menos coluna C
  for (let col = 2; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    const cell = worksheet[cellAddress]
    if (cell && cell.v && typeof cell.v === 'string' && cell.v.trim()) {
      stores.push(cell.v.trim())
      lastStoreCol = col
    }
  }

  if (stores.length === 0) {
    throw new Error('Nenhuma loja encontrada na linha 1 a partir da coluna C')
  }

  // Processar dados dos materiais (de 2 até a última linha encontrada)
  for (let row = 1; row <= lastMaterialRow; row++) {
    const materialCodeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    const descriptionCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]

    if (materialCodeCell && materialCodeCell.v && descriptionCell && descriptionCell.v) {
      const materialCode = String(materialCodeCell.v).trim()
      const description = String(descriptionCell.v).trim()

      if (materialCode && description) {
        const materialIndex = materials.length
        materials.push({
          code: materialCode,
          description: description,
          rowNumber: row + 1 
        })

        // Extrair quantidades para cada loja
        for (let col = 2; col <= lastStoreCol; col++) {
          const quantityCell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })]
          const storeIndex = col - 2
          
          if (storeIndex < stores.length) {
            let quantity = 0
            if (quantityCell && quantityCell.v !== undefined && quantityCell.v !== null) {
              quantity = Number(quantityCell.v)
              if (isNaN(quantity)) quantity = 0
            }
            
            quantities.push({
              materialIndex,
              storeCode: stores[storeIndex],
              quantity
            })
          }
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
    // PRIMEIRO: Buscar TODAS as lojas da separação ativa
    const { data: allSeparationStores, error: storesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code')
      .in('item_id', 
        await supabaseAdmin
          .from('colhetron_separation_items')
          .select('id')
          .eq('separation_id', separationId)
          .then(({ data }) => data?.map(item => item.id) || [])
      )

    if (storesError) {
      throw new Error(`Erro ao buscar lojas da separação: ${storesError.message}`)
    }

    const allExistingStores = [...new Set(allSeparationStores.map(s => s.store_code))]

    // Buscar cadastro de materiais pelo código para pegar a categoria correta da coluna diurno
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

    let processedItems = 0
    let updatedItems = 0
    let newItems = 0
    let redistributedItems = 0

    const processedMaterialCodes: string[] = []
    const newMaterialCodes: string[] = []
    const updatedMaterialCodes: string[] = []
    const redistributedMaterialCodes: string[] = []

    for (const material of processedData.materials) {
      try {
        const { data: existingItem, error: itemError } = await supabaseAdmin
          .from('colhetron_separation_items')
          .select('id')
          .eq('separation_id', separationId)
          .eq('material_code', material.code)
          .single()

        let itemId: string
        let isNewMaterial = false

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
          isNewMaterial = true
          newMaterialCodes.push(material.code)
        } else {
          itemId = existingItem.id
          updatedItems++
          updatedMaterialCodes.push(material.code)
        }

        // Buscar TODAS as quantidades atuais deste material (todas as lojas)
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

        // Buscar as quantidades da planilha para este material
        const materialQuantities = processedData.quantities.filter(q => q.materialIndex === processedData.materials.indexOf(material))
        const reforcoQuantitiesMap = new Map<string, number>()
        
        materialQuantities.forEach(rq => {
          reforcoQuantitiesMap.set(rq.storeCode, rq.quantity)
        })

        let hadRedistribution = false

        // LÓGICA CORRIGIDA: Processar TODAS as lojas (da planilha E as que já existem)
        const allStoresToProcess = new Set([
          ...processedData.stores, // Lojas da planilha de reforço
          ...Array.from(currentQuantitiesMap.keys()) // Lojas que já tinham quantidade
        ])

        for (const storeCode of allStoresToProcess) {
          const currentQuantity = currentQuantitiesMap.get(storeCode) || 0
          const reforcoQuantity = reforcoQuantitiesMap.get(storeCode) || 0
          let newQuantity = 0

          // APLICAR REGRAS DE NEGÓCIO CORRETAS:
          if (currentQuantity === 0 && reforcoQuantity > 0) {
            // Se antes tinha 0, agora tem X -> adicionar X
            newQuantity = reforcoQuantity
          } else if (currentQuantity > 0 && reforcoQuantity > 0) {
            // Se antes tinha X, agora tem Y -> somar (X + Y)
            newQuantity = currentQuantity + reforcoQuantity
          } else if (currentQuantity > 0 && reforcoQuantity === 0) {
            // Se antes tinha X, agora está vazio/zero -> zerar (redistribuição)
            newQuantity = 0
            redistributedItems++
            hadRedistribution = true
          } else {
            // Se antes tinha 0 e continua 0 -> manter 0
            newQuantity = 0
          }

          // Atualizar ou inserir a quantidade no banco
          if (currentQuantitiesMap.has(storeCode)) {
            // Atualizar quantidade existente
            const { error: updateError } = await supabaseAdmin
              .from('colhetron_separation_quantities')
              .update({ quantity: newQuantity })
              .eq('item_id', itemId)
              .eq('store_code', storeCode)

            if (updateError) {
              console.error(`Erro ao atualizar quantidade ${material.code}-${storeCode}:`, updateError)
            }
          } else if (newQuantity > 0) {
            // Inserir nova quantidade (apenas se > 0)
            const { error: insertError } = await supabaseAdmin
              .from('colhetron_separation_quantities')
              .insert([{
                item_id: itemId,
                store_code: storeCode,
                quantity: newQuantity
              }])

            if (insertError) {
              console.error(`Erro ao inserir quantidade ${material.code}-${storeCode}:`, insertError)
            }
          }
        }

        processedMaterialCodes.push(material.code)
        
        if (hadRedistribution && !redistributedMaterialCodes.includes(material.code)) {
          redistributedMaterialCodes.push(material.code)
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
        total_items: await supabaseAdmin
          .from('colhetron_separation_items')
          .select('id', { count: 'exact' })
          .eq('separation_id', separationId)
          .then(({ count }) => count || 0)
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
        redistributedItems,
        processedMaterialCodes,
        newMaterialCodes,
        updatedMaterialCodes,
        redistributedMaterialCodes
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