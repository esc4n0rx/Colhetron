// app/api/pedidos-gerados/route.ts
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
    const { data: activeSeparation } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    // Buscar dados de pedidos gerados
    const { data: pedidosItems, error } = await supabaseAdmin
      .from('colhetron_pedidos_gerados')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar dados de pedidos gerados:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    if (!pedidosItems || pedidosItems.length === 0) {
      return NextResponse.json({ 
        data: [], 
        message: activeSeparation 
          ? 'Nenhum pedido gerado. Use "Adicionar Pedido" ou "Colar Dados" para fazer upload.'
          : 'Nenhuma separação ativa encontrada. Crie uma separação primeiro.',
        separationInfo: activeSeparation ? {
          id: activeSeparation.id,
          isActive: true,
          status: 'active'
        } : null
      })
    }

    const separationInfo = {
      id: activeSeparation?.id || null,
      isActive: !!activeSeparation,
      status: activeSeparation ? 'active' : 'completed'
    }

    return NextResponse.json({
      data: pedidosItems,
      separationInfo
    })

  } catch (error) {
    console.error('Erro na API de pedidos gerados:', error)
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
    const { data: activeSeparation } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (!activeSeparation) {
      return NextResponse.json({ error: 'Nenhuma separação ativa encontrada' }, { status: 404 })
    }

    // Preparar dados para inserção
    const pedidosItems = items.map(item => ({
      user_id: decoded.userId,
      separation_id: activeSeparation.id,
      pedido: item.pedido,
      remessa: item.remessa,
      dados_adicionais: item.dados_adicionais || null
    }))

    // Inserir dados
    const { error } = await supabaseAdmin
      .from('colhetron_pedidos_gerados')
      .insert(pedidosItems)

    if (error) {
      console.error('Erro ao inserir dados de pedidos gerados:', error)
      return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Dados salvos com sucesso' })

  } catch (error) {
    console.error('Erro na API de pedidos gerados:', error)
    return NextResponse.json({ error: 'Erro internodo servidor' }, { status: 500 })
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
  .from('colhetron_pedidos_gerados')
  .delete()
  .eq('user_id', decoded.userId)

if (error) {
  console.error('Erro ao limpar dados de pedidos gerados:', error)
  return NextResponse.json({ error: 'Erro ao limpar dados' }, { status: 500 })
}

return NextResponse.json({ message: 'Dados limpos com sucesso' })
} catch (error) {
console.error('Erro na API de pedidos gerados:', error)
return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
}
}