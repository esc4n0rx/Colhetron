// app/api/pos-faturamento/route.ts
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

    // Buscar dados de pós faturamento
    const { data: posItems, error } = await supabaseAdmin
      .from('colhetron_pos_faturamento')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('separation_id', separation.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar dados de pós faturamento:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    // Se não há dados de pós faturamento, retornar vazio
    if (!posItems || posItems.length === 0) {
      return NextResponse.json({ 
        data: [], 
        message: separation 
          ? 'Nenhum item de pós faturamento. Use "Colar Dados" para fazer upload.'
          : 'Nenhuma separação ativa encontrada. Crie uma separação primeiro.',
        separationInfo: separation ? {
          id: separation.id,
          isActive: true,
          status: 'active'
        } : null
      })
    }

    // Buscar dados de média para comparação
    const { data: mediaItems } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('codigo, material, quantidade_caixas')
      .eq('user_id', decoded.userId)

    // Criar mapa de dados de média
    const mediaMap = new Map()
    mediaItems?.forEach(item => {
      mediaMap.set(item.codigo, {
        material: item.material,
        quantidade_caixas_antes: item.quantidade_caixas
      })
    })

    const comparacaoData = posItems.map(item => {
      const mediaData = mediaMap.get(item.codigo)
      const quantidadeCaixasAntes = mediaData?.quantidade_caixas_antes || 0
      const diferenca =  quantidadeCaixasAntes-item.estoque_atual 
      
      let status = 'novo'
      if (mediaData) {
        if (item.estoque_atual === 0) {
          status = 'zerado'
        } else if (diferenca === 0) {
          status = 'faturado'
        } else if (diferenca < 0) {
          status = 'faturado'
        } else {
          status = 'parcial'
        }
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
      id: separation?.id || null,
      isActive: !!separation,
      status: separation ? 'active' : 'completed'
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