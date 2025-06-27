import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
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

    const { data: activeSeparation } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    const { data: mediaItems, error } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar dados da média:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    if (!mediaItems || mediaItems.length === 0) {
      return NextResponse.json({ 
        data: [], 
        message: activeSeparation 
          ? 'Nenhum item na análise de médias. Use "Colar Dados" ou "Adicionar Item" para fazer upload.'
          : 'Nenhuma separação ativa encontrada. Crie uma separação primeiro.',
        separationInfo: activeSeparation ? {
          id: activeSeparation.id,
          isActive: true,
          status: 'active'
        } : null
      })
    }

    const separationInfo = {
      id: activeSeparation?.id || null,
      isActive: !!activeSeparation,
      status: activeSeparation ? 'active' : 'completed'
    }

    return NextResponse.json({
      data: mediaItems,
      separationInfo
    })

  } catch (error) {
    console.error('Erro na API de média:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}