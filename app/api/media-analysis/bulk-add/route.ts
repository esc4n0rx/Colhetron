
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
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

    const body = await request.json()
    const validatedData = bulkAddSchema.parse(body)

    // Verificar se já existem códigos duplicados
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

    // Calcular estoque atual para cada item baseado nas separações
    const itemsToInsert = await Promise.all(
      validatedData.items.map(async (item) => {
        const estoqueAtual = await calculateEstoqueAtual(decoded.userId, item.codigo)
        
        // Calcular diferença em caixas
        const diferencaCaixas = estoqueAtual - item.quantidade_caixas
        
        // Calcular média real
        const mediaReal = estoqueAtual > 0 ? (item.quantidade_kg / estoqueAtual) : 0
        
        // Determinar status baseado na diferença
        let status = 'OK'
        if (Math.abs(diferencaCaixas) > item.quantidade_caixas * 0.1) { // Mais de 10% de diferença
          status = 'ATENÇÃO'
        }
        if (Math.abs(diferencaCaixas) > item.quantidade_caixas * 0.2) { // Mais de 20% de diferença
          status = 'CRÍTICO'
        }
        if (estoqueAtual === 0) {
          status = 'CRÍTICO'
        }

        return {
          codigo: item.codigo,
          material: item.material,
          quantidade_kg: item.quantidade_kg,
          quantidade_caixas: item.quantidade_caixas,
          media_sistema: item.media_sistema,
          estoque_atual: estoqueAtual,
          diferenca_caixas: diferencaCaixas,
          media_real: mediaReal,
          status,
          user_id: decoded.userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
    )

    // Inserir itens em lote
    const { data: insertedItems, error } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .insert(itemsToInsert)
      .select()

    if (error) {
      console.error('Erro ao inserir itens:', error)
      return NextResponse.json({ error: 'Erro ao inserir itens' }, { status: 500 })
    }

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

// Função para calcular estoque atual baseado nas separações (CORRIGIDA)
async function calculateEstoqueAtual(userId: string, codigo: string): Promise<number> {
  try {
    // 1. Buscar separação ativa do usuário
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      console.log(`Nenhuma separação ativa encontrada para o usuário ${userId}`)
      return 0
    }

    // 2. Buscar o item na tabela colhetron_separation_items pelo material_code
    const { data: separationItems, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id')
      .eq('separation_id', activeSeparation.id)
      .eq('material_code', codigo)

    if (itemsError) {
      console.error('Erro ao buscar itens de separação:', itemsError)
      return 0
    }

    if (!separationItems || separationItems.length === 0) {
      console.log(`Nenhum item encontrado para o código ${codigo}`)
      return 0 // Não há separações para este material
    }

    // 3. Para cada item encontrado, somar as quantidades em colhetron_separation_quantities
    let totalQuantity = 0

    for (const item of separationItems) {
      const { data: quantities, error: quantitiesError } = await supabaseAdmin
        .from('colhetron_separation_quantities')
        .select('quantity')
        .eq('item_id', item.id)

      if (quantitiesError) {
        console.error('Erro ao buscar quantidades:', quantitiesError)
        continue
      }

      if (quantities && quantities.length > 0) {
        const itemTotal = quantities.reduce((sum, q) => sum + (q.quantity || 0), 0)
        totalQuantity += itemTotal
        console.log(`Item ${item.id} do código ${codigo}: ${itemTotal} unidades`)
      }
    }

    console.log(`Estoque total para código ${codigo}: ${totalQuantity}`)
    return totalQuantity

  } catch (error) {
    console.error('Erro ao calcular estoque atual:', error)
    return 0
  }
}