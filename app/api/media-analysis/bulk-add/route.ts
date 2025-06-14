
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

    // OBRIGATÓRIO: Verificar se há separação ativa
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

    // Como os dados já vêm processados do frontend, validar diretamente
    const validatedData = bulkAddSchema.parse(body)

    // Verificar códigos duplicados existentes
    const codigos = validatedData.items.map(item => item.codigo)
    const { data: existingItems } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('codigo')
      .eq('user_id', decoded.userId)
      .in('codigo', codigos)

    if (existingItems && existingItems.length > 0) {
      const duplicateCodes = existingItems.map(item => item.codigo)
      return NextResponse.json(
        { error: `Os seguintes códigos já existem: ${duplicateCodes.join(', ')}` },
        { status: 409 }
      )
    }

    // Processar cada item e calcular valores com base na separação ativa
    const itemsToInsert = await Promise.all(
      validatedData.items.map(async (item) => {
        // Calcular estoque atual baseado na separação ativa
        const estoqueAtual = await calculateEstoqueAtual(decoded.userId, item.codigo, activeSeparation.id)
        
        // Calcular diferença e média real
        const diferencaCaixas =  item.quantidade_caixas - estoqueAtual 
        const mediaReal = estoqueAtual > 0 && item.quantidade_kg > 0 ? 
          item.quantidade_kg / estoqueAtual : 0
        
        // Determinar status baseado na diferença
        let status = 'OK'
        if (estoqueAtual === 0) {
          status = 'CRÍTICO'
        } else if (Math.abs(diferencaCaixas) > item.quantidade_caixas * 0.2) {
          status = 'CRÍTICO'
        } else if (Math.abs(diferencaCaixas) > item.quantidade_caixas * 0.1) {
          status = 'ATENÇÃO'
        }

        return {
          codigo: item.codigo,
          material: item.material,
          quantidade_kg: item.quantidade_kg,
          quantidade_caixas: item.quantidade_caixas,
          media_sistema: Number(item.media_sistema.toFixed(2)),
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

    // Inserir itens na tabela colhetron_media_analysis
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
      message: `${insertedItems.length} itens adicionados com sucesso`,
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

// Função para calcular estoque atual baseado na separação ativa
async function calculateEstoqueAtual(userId: string, codigo: string, separationId: string): Promise<number> {
  try {
    // Buscar o item na separação pelo material_code
    const { data: separationItems } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id')
      .eq('separation_id', separationId)
      .eq('material_code', codigo)

    if (!separationItems || separationItems.length === 0) {
      return 0 // Material não existe na separação
    }

    // Somar todas as quantidades do material na separação
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