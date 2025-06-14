// app/api/user-activities/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const activitySchema = z.object({
  action: z.string().min(1, 'Ação é obrigatória'),
  details: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  type: z.enum(['upload', 'login', 'separation', 'media_analysis', 'profile_update', 'settings_change']).optional()
})

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  type: z.string().optional()
})

// GET - Buscar atividades do usuário
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

    // Validar query parameters
    const url = new URL(request.url)
    const queryParams = {
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20',
      type: url.searchParams.get('type') || undefined
    }

    const { page, limit, type } = querySchema.parse(queryParams)
    
    const pageNumber = parseInt(page)
    const limitNumber = parseInt(limit)
    const offset = (pageNumber - 1) * limitNumber

    // Construir query
    let query = supabaseAdmin
      .from('colhetron_user_activities')
      .select('*', { count: 'exact' })
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNumber - 1)

    // Filtrar por tipo se especificado
    if (type) {
      query = query.eq('type', type)
    }

    const { data: activities, error, count } = await query

    if (error) {
      console.error('Erro ao buscar atividades:', error)
      return NextResponse.json({ error: 'Erro ao buscar atividades' }, { status: 500 })
    }

    // Formatar atividades para o frontend
    const formattedActivities = activities?.map(activity => ({
      id: activity.id,
      action: activity.action,
      details: activity.details || '',
      type: activity.type || 'info',
      metadata: activity.metadata || {},
      time: formatTimeAgo(activity.created_at),
      created_at: activity.created_at
    })) || []

    return NextResponse.json({
      activities: formattedActivities,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNumber)
      }
    })

  } catch (error) {
    console.error('Erro ao buscar atividades:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Registrar nova atividade
export async function POST(request: NextRequest) {
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

    // Validar dados
    const body = await request.json()
    const validatedData = activitySchema.parse(body)

    // Inserir atividade
    const { data: activity, error } = await supabaseAdmin
      .from('colhetron_user_activities')
      .insert([{
        user_id: decoded.userId,
        action: validatedData.action,
        details: validatedData.details || '',
        type: validatedData.type || 'info',
        metadata: validatedData.metadata || {},
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro ao registrar atividade:', error)
      return NextResponse.json({ error: 'Erro ao registrar atividade' }, { status: 500 })
    }

    return NextResponse.json({ activity })

  } catch (error) {
    console.error('Erro ao registrar atividade:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Função para formatar tempo relativo
function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'Agora'
  if (diffInMinutes < 60) return `${diffInMinutes} min atrás`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h atrás`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays} dia${diffInDays > 1 ? 's' : ''} atrás`
  
  const diffInMonths = Math.floor(diffInDays / 30)
  return `${diffInMonths} mês${diffInMonths > 1 ? 'es' : ''} atrás`
}