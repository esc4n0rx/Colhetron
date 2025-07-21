// app/api/separations/product-cut/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const specificStoreCutSchema = z.object({
  store_code: z.string(),
  cut_all: z.boolean()
})

const partialStoreCutSchema = z.object({
  store_code: z.string(),
  quantity_to_cut: z.number().min(1),
  current_quantity: z.number().min(1)
})

const cutRequestSchema = z.object({
  material_code: z.string().min(1, 'Código do material é obrigatório'),
  description: z.string().optional(),
  cut_type: z.enum(['all', 'specific', 'partial']),
  stores: z.array(specificStoreCutSchema).optional(),
  partial_cuts: z.array(partialStoreCutSchema).optional()
})

interface CutOperation {
  store_code: string
  previous_quantity: number
  new_quantity: number
  cut_quantity: number
  operation_type: 'complete_cut' | 'partial_cut'
}

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

    const body = await request.json()
    const validatedData = cutRequestSchema.parse(body)

    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, type, date, file_name')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada' 
      }, { status: 404 })
    }

    // Construir a query de busca do item
    let itemQuery = supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, description, row_number, type_separation')
      .eq('separation_id', activeSeparation.id)
      .eq('material_code', validatedData.material_code)

    if (validatedData.description) {
      itemQuery = itemQuery.eq('description', validatedData.description)
    }

    const { data: separationItem, error: itemError } = await itemQuery.single()

    // app/api/separations/product-cut/route.ts (continuação)
    if (itemError || !separationItem) {
      return NextResponse.json({ 
        error: 'Produto não encontrado na separação ativa' 
      }, { status: 404 })
    }

    // AJUSTE: Buscar quantidades usando separation_id e filtrando apenas > 0
    const { data: currentQuantities, error: quantitiesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code, quantity')
      .eq('separation_id', activeSeparation.id)
      .eq('item_id', separationItem.id)
      .gt('quantity', 0) // AJUSTE: Filtrar apenas quantidades > 0

    if (quantitiesError) {
      console.error('Erro ao buscar quantidades atuais:', quantitiesError)
      return NextResponse.json({ error: 'Erro ao buscar quantidades atuais' }, { status: 500 })
    }

    if (!currentQuantities || currentQuantities.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma quantidade encontrada para este produto' 
      }, { status: 404 })
    }

    let affectedStores = 0
    let totalCutQuantity = 0
    const updatesToExecute: Array<{ store_code: string, new_quantity: number }> = []
    const cutOperations: CutOperation[] = []

    if (validatedData.cut_type === 'all') {
      currentQuantities.forEach(q => {
        updatesToExecute.push({
          store_code: q.store_code,
          new_quantity: 0
        })
        
        cutOperations.push({
          store_code: q.store_code,
          previous_quantity: q.quantity,
          new_quantity: 0,
          cut_quantity: q.quantity,
          operation_type: 'complete_cut'
        })
        
        totalCutQuantity += q.quantity
        affectedStores++
      })

    } else if (validatedData.cut_type === 'specific') {
      if (!validatedData.stores || validatedData.stores.length === 0) {
        return NextResponse.json({ 
          error: 'Nenhuma loja especificada para corte específico' 
        }, { status: 400 })
      }

      const storeCodesToCut = new Set(validatedData.stores.map(s => s.store_code))
      
      currentQuantities.forEach(q => {
        if (storeCodesToCut.has(q.store_code)) {
          updatesToExecute.push({
            store_code: q.store_code,
            new_quantity: 0
          })
          
          cutOperations.push({
            store_code: q.store_code,
            previous_quantity: q.quantity,
            new_quantity: 0,
            cut_quantity: q.quantity,
            operation_type: 'complete_cut'
          })
          
          totalCutQuantity += q.quantity
          affectedStores++
        }
      })

    } else if (validatedData.cut_type === 'partial') {
      if (!validatedData.partial_cuts || validatedData.partial_cuts.length === 0) {
        return NextResponse.json({ 
          error: 'Nenhuma quantidade especificada para corte parcial' 
        }, { status: 400 })
      }

      const partialCutsMap = new Map(
        validatedData.partial_cuts.map(pc => [pc.store_code, pc])
      )

      currentQuantities.forEach(q => {
        const partialCut = partialCutsMap.get(q.store_code)
        if (partialCut) {
          if (partialCut.quantity_to_cut > q.quantity) {
            throw new Error(`Quantidade a cortar (${partialCut.quantity_to_cut}) é maior que a disponível (${q.quantity}) na loja ${q.store_code}`)
          }

          const newQuantity = q.quantity - partialCut.quantity_to_cut
          updatesToExecute.push({
            store_code: q.store_code,
            new_quantity: newQuantity
          })
          
          cutOperations.push({
            store_code: q.store_code,
            previous_quantity: q.quantity,
            new_quantity: newQuantity,
            cut_quantity: partialCut.quantity_to_cut,
            operation_type: newQuantity === 0 ? 'complete_cut' : 'partial_cut'
          })
          
          totalCutQuantity += partialCut.quantity_to_cut
          affectedStores++
        }
      })
    }

    if (updatesToExecute.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma atualização necessária' 
      }, { status: 400 })
    }

    // Executar atualizações usando separation_id
    const updatePromises = updatesToExecute.map(update => {
      if (update.new_quantity === 0) {
        return supabaseAdmin
          .from('colhetron_separation_quantities')
          .delete()
          .eq('separation_id', activeSeparation.id)
          .eq('item_id', separationItem.id)
          .eq('store_code', update.store_code)
      } else {
        return supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: update.new_quantity })
          .eq('separation_id', activeSeparation.id)
          .eq('item_id', separationItem.id)
          .eq('store_code', update.store_code)
      }
    })

    const results = await Promise.allSettled(updatePromises)
    
    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason)

    if (errors.length > 0) {
      console.error('Erros ao executar cortes:', errors)
      return NextResponse.json({ 
        error: 'Erro ao executar algumas atualizações do corte' 
      }, { status: 500 })
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Corte de produto realizado',
      details: `Produto ${validatedData.material_code} (${separationItem.description}) cortado em ${affectedStores} loja(s) com total de ${totalCutQuantity} unidade(s)`,
      type: 'separation',
      metadata: {
        separationId: activeSeparation.id,
        separationType: activeSeparation.type,
        separationDate: activeSeparation.date,
        separationFileName: activeSeparation.file_name,
        materialCode: validatedData.material_code,
        materialDescription: separationItem.description,
        materialRowNumber: separationItem.row_number,
        materialTypeSeparation: separationItem.type_separation,
        cutType: validatedData.cut_type,
        totalCutQuantity,
        affectedStores,
        cutOperations,
        storeCodesCut: cutOperations.map(op => op.store_code),
        completeCuts: cutOperations.filter(op => op.operation_type === 'complete_cut').length,
        partialCuts: cutOperations.filter(op => op.operation_type === 'partial_cut').length,
        quantityDetails: {
          beforeCut: cutOperations.reduce((sum, op) => sum + op.previous_quantity, 0),
          afterCut: cutOperations.reduce((sum, op) => sum + op.new_quantity, 0),
          totalCut: cutOperations.reduce((sum, op) => sum + op.cut_quantity, 0)
        },
        storeBreakdown: cutOperations.map(op => ({
          storeCode: op.store_code,
          before: op.previous_quantity,
          after: op.new_quantity,
          cut: op.cut_quantity,
          type: op.operation_type
        })),
        timestamp: new Date().toISOString(),
        reason: 'Solicitação manual via interface'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Corte executado com sucesso! ${totalCutQuantity} unidade(s) cortadas de ${affectedStores} loja(s)`,
      affected_stores: affectedStores,
      total_cut_quantity: totalCutQuantity,
      material_code: validatedData.material_code,
      cut_operations: cutOperations
    })

  } catch (error) {
    console.error('Erro ao executar corte:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    }, { status: 500 })
  }
}