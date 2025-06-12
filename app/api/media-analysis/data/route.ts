
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'



export async function GET(request: NextRequest) {
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

    // Buscar dados de análise de médias do usuário
    const { data: mediaAnalysis, error } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar análise de médias:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    // Atualizar estoque atual para todos os itens
    const updatedData = await Promise.all(
      (mediaAnalysis || []).map(async (item) => {
        const estoqueAtual = await calculateEstoqueAtual(decoded.userId, item.codigo)
        
        // Recalcular diferença em caixas e média real
        const diferencaCaixas = estoqueAtual - item.quantidade_caixas
        const mediaReal = estoqueAtual > 0 ? (item.quantidade_kg / estoqueAtual) : 0
        
        // Recalcular status
        let status = 'OK'
        if (Math.abs(diferencaCaixas) > item.quantidade_caixas * 0.1) {
          status = 'ATENÇÃO'
        }
        if (Math.abs(diferencaCaixas) > item.quantidade_caixas * 0.2) {
          status = 'CRÍTICO'
        }
        if (estoqueAtual === 0) {
          status = 'CRÍTICO'
        }

        // Atualizar no banco de dados
        await supabaseAdmin
          .from('colhetron_media_analysis')
          .update({
            estoque_atual: estoqueAtual,
            diferenca_caixas: diferencaCaixas,
            media_real: mediaReal,
            status,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)

        return {
          ...item,
          estoque_atual: estoqueAtual,
          diferenca_caixas: diferencaCaixas,
          media_real: mediaReal,
          status
        }
      })
    )

    return NextResponse.json({ data: updatedData })

  } catch (error) {
    console.error('Erro na API de análise de médias:', error)
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
      }
    }

    return totalQuantity

  } catch (error) {
    console.error('Erro ao calcular estoque atual:', error)
    return 0
  }
}