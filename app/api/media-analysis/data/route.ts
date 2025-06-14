// app/api/media-analysis/data/route.ts - Atualização
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

    // Primeiro, buscar separação ativa
    let targetSeparationId = null
    const { data: activeSeparation } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (activeSeparation) {
      targetSeparationId = activeSeparation.id
    } else {
      // Se não há separação ativa, buscar a última separação (mais recente)
      const { data: lastSeparation } = await supabaseAdmin
        .from('colhetron_separations')
        .select('id')
        .eq('user_id', decoded.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSeparation) {
        targetSeparationId = lastSeparation.id
      }
    }

    if (!targetSeparationId) {
      return NextResponse.json({ data: [], message: 'Nenhuma separação encontrada' })
    }

    // Buscar itens baseados na separação selecionada
    const { data: separationItems, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        colhetron_separation_quantities (
          quantity,
          store_code
        )
      `)
      .eq('separation_id', targetSeparationId)
    if (itemsError) {
      console.error('Erro ao buscar itens de separação:', itemsError)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    if (!separationItems || separationItems.length === 0) {
      return NextResponse.json({ data: [], message: 'Nenhum item encontrado na separação' })
    }

    // Processar dados para o formato esperado pela aba Media
    const processedData = await Promise.all(
      separationItems.map(async (item) => {
        // Calcular totais das quantidades
        const totalQuantidadeKg = item.colhetron_separation_quantities.reduce(
          (sum: number, q: any) => sum + (q.quantity || 0), 0
        )
        
        const totalQuantidadeCaixas = item.colhetron_separation_quantities.length
        
        // Calcular média do sistema
        const mediaSistema = totalQuantidadeCaixas > 0 ? totalQuantidadeKg / totalQuantidadeCaixas : 0
        
        // Buscar estoque atual (função já existente)
        const estoqueAtual = await calculateEstoqueAtual(decoded.userId, item.material_code)
        
        // Calcular diferença e média real
        const diferencaCaixas = totalQuantidadeCaixas-estoqueAtual
        const mediaReal = estoqueAtual > 0 && totalQuantidadeCaixas > 0 ? 
          totalQuantidadeKg / estoqueAtual : 0

        return {
          id: item.id,
          codigo: item.material_code,
          material: item.description || item.material_code,
          quantidade_kg: totalQuantidadeKg,
          quantidade_caixas: totalQuantidadeCaixas,
          media_sistema: Number(mediaSistema.toFixed(2)),
          estoque_atual: estoqueAtual,
          diferenca_caixas: diferencaCaixas,
          media_real: Number(mediaReal.toFixed(2)),
          user_id: decoded.userId,
          separation_id: targetSeparationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      })
    )

    // Verificar se é separação ativa ou última separação
    const isActiveSeparation = activeSeparation !== null

    return NextResponse.json({
      data: processedData,
      separationInfo: {
        id: targetSeparationId,
        isActive: isActiveSeparation,
        status: isActiveSeparation ? 'active' : 'completed'
      }
    })

  } catch (error) {
    console.error('Erro na API de média:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Função auxiliar existente atualizada
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
      // Se não há separação ativa, buscar a última separação
      const { data: lastSeparation } = await supabaseAdmin
        .from('colhetron_separations')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!lastSeparation) return 0
      
      // Usar última separação para calcular estoque
      const { data: separationItems } = await supabaseAdmin
        .from('colhetron_separation_items')
        .select('id')
        .eq('separation_id', lastSeparation.id)
        .eq('material_code', codigo)

      if (!separationItems || separationItems.length === 0) return 0

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