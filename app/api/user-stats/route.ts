// app/api/user-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

interface UserStats {
  totalSeparacoes: number
  mediaItemsSeparados: number
  mediaLojas: number
  tempoMedioSeparacao: string
  separacoesFinalizadas: number
  separacoesAtivas: number
  rankingPosition: number
  totalUsers: number
  eficiencia: number
  diasAtivos: number
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

    const userId = decoded.userId

    // 1. Buscar estatísticas básicas de separações
    const { data: separacoes, error: separacoesError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, created_at, updated_at, status, total_items, total_stores')
      .eq('user_id', userId)

    if (separacoesError) {
      console.error('Erro ao buscar separações:', separacoesError)
      return NextResponse.json({ error: 'Erro ao buscar estatísticas' }, { status: 500 })
    }

    // 2. Calcular estatísticas do usuário
    const totalSeparacoes = separacoes?.length || 0
    const separacoesFinalizadas = separacoes?.filter(sep => sep.status === 'completed').length || 0
    const separacoesAtivas = separacoes?.filter(sep => sep.status === 'active').length || 0

    // Calcular médias
    const mediaItemsSeparados = separacoesFinalizadas > 0 
      ? Math.round(separacoes
          .filter(sep => sep.status === 'completed')
          .reduce((acc, sep) => acc + (sep.total_items || 0), 0) / separacoesFinalizadas)
      : 0

    const mediaLojas = separacoesFinalizadas > 0
      ? Math.round(separacoes
          .filter(sep => sep.status === 'completed')
          .reduce((acc, sep) => acc + (sep.total_stores || 0), 0) / separacoesFinalizadas)
      : 0

    // Calcular tempo médio de separação
    const tempoMedioSeparacao = await calculateTempoMedioSeparacao(separacoes.filter(sep => sep.status === 'completed'))

    // 3. Calcular ranking do usuário
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('user_id, status')

    if (usersError) {
      console.error('Erro ao buscar usuários para ranking:', usersError)
      return NextResponse.json({ error: 'Erro ao calcular ranking' }, { status: 500 })
    }

    // Agrupar separações por usuário
    const userSeparacoes = allUsers?.reduce((acc: any, sep) => {
      if (!acc[sep.user_id]) {
        acc[sep.user_id] = { total: 0, finalizadas: 0 }
      }
      acc[sep.user_id].total++
      if (sep.status === 'completed') {
        acc[sep.user_id].finalizadas++
      }
      return acc
    }, {}) || {}

    // Calcular ranking baseado em separações finalizadas
    const rankings = Object.entries(userSeparacoes)
      .map(([id, stats]: [string, any]) => ({
        userId: id,
        separacoesFinalizadas: stats.finalizadas
      }))
      .sort((a, b) => b.separacoesFinalizadas - a.separacoesFinalizadas)

    const rankingPosition = rankings.findIndex(r => r.userId === userId) + 1
    const totalUsers = rankings.length

    // 4. Calcular eficiência (% de separações finalizadas)
    const eficiencia = totalSeparacoes > 0 
      ? Math.round((separacoesFinalizadas / totalSeparacoes) * 100)
      : 0

    // 5. Calcular dias ativos
    const diasAtivos = await calculateDiasAtivos(userId)

    const stats: UserStats = {
      totalSeparacoes,
      mediaItemsSeparados,
      mediaLojas,
      tempoMedioSeparacao,
      separacoesFinalizadas,
      separacoesAtivas,
      rankingPosition,
      totalUsers,
      eficiencia,
      diasAtivos
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Erro ao buscar estatísticas do usuário:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Função para calcular tempo médio de separação
async function calculateTempoMedioSeparacao(separacoesFinalizadas: any[]): Promise<string> {
  if (separacoesFinalizadas.length === 0) return '0h 0m'

  let totalMinutos = 0
  let validSeparacoes = 0

  for (const separacao of separacoesFinalizadas) {
    if (separacao.created_at && separacao.updated_at) {
      const inicio = new Date(separacao.created_at)
      const fim = new Date(separacao.updated_at)
      const diferencaMinutos = Math.floor((fim.getTime() - inicio.getTime()) / (1000 * 60))
      
      if (diferencaMinutos > 0 && diferencaMinutos < 1440) { // Máximo 24 horas
        totalMinutos += diferencaMinutos
        validSeparacoes++
      }
    }
  }

  if (validSeparacoes === 0) return '0h 0m'

  const mediaMinutos = Math.round(totalMinutos / validSeparacoes)
  const horas = Math.floor(mediaMinutos / 60)
  const minutos = mediaMinutos % 60

  return `${horas}h ${minutos}m`
}

// Função para calcular dias ativos
async function calculateDiasAtivos(userId: string): Promise<number> {
  try {
    const { data: atividades, error } = await supabaseAdmin
      .from('colhetron_user_activities')
      .select('created_at')
      .eq('user_id', userId)

    if (error || !atividades) return 0

    // Agrupar por data
    const diasUnicos = new Set(
      atividades.map(atividade => {
        const data = new Date(atividade.created_at)
        return data.toISOString().split('T')[0]
      })
    )

    return diasUnicos.size
  } catch (error) {
    console.error('Erro ao calcular dias ativos:', error)
    return 0
  }
}