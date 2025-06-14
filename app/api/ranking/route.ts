// app/api/ranking/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

interface RankingUser {
  userId: string
  name: string
  email: string
  totalSeparacoes: number
  separacoesFinalizadas: number
  mediaItemsSeparados: number
  eficiencia: number
  position: number
}

export async function GET(request: NextRequest) {
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

    // 1. Buscar todos os usuários
    const { data: users, error: usersError } = await supabaseAdmin
      .from('colhetron_user')
      .select('id, name, email')

    if (usersError) {
      console.error('Erro ao buscar usuários:', usersError)
      return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 })
    }

    // 2. Buscar separações de todos os usuários
    const { data: separacoes, error: separacoesError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('user_id, status, total_items')

    if (separacoesError) {
      console.error('Erro ao buscar separações:', separacoesError)
      return NextResponse.json({ error: 'Erro ao buscar separações' }, { status: 500 })
    }

    // 3. Calcular estatísticas por usuário
    const userStats = users?.map(user => {
      const userSeparacoes = separacoes?.filter(sep => sep.user_id === user.id) || []
      const separacoesFinalizadas = userSeparacoes.filter(sep => sep.status === 'finalized')
      
      const totalSeparacoes = userSeparacoes.length
      const totalFinalizadas = separacoesFinalizadas.length
      
      const mediaItemsSeparados = totalFinalizadas > 0
        ? Math.round(separacoesFinalizadas.reduce((acc, sep) => acc + (sep.total_items || 0), 0) / totalFinalizadas)
        : 0

      const eficiencia = totalSeparacoes > 0
        ? Math.round((totalFinalizadas / totalSeparacoes) * 100)
        : 0

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        totalSeparacoes,
        separacoesFinalizadas: totalFinalizadas,
        mediaItemsSeparados,
        eficiencia
      }
    }) || []

    // 4. Ordenar por separações finalizadas (principal) e eficiência (secundário)
    const rankedUsers = userStats
      .sort((a, b) => {
        if (b.separacoesFinalizadas !== a.separacoesFinalizadas) {
          return b.separacoesFinalizadas - a.separacoesFinalizadas
        }
        return b.eficiencia - a.eficiencia
      })
      .map((user, index) => ({
        ...user,
        position: index + 1
      }))

    // 5. Encontrar posição do usuário atual
    const currentUserRanking = rankedUsers.find(user => user.userId === decoded.userId)

    return NextResponse.json({
      ranking: rankedUsers,
      currentUser: currentUserRanking,
      totalUsers: rankedUsers.length
    })

  } catch (error) {
    console.error('Erro ao buscar ranking:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}