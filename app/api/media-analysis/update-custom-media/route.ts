// app/api/media-analysis/update-custom-media/route.ts (CORRIGIDO)
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const updateCustomMediaSchema = z.object({
  item_id: z.string().min(1, 'ID do item é obrigatório'),
  custom_media: z.number().min(0.01, 'Média deve ser maior que 0').max(999, 'Média muito alta')
})

export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticação
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

    // Validar dados da requisição
    const body = await request.json()
    const { item_id, custom_media } = updateCustomMediaSchema.parse(body)

    // Buscar o item atual
    const { data: currentItem, error: fetchError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('id, codigo, material, media_sistema, quantidade_kg, quantidade_caixas, estoque_atual, user_id')
      .eq('id', item_id)
      .eq('user_id', decoded.userId)
      .single()

    if (fetchError || !currentItem) {
      return NextResponse.json(
        { error: 'Item não encontrado ou não autorizado' },
        { status: 404 }
      )
    }

    // Calcular nova média real (permanece baseada no estoque atual)
    const novaMediaReal = currentItem.estoque_atual > 0 ? 
      currentItem.quantidade_kg / currentItem.estoque_atual : 0

    // Diferença permanece baseada na quantidade original de caixas vs estoque
    const novaDiferencaCaixas = currentItem.quantidade_caixas - currentItem.estoque_atual

    // Recalcular status com a nova média personalizada
    let novoStatus = 'OK'
    
    // 1. Se quantidade de caixas > estoque atual = CRÍTICO
    if (currentItem.quantidade_caixas > currentItem.estoque_atual) {
      novoStatus = 'CRÍTICO'
    }
    // 2. Se estoque atual = 0 = OK
    else if (currentItem.estoque_atual === 0) {
      novoStatus = 'OK'
    }
    // 3. Se estoque suficiente, verificar se média personalizada é inteira
    else {
      const mediaPersonalizadaInteira = Number.isInteger(custom_media)
      
      if (!mediaPersonalizadaInteira) {
        novoStatus = 'ATENÇÃO'
      } else {
        novoStatus = 'OK'
      }
    }

    // Calcular a média original para comparação
    const mediaOriginal = currentItem.quantidade_caixas > 0 ? 
      currentItem.quantidade_kg / currentItem.quantidade_caixas : 0

    // Metadados para indicar que é uma média personalizada
    const metadata = {
      is_custom_media: true,
      original_calculated_media: Number(mediaOriginal.toFixed(2)),
      custom_media_set_at: new Date().toISOString(),
      custom_media_set_by: decoded.userId
    }

    // Atualizar item - ALTERANDO APENAS CAMPOS EXISTENTES
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .update({
        media_sistema: custom_media,  // Alterar diretamente a média sistema
        media_real: Number(novaMediaReal.toFixed(2)),
        diferenca_caixas: novaDiferencaCaixas,
        status: novoStatus,
        metadata: metadata,  // Usar campo metadata para rastrear personalização
        updated_at: new Date().toISOString()
      })
      .eq('id', item_id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar média personalizada:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar média personalizada' },
        { status: 500 }
      )
    }

    // Registrar atividade no log
    await logActivity({
      userId: decoded.userId,
      action: 'Média personalizada definida',
      details: `Item ${currentItem.codigo} - ${currentItem.material}. Média alterada de ${currentItem.media_sistema.toFixed(2)} para ${custom_media.toFixed(2)}`,
      type: 'media_analysis',
      metadata: {
        item_id: item_id,
        item_code: currentItem.codigo,
        previous_media: currentItem.media_sistema,
        new_custom_media: custom_media,
        original_calculated_media: mediaOriginal,
        status_after_change: novoStatus
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Média personalizada atualizada com sucesso',
      item: updatedItem
    })

  } catch (error) {
    console.error('Erro na API de média personalizada:', error)
    
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