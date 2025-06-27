import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const bulkAddSchema = z.object({
  items: z.array(z.object({
    codigo: z.string().min(1, 'Código é obrigatório'),
    material: z.string().min(1, 'Material é obrigatório'),
    quantidade_kg: z.number().min(0, 'Quantidade KG deve ser >= 0'),
    quantidade_caixas: z.number().min(0, 'Quantidade Caixas deve ser >= 0'),
    media_sistema: z.number().min(0, 'Média Sistema deve ser >= 0')
  })).min(1, 'Pelo menos um item é necessário')
})

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

    const { data: activeSeparation } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (!activeSeparation) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada. Crie ou ative uma separação primeiro.' 
      }, { status: 400 })
    }

    const body = await request.json()
    console.log('Dados recebidos na API:', JSON.stringify(body, null, 2))

    const validatedData = bulkAddSchema.parse(body)

    const codigos = validatedData.items.map(item => item.codigo)
    const { error: deleteError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .delete()
      .eq('user_id', decoded.userId)
      .in('codigo', codigos)

    if (deleteError) {
      console.error('Erro ao remover itens existentes:', deleteError)
    }

    const itemsToInsert = await Promise.all(
      validatedData.items.map(async (item) => {

        const estoqueAtual = await calculateEstoqueAtual(decoded.userId, item.codigo, activeSeparation.id)
        
        const diferencaCaixas = item.quantidade_caixas - estoqueAtual
        
        const mediaReal = estoqueAtual > 0 ? item.quantidade_kg / estoqueAtual : 0
        
        let status = 'OK'
        
        if (estoqueAtual> item.quantidade_caixas ) {
          status = 'CRÍTICO'
        }

        else if (estoqueAtual === 0) {
          status = 'OK'
        }
        else {
          const mediaSistemaInteira = Number.isInteger(item.media_sistema)
          
          if (!mediaSistemaInteira) {
            status = 'ATENÇÃO'
          } else {
            status = 'OK'
          }
        }

        return {
          codigo: item.codigo,
          material: item.material,
          quantidade_kg: item.quantidade_kg,
          quantidade_caixas: item.quantidade_caixas,
          media_sistema: item.media_sistema,
          estoque_atual: estoqueAtual,
          diferenca_caixas: diferencaCaixas,
          media_real: Number(mediaReal.toFixed(2)),
          status,
          user_id: decoded.userId,
          separation_id: activeSeparation.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
    )

    const { data: insertedItems, error } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .insert(itemsToInsert)
      .select()

    if (error) {
      console.error('Erro ao inserir itens:', error)
      return NextResponse.json({ error: 'Erro ao inserir itens' }, { status: 500 })
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Análise de médias realizada',
      details: `${insertedItems.length} itens processados na análise de médias`,
      type: 'media_analysis',
    })

    return NextResponse.json({ 
      message: `${insertedItems.length} itens adicionados/atualizados com sucesso`,
      data: insertedItems
    })

  } catch (error) {
    console.error('Erro na API de adição em lote:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

async function calculateEstoqueAtual(userId: string, codigo: string, separationId: string): Promise<number> {
  try {
    const { data: separationItems } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id')
      .eq('separation_id', separationId)
      .eq('material_code', codigo)

    if (!separationItems || separationItems.length === 0) {
      return 0 
    }

    let totalQuantity = 0
    for (const item of separationItems) {
      const { data: quantities } = await supabaseAdmin
        .from('colhetron_separation_quantities')
        .select('quantity')
        .eq('item_id', item.id)

      if (quantities && quantities.length > 0) {
        const itemTotal = quantities.reduce((sum, q) => sum + (q.quantity || 0), 0)
        totalQuantity += itemTotal
      }
    }

    return totalQuantity
  } catch (error) {
    console.error('Erro ao calcular estoque atual:', error)
    return 0
  }
}