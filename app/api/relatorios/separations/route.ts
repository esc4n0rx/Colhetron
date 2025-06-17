import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const filtersSchema = z.object({
  type: z.enum(['SP', 'ES', 'RJ', '']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['completed', 'active', '']).optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10')
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Token de autorização ausente ou inválido')
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 })
    }
    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const rawFilters = {
      type: searchParams.get('type'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    }
    let filters
    try {
      filters = filtersSchema.parse(rawFilters)
    } catch (validationError) {
      console.log('Erro na validação dos filtros:', validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Parâmetros inválidos', 
          details: validationError.errors 
        }, { status: 400 })
      }
      throw validationError
    }
    let separationsQuery = supabaseAdmin
      .from('colhetron_separations')
      .select('id, type, date, status, file_name, total_items, total_stores, created_at, updated_at, user_id')
      .eq('user_id', decoded.userId)
      .order('created_at', { ascending: false })

    if (filters.type) {
      separationsQuery = separationsQuery.eq('type', filters.type)
    }
    if (filters.status) {
      separationsQuery = separationsQuery.eq('status', filters.status)
    }
    if (filters.dateFrom) {
      separationsQuery = separationsQuery.gte('date', filters.dateFrom)
    }
    if (filters.dateTo) {
      separationsQuery = separationsQuery.lte('date', filters.dateTo)
    }

    let countQuery = supabaseAdmin
      .from('colhetron_separations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', decoded.userId)

    if (filters.type) countQuery = countQuery.eq('type', filters.type)
    if (filters.status) countQuery = countQuery.eq('status', filters.status)
    if (filters.dateFrom) countQuery = countQuery.gte('date', filters.dateFrom)
    if (filters.dateTo) countQuery = countQuery.lte('date', filters.dateTo)

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Erro ao contar separações:', countError)
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }
    const from = (filters.page - 1) * filters.limit
    const to = from + filters.limit - 1
    const { data: separationsData, error: separationsError } = await separationsQuery.range(from, to)

    if (separationsError) {
      console.error('Erro ao buscar separações:', separationsError)
      return NextResponse.json({ error: 'Erro ao buscar separações' }, { status: 500 })
    }
    const { data: userData, error: userError } = await supabaseAdmin
      .from('colhetron_user')
      .select('id, name, email')
      .eq('id', decoded.userId)
      .single()

    if (userError) {
      console.error('Erro ao buscar dados do usuário:', userError)
      return NextResponse.json({ error: 'Erro ao buscar dados do usuário' }, { status: 500 })
    }
    const separations = separationsData?.map(separation => ({
      ...separation,
      user: {
        name: userData.name,
        email: userData.email
      }
    })) || []

    const totalPages = Math.ceil((count || 0) / filters.limit)

    const response = {
      separations,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: count || 0,
        totalPages
      }
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Erro geral:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Parâmetros inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}