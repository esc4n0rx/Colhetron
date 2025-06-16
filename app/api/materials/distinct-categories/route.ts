// app/api/materials/distinct-categories/route.ts
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

    // Buscar categorias distintas da coluna diurno (que será nossa categoria principal)
    const { data: categories, error } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('diurno')
      .not('diurno', 'is', null)
      .not('diurno', 'eq', '')

    if (error) {
      console.error('Erro ao buscar categorias:', error)
      return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
    }

    // Extrair valores únicos e filtrar vazios
    const distinctCategories = [...new Set(
      categories
        .map(item => item.diurno)
        .filter(category => category && category.trim() !== '')
    )].sort()

    return NextResponse.json({ categories: distinctCategories })

  } catch (error) {
    console.error('Erro ao buscar categorias distintas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}