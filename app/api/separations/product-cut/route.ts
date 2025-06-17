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
  cut_type: z.enum(['all', 'specific', 'partial']),
  stores: z.array(specificStoreCutSchema).optional(),
  partial_cuts: z.array(partialStoreCutSchema).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Validar dados da requisição
    const body = await request.json()
    const validatedData = cutRequestSchema.parse(body)

    // Buscar separação ativa
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada' 
      }, { status: 404 })
    }

    // Buscar item da separação
    const { data: separationItem, error: itemError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, description')
      .eq('separation_id', activeSeparation.id)
      .eq('material_code', validatedData.material_code)
      .single()

    if (itemError || !separationItem) {
      return NextResponse.json({ 
        error: 'Produto não encontrado na separação ativa' 
      }, { status: 404 })
    }

    // Buscar quantidades atuais
    const { data: currentQuantities, error: quantitiesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code, quantity')
      .eq('item_id', separationItem.id)
      .gt('quantity', 0)

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

    // Processar corte baseado no tipo
    if (validatedData.cut_type === 'all') {
      // Cortar tudo - zerar todas as quantidades
      currentQuantities.forEach(q => {
        updatesToExecute.push({
          store_code: q.store_code,
          new_quantity: 0
        })
        totalCutQuantity += q.quantity
        affectedStores++
      })

    } else if (validatedData.cut_type === 'specific') {
      // Cortar lojas específicas
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
          totalCutQuantity += q.quantity
          affectedStores++
        }
      })

    } else if (validatedData.cut_type === 'partial') {
      // Corte parcial
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
          // Validar se a quantidade a cortar é válida
          if (partialCut.quantity_to_cut > q.quantity) {
            throw new Error(`Quantidade a cortar (${partialCut.quantity_to_cut}) é maior que a disponível (${q.quantity}) na loja ${q.store_code}`)
          }

          const newQuantity = q.quantity - partialCut.quantity_to_cut
          updatesToExecute.push({
            store_code: q.store_code,
            new_quantity: newQuantity
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

    // Executar atualizações no banco
    const updatePromises = updatesToExecute.map(update => {
      if (update.new_quantity === 0) {
        // Remover registro se quantidade for 0
        return supabaseAdmin
          .from('colhetron_separation_quantities')
          .delete()
          .eq('item_id', separationItem.id)
          .eq('store_code', update.store_code)
      } else {
        // Atualizar quantidade
        return supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: update.new_quantity })
          .eq('item_id', separationItem.id)
          .eq('store_code', update.store_code)
      }
    })

    const results = await Promise.allSettled(updatePromises)
    
    // Verificar se houve erros
    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason)

    if (errors.length > 0) {
      console.error('Erros ao executar cortes:', errors)
      return NextResponse.json({ 
        error: 'Erro ao executar algumas atualizações do corte' 
      }, { status: 500 })
    }

    // Registrar atividade
    await logActivity({
      userId: decoded.userId,
      action: 'Corte de produto realizado',
      details: `Produto ${validatedData.material_code} cortado em ${affectedStores} loja(s) com total de ${totalCutQuantity} unidade(s)`,
      type: 'separation',
      metadata: {
        separationId: separationItem.id,
        materialCode: validatedData.material_code,
        cutType: validatedData.cut_type,
        totalCutQuantity,
        affectedStores,
        reason: 'Solicitação manual via interface',
        date: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Corte executado com sucesso! ${totalCutQuantity} unidade(s) cortadas de ${affectedStores} loja(s)`,
      affected_stores: affectedStores,
      total_cut_quantity: totalCutQuantity,
      material_code: validatedData.material_code
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