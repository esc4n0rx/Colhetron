// app/api/media-analysis/item/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const updates = await request.json()

    // Verificar se o item pertence ao usuário
    const { data: existingItem, error: checkError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('*')
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .single()

    if (checkError || !existingItem) {
      return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    }

    // Recalcular valores se quantidade foi alterada
    let processedUpdates = { ...updates }
    
    if ('quantidade_kg' in updates || 'quantidade_caixas' in updates) {
      const quantidadeKg = updates.quantidade_kg ?? existingItem.quantidade_kg
      const quantidadeCaixas = updates.quantidade_caixas ?? existingItem.quantidade_caixas
      
      // Recalcular média sistema
      processedUpdates.media_sistema = quantidadeCaixas > 0 ? quantidadeKg / quantidadeCaixas : 0
      
      // Recalcular diferença
      processedUpdates.diferenca_caixas = existingItem.estoque_atual - quantidadeCaixas
      
      // Recalcular média real
      processedUpdates.media_real = existingItem.estoque_atual > 0 && quantidadeCaixas > 0 ? 
        (quantidadeKg * existingItem.estoque_atual / quantidadeCaixas) / existingItem.estoque_atual : 0
      
      // Recalcular status
      const diferencaCaixas = processedUpdates.diferenca_caixas
      if (Math.abs(diferencaCaixas) > quantidadeCaixas * 0.2) {
        processedUpdates.status = 'CRÍTICO'
      } else if (Math.abs(diferencaCaixas) > quantidadeCaixas * 0.1) {
        processedUpdates.status = 'ATENÇÃO'
      } else {
        processedUpdates.status = 'OK'
      }
    }

    processedUpdates.updated_at = new Date().toISOString()

    // Atualizar item
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .update(processedUpdates)
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar item:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
    }

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Erro na atualização:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // Deletar item
    const { error: deleteError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .delete()
      .eq('id', id)
      .eq('user_id', decoded.userId)

    if (deleteError) {
      console.error('Erro ao deletar item:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar item' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Item deletado com sucesso' })

  } catch (error) {
    console.error('Erro na deleção:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}