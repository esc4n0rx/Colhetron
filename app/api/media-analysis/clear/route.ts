import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

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
      .from('colhetron_media_analysis')
      .delete()
      .eq('user_id', decoded.userId)

    if (error) {
      console.error('Erro ao limpar análise de médias:', error)
      return NextResponse.json({ error: 'Erro ao limpar dados' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Todos os dados foram limpos com sucesso' })

  } catch (error) {
    console.error('Erro na API de limpeza:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}