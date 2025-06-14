// app/api/faturamento/check-media-status/route.ts
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

    // Buscar todos os itens da análise de médias
    const { data: mediaItems, error } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('id, codigo, material, status')
      .eq('user_id', decoded.userId)

    if (error) {
      console.error('Erro ao buscar itens de análise de médias:', error)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    if (!mediaItems || mediaItems.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum item encontrado na análise de médias. Execute a análise primeiro.' 
      }, { status: 404 })
    }

    // Filtrar itens que não estão com status OK
    const errorItems = mediaItems.filter(item => item.status !== 'OK')

    const result = {
      totalItems: mediaItems.length,
      itemsWithError: errorItems.length,
      errorItems: errorItems.map(item => ({
        id: item.id,
        codigo: item.codigo,
        material: item.material,
        status: item.status,
        error: getErrorMessage(item.status)
      }))
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Erro ao verificar status das médias:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

function getErrorMessage(status: string): string {
  switch (status) {
    case 'ATENÇÃO':
      return 'Diferença de mais de 10% entre estoque e quantidade prevista'
    case 'CRÍTICO':
      return 'Diferença de mais de 20% ou estoque zerado'
    default:
      return 'Status não identificado'
  }
}