// app/api/separations/product-search/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().min(1, 'Query é obrigatória'),
  limit: z.number().min(1).max(100).default(20)
})

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
    const validatedParams = searchSchema.parse({
      query: searchParams.get('query') || '',
      limit: parseInt(searchParams.get('limit') || '20')
    })

    // Buscar separação ativa
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      return NextResponse.json({ error: 'Nenhuma separação ativa encontrada' }, { status: 404 })
    }

    // Buscar produtos com quantidades > 0 usando separation_id
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        colhetron_separation_quantities!inner (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', activeSeparation.id)
      .gt('colhetron_separation_quantities.quantity', 0) // AJUSTE: Filtrar apenas quantidades > 0
      .or(`material_code.ilike.%${validatedParams.query}%,description.ilike.%${validatedParams.query}%`)
      .limit(validatedParams.limit)

    if (itemsError) {
      console.error('Erro ao buscar produtos:', itemsError)
      return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
    }

    const products = items?.map(item => {
      const quantities = item.colhetron_separation_quantities || []
      // Filtrar apenas quantidades > 0 no mapeamento também
      const validQuantities = quantities.filter((q: any) => q.quantity > 0)
      const totalDistributed = validQuantities.reduce((sum: number, q: any) => sum + q.quantity, 0)
      
      return {
        id: item.id,
        material_code: item.material_code,
        description: item.description,
        total_distributed: totalDistributed,
        stores: validQuantities.map((q: any) => ({
          store_code: q.store_code,
          quantity: q.quantity,
          item_id: item.id
        }))
      }
    }) || []

    // Filtrar produtos que realmente têm quantidade distribuída > 0
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