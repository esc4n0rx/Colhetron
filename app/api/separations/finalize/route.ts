// app/api/separations/finalize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Buscar separação ativa do usuário
    const { data: activeSeparation, error: fetchError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (fetchError || !activeSeparation) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada' 
      }, { status: 404 })
    }

    // Finalizar separação
    const { data: finalizedSeparation, error: updateError } = await supabaseAdmin
      .from('colhetron_separations')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', activeSeparation.id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao finalizar separação:', updateError)
      return NextResponse.json({ 
        error: 'Erro ao finalizar separação' 
      }, { status: 500 })
    }

    // NOVO: Limpar completamente a tabela colhetron_media_analysis para o usuário
    const { error: clearError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .delete()
      .eq('user_id', decoded.userId)

    if (clearError) {
      console.error('Erro ao limpar análise de médias:', clearError)
      // Log do erro mas não falha a operação principal
      await logActivity({
        userId: decoded.userId,
        action: 'Erro ao limpar análise de médias',
        details: `Erro durante finalização da separação: ${clearError.message}`,
        type: 'error'
      })
    } else {
      console.log('✅ Tabela colhetron_media_analysis limpa com sucesso após finalização')
    }

    // Registrar atividade
    await logActivity({
      userId: decoded.userId,
      action: 'Separação finalizada',
      details: `Separação ${activeSeparation.type} finalizada com sucesso. Análise de médias limpa.`,
      type: 'separation',
      metadata: {
        separationId: activeSeparation.id,
        type: activeSeparation.type,
        totalItems: activeSeparation.total_items,
        totalStores: activeSeparation.total_stores,
        duration: calculateDuration(activeSeparation.created_at),
        mediaAnalysisCleared: clearError ? false : true
      }
    })

    return NextResponse.json({
      message: 'Separação finalizada com sucesso',
      separation: finalizedSeparation,
      mediaAnalysisCleared: clearError ? false : true
    })

  } catch (error) {
    console.error('Erro ao finalizar separação:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}

// Função auxiliar para calcular duração
function calculateDuration(startDate: string): string {
  const start = new Date(startDate)
  const end = new Date()
  const diffMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  
  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  
  return `${hours}h ${minutes}m`
}