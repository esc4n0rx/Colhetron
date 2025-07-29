import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    const { data: separation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !separation) {
      return NextResponse.json(
        { error: 'Nenhuma separação ativa encontrada' },
        { status: 404 }
      )
    }

    const { data: posItems, error: posError } = await supabaseAdmin
      .from('colhetron_pos_faturamento')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('separation_id', separation.id)
      .order('created_at', { ascending: false })

    if (posError) throw new Error('Erro ao buscar dados de pós-faturamento.');
    
    if (!posItems || posItems.length === 0) {
      return NextResponse.json({ 
        data: [], 
        separationInfo: { id: separation.id, isActive: true, status: 'active' }
      })
    }

    const materialCodes = posItems.map(item => item.codigo);

    // 3. Buscar dados de média (Estoque Antes) E FILTRAR ITENS COM ESTOQUE ZERO
    const { data: mediaItems } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('codigo, quantidade_caixas, estoque_atual') // Selecionar estoque_atual para o filtro
      .eq('user_id', decoded.userId)
      .gt('estoque_atual', 0) // <-- AJUSTE PRINCIPAL AQUI
      .in('codigo', materialCodes)
    
    const mediaMap = new Map<string, number>()
    mediaItems?.forEach(item => {
      mediaMap.set(item.codigo, item.quantidade_caixas)
    })

    const { data: separationQuantities } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('material_code, description, colhetron_separation_quantities(quantity)')
      .eq('separation_id', separation.id)
      .in('material_code', materialCodes)

    const totalSeparadoMap = new Map<string, { description: string, total: number }>()
    separationQuantities?.forEach(item => {
      const total = item.colhetron_separation_quantities.reduce((sum: number, q: any) => sum + q.quantity, 0)
      if (total > 0) {
        totalSeparadoMap.set(item.material_code, { description: item.description, total })
      }
    })

    //await generateDebugLogs(separation.id, totalSeparadoMap, mediaItems, posItems);

    const comparacaoData = posItems
      .filter(item => mediaMap.has(item.codigo)) // Filtra posItems para incluir apenas os que têm estoque > 0 na mídia
      .map(item => {
        const quantidadeCaixasAntes = mediaMap.get(item.codigo) || 0;
        const diferenca = quantidadeCaixasAntes - item.estoque_atual;
        
        let status: 'OK' | 'Divergente' | 'novo';

        if (item.estoque_atual === quantidadeCaixasAntes && quantidadeCaixasAntes > 0) {
          status = 'Divergente';
        } else {
          status = 'OK';
        }

        return {
          codigo: item.codigo,
          material: item.material,
          quantidade_kg: item.quantidade_kg,
          quantidade_caixas_antes: quantidadeCaixasAntes,
          quantidade_caixas_atual: item.quantidade_caixas,
          estoque_atual: item.estoque_atual,
          diferenca: diferenca,
          status: status
        }
    })

    const separationInfo = {
      id: separation.id,
      isActive: true,
      status: 'active' as const
    }

    return NextResponse.json({
      data: comparacaoData,
      separationInfo
    })

  } catch (error) {
    console.error('Erro na API de pós faturamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
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

    const { items } = await request.json()

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // Buscar separação ativa
    const { data: separation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !separation) {
      return NextResponse.json(
        { error: 'Nenhuma separação ativa encontrada' },
        { status: 404 }
      )
    }

    // Preparar dados para inserção
    const posItems = items.map(item => ({
      user_id: decoded.userId,
      separation_id: separation.id,
      codigo: item.codigo,
      material: item.material,
      quantidade_kg: item.quantidade_kg,
      quantidade_caixas: item.quantidade_caixas,
      estoque_atual: item.estoque_atual
    }))

    // Inserir dados
    const { error } = await supabaseAdmin
      .from('colhetron_pos_faturamento')
      .insert(posItems)

    if (error) {
      console.error('Erro ao inserir dados de pós faturamento:', error)
      return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Dados salvos com sucesso' })

  } catch (error) {
    console.error('Erro na API de pós faturamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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

    const { error } = await supabaseAdmin
      .from('colhetron_pos_faturamento')
      .delete()
      .eq('user_id', decoded.userId)

    if (error) {
      console.error('Erro ao limpar dados de pós faturamento:', error)
      return NextResponse.json({ error: 'Erro ao limpar dados' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Dados limpos com sucesso' })

  } catch (error) {
    console.error('Erro na API de pós faturamento:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}