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
    uniqueKey: string // NOVO: chave única combinando código + descrição
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

    // AJUSTE: Filtrar materiais que não têm nenhuma quantidade > 0
    const materialsWithQuantity = processedData.materials.filter((material, index) => {
      const materialQuantities = processedData.quantities.filter(q => q.materialIndex === index)
      return materialQuantities.some(q => q.quantity > 0)
    })

    if (materialsWithQuantity.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum material com quantidade válida (> 0) encontrado na planilha' },
        { status: 400 }
      )
    }

    // Filtrar as quantidades dos materiais válidos
    const validMaterialIndices = new Set(
      processedData.materials
        .map((material, index) => materialsWithQuantity.includes(material) ? index : -1)
        .filter(index => index !== -1)
    )

    const filteredQuantities = processedData.quantities.filter(q => 
      validMaterialIndices.has(q.materialIndex) && q.quantity > 0
    )

    const filteredProcessedData = {
      materials: materialsWithQuantity,
      stores: processedData.stores,
      quantities: filteredQuantities.map(q => ({
        ...q,
        materialIndex: materialsWithQuantity.findIndex(m => 
          processedData.materials[q.materialIndex].uniqueKey === m.uniqueKey // AJUSTE: usar uniqueKey
        )
      }))
    }

    const reforcoResult = await processReforco({
      userId: decoded.userId,
      separationId: activeSeparation.id,
      processedData: filteredProcessedData,
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

  let lastStoreCol = 1 
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

  for (let row = 1; row <= lastMaterialRow; row++) {
    const materialCodeCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 0 })]
    const descriptionCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 1 })]

    if (materialCodeCell && materialCodeCell.v && descriptionCell && descriptionCell.v) {
      const materialCode = String(materialCodeCell.v).trim()
      const description = String(descriptionCell.v).trim()

      if (materialCode && description) {
        const materialIndex = materials.length
        // NOVO: Criar chave única combinando código e descrição
        const uniqueKey = `${materialCode}|${description}`
        
        materials.push({
          code: materialCode,
          description: description,
          rowNumber: row + 1,
          uniqueKey: uniqueKey // NOVO
        })

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

  return { materials, stores, quantities }
}

async function processReforco(params: {
  userId: string
  separationId: string
  processedData: ProcessedReforcoData
  fileName: string
}): Promise<{ data: ReforcoProcessingResult | null; error: string | null }> {
  const { separationId, processedData } = params

  try {
    // Buscar todas as lojas da separação usando separation_id
    const { data: allSeparationStores, error: storesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code')
      .eq('separation_id', separationId)

    if (storesError) {
      throw new Error(`Erro ao buscar lojas da separação: ${storesError.message}`)
    }

    const allExistingStores = [...new Set(allSeparationStores?.map(s => s.store_code) || [])]

    const materialCodes = processedData.materials.map(m => m.code)
    const { data: globalMaterials, error: materialsError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('material, diurno')
      .in('material', materialCodes)

    if (materialsError) {
      throw new Error(`Erro ao buscar cadastro de materiais: ${materialsError.message}`)
    }

    const materialTypeMap = new Map<string, string>()
    globalMaterials?.forEach(m => {
      materialTypeMap.set(m.material, m.diurno || 'SECO')
    })

    // AJUSTE: Buscar itens existentes usando código E descrição
    const { data: existingSeparationItems, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, material_code, description')
      .eq('separation_id', separationId)
      .in('material_code', materialCodes)

    if (itemsError) {
      throw new Error(`Erro ao buscar itens existentes: ${itemsError.message}`)
    }

    // AJUSTE: Criar mapa usando chave única (código + descrição)
    const existingItemsMap = new Map<string, { id: string; description: string }>()
    existingSeparationItems?.forEach(item => {
      const uniqueKey = `${item.material_code}|${item.description}`
      existingItemsMap.set(uniqueKey, { id: item.id, description: item.description })
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
      processedItems++
      processedMaterialCodes.push(material.code)

      let itemId: string

      // AJUSTE: Verificar existência usando uniqueKey
      if (existingItemsMap.has(material.uniqueKey)) {
        const existingItem = existingItemsMap.get(material.uniqueKey)!
        itemId = existingItem.id
        updatedItems++
        updatedMaterialCodes.push(material.code)
      } else {
        const { data: newItem, error: newItemError } = await supabaseAdmin
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

        if (newItemError || !newItem) {
          console.error(`Erro ao inserir novo item ${material.code}:`, newItemError)
          continue
        }

        itemId = newItem.id
        newItems++
        newMaterialCodes.push(material.code)
      }

      // Buscar quantidades existentes usando separation_id
      const { data: currentQuantities, error: quantitiesError } = await supabaseAdmin
        .from('colhetron_separation_quantities')
        .select('store_code, quantity')
        .eq('separation_id', separationId)
        .eq('item_id', itemId)

      if (quantitiesError) {
        console.error(`Erro ao buscar quantidades para ${material.code}:`, quantitiesError)
        continue
      }

      const currentQuantitiesMap = new Map<string, number>()
      currentQuantities?.forEach(q => {
        currentQuantitiesMap.set(q.store_code, q.quantity)
      })

      const materialQuantities = processedData.quantities.filter(q => q.materialIndex === processedData.materials.indexOf(material))
      const reforcoQuantitiesMap = new Map<string, number>()
      
      materialQuantities.forEach(rq => {
        reforcoQuantitiesMap.set(rq.storeCode, rq.quantity)
      })

      let hadRedistribution = false

      const allStoresToProcess = new Set([
        ...processedData.stores,
        ...Array.from(currentQuantitiesMap.keys())
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
          newQuantity = 0
        }

        if (currentQuantitiesMap.has(storeCode)) {
          if (newQuantity === 0) {
            // Deletar registro se quantidade é 0
            await supabaseAdmin
              .from('colhetron_separation_quantities')
              .delete()
              .eq('separation_id', separationId)
              .eq('item_id', itemId)
              .eq('store_code', storeCode)
          } else {
            // Atualizar quantidade existente
            await supabaseAdmin
              .from('colhetron_separation_quantities')
              .update({ quantity: newQuantity })
              .eq('separation_id', separationId)
              .eq('item_id', itemId)
              .eq('store_code', storeCode)
          }
        } else if (newQuantity > 0) {
          // Inserir nova quantidade com separation_id
          await supabaseAdmin
            .from('colhetron_separation_quantities')
            .insert([{
              item_id: itemId,
              separation_id: separationId,
              store_code: storeCode,
              quantity: newQuantity
            }])
        }
      }

      if (hadRedistribution) {
        redistributedMaterialCodes.push(material.code)
      }
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
    console.error('Erro ao processar reforço:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}