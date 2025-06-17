import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'

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

    // Verificar se o item pertence ao usuário - Corrigindo a query
    const { data: item, error: itemError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        separation_id
      `)
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      console.error('Erro ao buscar item:', itemError)
      return NextResponse.json(
        { error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se a separação pertence ao usuário e está ativa
    const { data: separation, error: separationError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, user_id, status')
      .eq('id', item.separation_id)
      .single()

    if (separationError || !separation) {
      console.error('Erro ao buscar separação:', separationError)
      return NextResponse.json(
        { error: 'Separação não encontrada' },
        { status: 404 }
      )
    }

    if (separation.user_id !== decoded.userId) {
      return NextResponse.json(
        { error: 'Não autorizado para editar este item' },
        { status: 403 }
      )
    }

    if (separation.status !== 'active') {
      return NextResponse.json(
        { error: 'Não é possível editar uma separação não ativa' },
        { status: 400 }
      )
    }

    // Verificar se já existe um registro de quantidade para este item/loja
    const { data: existingQuantity, error: quantityCheckError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('store_code', storeCode)
      .single()

    if (quantityCheckError && quantityCheckError.code !== 'PGRST116') {
      // PGRST116 = "Row not found" - isso é esperado quando não existe o registro
      console.error('Erro ao verificar quantidade existente:', quantityCheckError)
      return NextResponse.json(
        { error: 'Erro ao verificar dados existentes' },
        { status: 500 }
      )
    }

    // Atualizar ou inserir quantidade baseado na existência do registro
    if (quantity > 0) {
      if (existingQuantity) {
        // Registro existe - atualizar
        const { error: updateError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: quantity })
          .eq('item_id', itemId)
          .eq('store_code', storeCode)

        if (updateError) {
          console.error('Erro ao atualizar quantidade:', updateError)
          return NextResponse.json(
            { error: 'Erro ao atualizar quantidade' },
            { status: 500 }
          )
        }
      } else {
        // Registro não existe - inserir
        const { error: insertError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .insert([{
            item_id: itemId,
            store_code: storeCode,
            quantity: quantity
          }])

        if (insertError) {
          console.error('Erro ao inserir quantidade:', insertError)
          return NextResponse.json(
            { error: 'Erro ao inserir quantidade' },
            { status: 500 }
          )
        }
      }
    } else {
      // Quantidade é 0 - deletar o registro se existir
      if (existingQuantity) {
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
      // Se não existe registro e quantidade é 0, não precisa fazer nada
    }

    await logActivity({
          userId: decoded.userId,
          action: 'Alteração de produto realizado',
          details: `Quantidade do item ${itemId.quantidade} na loja ${itemId.loja} atualizada para ${quantity}`,
          type: 'separation',
          metadata: {
            quantity: quantity,
            storeCode: storeCode,
            separationItemId: itemId.id,
            separationId: separation.id,
            reason: 'Alteração de quantidade manual via interface',
            date: new Date().toISOString()
          }
        })

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