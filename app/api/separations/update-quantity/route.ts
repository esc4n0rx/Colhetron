// app/api/separations/update-quantity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: NextRequest) {
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
        { error: 'ItemId, storeCode e quantity são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se há separação ativa
    const { data: separation, error: separationError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (separationError || !separation) {
      return NextResponse.json(
        { error: 'Nenhuma separação ativa encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o item pertence à separação ativa
    const { data: item, error: itemError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, material_code, description')
      .eq('id', itemId)
      .eq('separation_id', separation.id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item não encontrado na separação ativa' },
        { status: 404 }
      )
    }

    // Buscar quantidade existente usando separation_id
    const { data: existingQuantities, error: quantityError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('quantity')
      .eq('separation_id', separation.id)
      .eq('item_id', itemId)
      .eq('store_code', storeCode)
      .single()

    const oldQuantity = existingQuantities?.quantity || 0

    if (quantity > 0) {
      if (existingQuantities) {
        // Atualizar quantidade existente
        const { error: updateError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: quantity })
          .eq('separation_id', separation.id)
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
        // Inserir nova quantidade com separation_id
        const { error: insertError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .insert([{
            item_id: itemId,
            separation_id: separation.id, // AJUSTE: Incluir separation_id
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
      // Quantidade é 0, deletar registro se existir
      if (existingQuantities) {
        const { error: deleteError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .delete()
          .eq('separation_id', separation.id)
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
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Alteração de produto realizado',
      details: `Alterado item ${item.material_code} na loja ${storeCode} de ${oldQuantity} para ${quantity}`,
      type: 'separation',
      metadata: {
        materialCode: item.material_code, 
        storeCode: storeCode,
        quantity: quantity,
        oldQuantity: oldQuantity,
        separationItemId: itemId,
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