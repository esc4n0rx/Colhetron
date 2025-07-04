import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'

export async function DELETE(request: NextRequest) {
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

    const { separationId } = await request.json()

    if (!separationId) {
      return NextResponse.json(
        { error: 'ID da separação é obrigatório' },
        { status: 400 }
      )
    }

    const { data: separation, error: checkError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, user_id, file_name, type, status')
      .eq('id', separationId)
      .eq('user_id', decoded.userId)
      .single()

    if (checkError || !separation) {
      return NextResponse.json(
        { error: 'Separação não encontrada ou não autorizada' },
        { status: 404 }
      )
    }

    const { error: deleteError } = await supabaseAdmin
      .from('colhetron_separations')
      .delete()
      .eq('id', separationId)
      .eq('user_id', decoded.userId)

    if (deleteError) {
      console.error('Erro ao deletar separação:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao deletar separação' },
        { status: 500 }
      )
    }

    const { error: clearError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .delete()
      .eq('user_id', decoded.userId)

    if (clearError) {
      console.error('Erro ao limpar análise de médias:', clearError)
      await logActivity({
        userId: decoded.userId,
        action: 'Erro ao limpar análise de médias',
        details: `Erro durante exclusão da separação: ${clearError.message}`,
        type: 'error'
      })
    } else {
      await logActivity({
        userId: decoded.userId,
        action: 'Análise de médias limpa',
        details: `Análise de médias limpa com sucesso após exclusão da separação ${separation.type}.`,
        type: 'media_analysis'
      })
      console.log('Tabela colhetron_media_analysis limpa com sucesso após exclusão')
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Separação deletada',
      details: `Separação ${separation.type} (${separation.file_name}) deletada com sucesso. Análise de médias limpa.`,
      type: 'separation',
      metadata: {
        separationId: separation.id,
        fileName: separation.file_name,
        type: separation.type,
        status: separation.status,
        mediaAnalysisCleared: clearError ? false : true
      }
    })

    return NextResponse.json({
      message: 'Separação deletada com sucesso',
      fileName: separation.file_name,
      mediaAnalysisCleared: clearError ? false : true
    })

  } catch (error) {
    console.error('Erro na deleção:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}