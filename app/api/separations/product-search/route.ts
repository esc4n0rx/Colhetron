// app/api/separations/product-search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1, 'Query é obrigatória'),
  type: z.enum(['code', 'description'])
})

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

    // Validar parâmetros
    const url = new URL(request.url)
    const query = url.searchParams.get('query')
    const type = url.searchParams.get('type')

    const validatedParams = searchSchema.parse({ query, type })

    // Buscar separação ativa
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada' 
      }, { status: 404 })
    }

    // Buscar produtos baseado no tipo de pesquisa
    let itemsQuery = supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        colhetron_separation_quantities (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', activeSeparation.id)

    if (validatedParams.type === 'code') {
      itemsQuery = itemsQuery.ilike('material_code', `%${validatedParams.query}%`)
    } else {
      itemsQuery = itemsQuery.ilike('description', `%${validatedParams.query}%`)
    }

    const { data: items, error: itemsError } = await itemsQuery.limit(10)

    if (itemsError) {
      console.error('Erro ao buscar produtos:', itemsError)
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
    }

    // Processar resultados
    const products = items?.map(item => {
      const quantities = item.colhetron_separation_quantities || []
      const totalDistributed = quantities.reduce((sum, q) => sum + q.quantity, 0)
      
      return {
        id: item.id,
        material_code: item.material_code,
        description: item.description,
        total_distributed: totalDistributed,
        stores: quantities.map(q => ({
          store_code: q.store_code,
          quantity: q.quantity,
          item_id: item.id
        }))
      }
    }) || []

    // Filtrar apenas produtos com quantidade > 0
    const productsWithQuantity = products.filter(p => p.total_distributed > 0)

    return NextResponse.json({
      products: productsWithQuantity,
      total: productsWithQuantity.length
    })

  } catch (error) {
    console.error('Erro na busca de produtos:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}