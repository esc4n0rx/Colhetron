import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'


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

    // Buscar separação ativa do usuário
    const { data: separation, error } = await supabaseAdmin
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
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error
    }

    if (!separation) {
      return NextResponse.json({ separation: null })
    }

    return NextResponse.json({ separation })

  } catch (error) {
    console.error('Erro ao buscar separação ativa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}