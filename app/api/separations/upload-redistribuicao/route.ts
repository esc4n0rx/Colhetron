// app/api/separations/upload-redistribuicao/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import * as XLSX from 'xlsx'

interface ProcessedRedistribuicaoData {
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

interface RedistribuicaoProcessingResult {
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
        { error: 'Nenhuma separação ativa encontrada. Crie uma separação antes de carregar redistribuições.' },
        { status: 404 }
      )
    }

    const fileBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(fileBuffer)

    let processedData: ProcessedRedistribuicaoData
    try {
      processedData = await processRedistribuicaoFile(uint8Array)
    } catch (error) {
      console.error('Erro ao processar arquivo:', error)
      return NextResponse.json(
        { error: 'Erro ao processar arquivo. Verifique o formato da planilha.' },
        { status: 400 }
      )
    }

    const redistributedResult = await processRedistribuicao({
      userId: decoded.userId,
      separationId: activeSeparation.id,
      processedData,
      fileName: file.name
    })

    if (redistributedResult.error || !redistributedResult.data) {
      return NextResponse.json(
        { error: redistributedResult.error || 'Erro ao processar redistribuição' },
        { status: 500 }
      )
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Redistribuição carregada',
      details: `Redistribuição processada: ${redistributedResult.data.processedItems} materiais`,
      type: 'upload',
      metadata: {
        fileName: file.name,
        separationId: activeSeparation.id,
        processedItems: redistributedResult.data.processedItems,
        updatedItems: redistributedResult.data.updatedItems,
        newItems: redistributedResult.data.newItems,
        redistributedItems: redistributedResult.data.redistributedItems,
        processedMaterialCodes: redistributedResult.data.processedMaterialCodes,
        newMaterialCodes: redistributedResult.data.newMaterialCodes,
        updatedMaterialCodes: redistributedResult.data.updatedMaterialCodes,
        redistributedMaterialCodes: redistributedResult.data.redistributedMaterialCodes
      }
    })

    return NextResponse.json({
      success: true,
      message: `Redistribuição processada com sucesso! ${redistributedResult.data.processedItems} materiais processados.`,
      ...redistributedResult.data
    })

  } catch (error) {
    console.error('Erro no upload de redistribuição:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

async function processRedistribuicaoFile(buffer: Uint8Array): Promise<ProcessedRedistribuicaoData> {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  
  if (!worksheet) {
    throw new Error('Planilha não encontrada')
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const materials: ProcessedRedistribuicaoData['materials'] = []
  const stores: string[] = []
  const quantities: ProcessedRedistribuicaoData['quantities'] = []

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
        materials.push({
          code: materialCode,
          description: description,
          rowNumber: row + 1 
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
    throw new Error('Nenhum material encontrado na planilha de redistribuição')
  }

  if (stores.length === 0) {
    throw new Error('Nenhuma loja encontrada na planilha de redistribuição')
  }

  return { materials, stores, quantities }
}

async function processRedistribuicao(params: {
  userId: string
  separationId: string
  processedData: ProcessedRedistribuicaoData
  fileName: string
}): Promise<{ data: RedistribuicaoProcessingResult | null; error: string | null }> {
  const { userId, separationId, processedData, fileName } = params

  try {
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

    const materialCodes = processedData.materials.map(m => m.code)
    const { data: globalMaterials, error: globalMaterialsError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('material,descricao')
      .in('material', materialCodes)

    if (globalMaterialsError) {
      throw new Error(`Erro ao buscar materiais: ${globalMaterialsError.message}`)
    }

    const globalMaterialsMap = new Map(globalMaterials.map(gm => [gm.material, gm]))

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
        const globalMaterial = globalMaterialsMap.get(material.code)
        if (!globalMaterial) {
          console.warn(`Material ${material.code} não encontrado no banco global`)
          continue
        }

        let { data: existingItem, error: itemError } = await supabaseAdmin
          .from('colhetron_separation_items')
          .select('id')
          .eq('separation_id', separationId)
          .eq('material_code', material.code)
          .single()

        let itemId: string

        if (itemError && itemError.code === 'PGRST116') {
          const { data: newItem, error: insertError } = await supabaseAdmin
            .from('colhetron_separation_items')
            .insert([{
              separation_id: separationId,
              material_code: material.code,
              description: globalMaterial.descricao,
              tipo_separ: 'REDISTRIBUIÇÃO'
            }])
            .select('id')
            .single()

          if (insertError) {
            console.error(`Erro ao criar item ${material.code}:`, insertError)
            continue
          }

          if (!newItem) {
            console.error(`Falha ao criar item ${material.code}: dados nulos retornados`)
            continue
          }

          itemId = newItem.id
          newItems++
          newMaterialCodes.push(material.code)
        } else if (itemError) {
          console.error(`Erro ao buscar item ${material.code}:`, itemError)
          continue
        } else if (existingItem) {
          itemId = existingItem.id
          updatedItems++
          updatedMaterialCodes.push(material.code)
        } else {
          console.error(`Item existente para ${material.code} retornou nulo`)
          continue
        }

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

        const materialQuantities = processedData.quantities.filter(q => q.materialIndex === processedData.materials.indexOf(material))
        const redistribuicaoQuantitiesMap = new Map<string, number>()
        
        materialQuantities.forEach(rq => {
          redistribuicaoQuantitiesMap.set(rq.storeCode, rq.quantity)
        })

        let hadRedistribution = false

        const allStoresToProcess = new Set([
          ...processedData.stores,
          ...Array.from(currentQuantitiesMap.keys())
        ])

        for (const storeCode of allStoresToProcess) {
          const currentQuantity = currentQuantitiesMap.get(storeCode) || 0
          const newQuantity = redistribuicaoQuantitiesMap.get(storeCode) || 0

          // LÓGICA DE REDISTRIBUIÇÃO: SEMPRE SUBSTITUI O VALOR ANTIGO PELO NOVO
          if (currentQuantity !== newQuantity) {
            redistributedItems++
            hadRedistribution = true
          }

          if (currentQuantitiesMap.has(storeCode)) {
            const { error: updateError } = await supabaseAdmin
              .from('colhetron_separation_quantities')
              .update({ quantity: newQuantity })
              .eq('item_id', itemId)
              .eq('store_code', storeCode)

            if (updateError) {
              console.error(`Erro ao atualizar quantidade ${material.code}-${storeCode}:`, updateError)
            }
          } else if (newQuantity > 0) {
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
    console.error('Erro no processamento da redistribuição:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido no processamento'
    }
  }
}