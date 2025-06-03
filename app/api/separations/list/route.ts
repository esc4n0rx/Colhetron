import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function GET(request: NextRequest) {
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

    // Buscar separações do usuário
    const { data: separations, error } = await supabaseAdmin
      .from('colhetron_separations')
      .select(`
        id,
        type,
        date,
        status,
        file_name,
        total_items,
        total_stores,
        created_at
      `)
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar separações:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar separações' },
        { status: 500 }
      )
    }

    return NextResponse.json({ separations: separations || [] })

  } catch (error) {
    console.error('Erro na listagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}