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

    const { data: item, error: itemError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        separation_id,
        material_code
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

    const { data: existingQuantity, error: quantityCheckError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('id, quantity')
      .eq('item_id', itemId)
      .eq('store_code', storeCode)
      .single()

    if (quantityCheckError && quantityCheckError.code !== 'PGRST116') {
      console.error('Erro ao verificar quantidade existente:', quantityCheckError)
      return NextResponse.json(
        { error: 'Erro ao verificar dados existentes' },
        { status: 500 }
      )
    }
    
    const oldQuantity = existingQuantity?.quantity ?? 0;

    if (quantity > 0) {
      if (existingQuantity) {
        const { error: updateError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .update({ quantity: quantity })
          .eq('item_id', itemId)
          .eq('store_code', storeCode)
        if (updateError) { /* ... error handling ... */ }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .insert([{ item_id: itemId, store_code: storeCode, quantity: quantity }])
        if (insertError) { /* ... error handling ... */ }
      }
    } else {
      if (existingQuantity) {
        const { error: deleteError } = await supabaseAdmin
          .from('colhetron_separation_quantities')
          .delete()
          .eq('item_id', itemId)
          .eq('store_code', storeCode)
        if (deleteError) { /* ... error handling ... */ }
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