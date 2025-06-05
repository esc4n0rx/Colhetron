import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { itemId, storeCode, quantity } = await request.json()

    if (!itemId || !storeCode || quantity === undefined) {
      return NextResponse.json(
        { error: 'itemId, storeCode e quantity são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se o item pertence ao usuário
    const { data: item, error: itemError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        colhetron_separations!inner (
          user_id,
          status
        )
      `)
      .eq('id', itemId)
      .single()

    if (itemError || !item || item.colhetron_separations[0].user_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'Item não encontrado ou não autorizado' },
        { status: 404 }
      )
    }

    if (item.colhetron_separations[0].status !== 'active') {
      return NextResponse.json(
        { error: 'Não é possível editar uma separação não ativa' },
        { status: 400 }
      )
    }

    // Atualizar ou inserir quantidade
    if (quantity > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('colhetron_separation_quantities')
        .upsert({
          item_id: itemId,
          store_code: storeCode,
          quantity: quantity
        }, {
          onConflict: 'item_id,store_code'
        })

      if (upsertError) {
        console.error('Erro ao atualizar quantidade:', upsertError)
        return NextResponse.json(
          { error: 'Erro ao atualizar quantidade' },
          { status: 500 }
        )
      }
    } else {
      // Se quantidade for 0, deletar o registro
      const { error: deleteError } = await supabaseAdmin
        .from('colhetron_separation_quantities')
        .delete()
        .eq('item_id', itemId)
        .eq('store_code', storeCode)

      if (deleteError) {
        console.error('Erro ao deletar quantidade:', deleteError)
        return NextResponse.json(
          { error: 'Erro ao deletar quantidade' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ 
      message: 'Quantidade atualizada com sucesso' 
    })

  } catch (error) {
    console.error('Erro ao atualizar quantidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}