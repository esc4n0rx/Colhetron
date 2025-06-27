import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const forceStatusSchema = z.object({
  item_id: z.string().min(1, 'ID do item é obrigatório'),
  reason: z.string().optional()
})

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


    const body = await request.json()
    const { item_id, reason } = forceStatusSchema.parse(body)

    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('id, codigo, material, status, user_id')
      .eq('id', item_id)
      .eq('user_id', decoded.userId)
      .single()

    if (fetchError || !currentItem) {
      return NextResponse.json(
        { error: 'Item não encontrado ou não autorizado' },
        { status: 404 }
      )
    }

    if (currentItem.status === 'OK') {
      return NextResponse.json(
        { error: 'Item já possui status OK' },
        { status: 400 }
      )
    }

    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .update({
        status: 'OK',
        forced_status: true,
        forced_reason: reason || null,
        forced_at: new Date().toISOString(),
        forced_by: decoded.userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', item_id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao forçar status:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar status do item' },
        { status: 500 }
      )
    }

    await logActivity({
      userId: decoded.userId,
      action: `Status forçado para OK`,
      details: `Item ${currentItem.codigo} - ${currentItem.material}. Status anterior: ${currentItem.status}`,
      type: 'media_analysis',
      metadata: {
        item_id: currentItem.id,
        codigo: currentItem.codigo,
        material: currentItem.material,
        previous_status: currentItem.status,
        new_status: 'OK',
        reason: reason || 'Não informado',
        forced_by: decoded.userId
      }
    })

    return NextResponse.json({
      success: true,
      message: `Status do item ${currentItem.codigo} forçado para OK com sucesso`,
      item: updatedItem
    })

  } catch (error) {
    console.error('Erro ao forçar status:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}