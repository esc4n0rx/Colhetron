
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

    const { searchParams } = new URL(request.url)
    const separationId = searchParams.get('separationId')

    if (!separationId) {
      return NextResponse.json({ error: 'ID da separação é obrigatório' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('colhetron_reinforcement_prints')
      .select('data')
      .eq('separation_id', separationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('Erro ao buscar dados do reforço:', error)
      return NextResponse.json({ error: 'Nenhum dado de reforço encontrado para esta separação.' }, { status: 404 })
    }

    if (!data || !data.data) {
        return NextResponse.json({ error: 'Dados do reforço estão vazios ou corrompidos.' }, { status: 404 })
    }

    return NextResponse.json(data.data)

  } catch (error) {
    console.error('Erro na API de busca de reforço:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}