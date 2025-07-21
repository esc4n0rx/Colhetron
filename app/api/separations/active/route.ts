// app/api/separations/active/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function GET(request: NextRequest) {
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

    // Buscar separação ativa do usuário
    const { data: separation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('*')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError && sepError.code !== 'PGRST116') {
      console.error('Erro ao buscar separação ativa:', sepError)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      separation: separation || null
    })

  } catch (error) {
    console.error('Erro ao buscar separação ativa:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}