// app/api/faturamento/generate-table/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

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

    // Buscar separação ativa
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada. Crie uma separação primeiro.' 
      }, { status: 404 })
    }

    // Buscar itens da separação com suas quantidades
    const { data: separationData, error: dataError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        material_code,
        colhetron_separation_quantities!inner(
          store_code,
          quantity
        )
      `)
      .eq('separation_id', activeSeparation.id)
      .gt('colhetron_separation_quantities.quantity', 0)

    if (dataError) {
      return NextResponse.json({ error: 'Erro ao buscar dados de separação' }, { status: 500 })
    }

    // Buscar dados das lojas para converter store_code em centro
    const storeCodes = [...new Set(separationData?.flatMap(item => 
      item.colhetron_separation_quantities.map(qty => qty.store_code)
    ) || [])]

    const { data: storesData, error: storesError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, centro')
      .in('prefixo', storeCodes)

    if (storesError) {
      return NextResponse.json({ error: 'Erro ao buscar dados das lojas' }, { status: 500 })
    }

    // Criar mapa de store_code para centro
    const storeToCenter = new Map<string, string>()
    storesData?.forEach(store => {
      if (store.centro) {
        storeToCenter.set(store.prefixo, store.centro)
      }
    })

    // Montar dados da tabela de faturamento
    const faturamentoItems: {
      material: string
      loja: string
      centro: string
      quantidade: number
    }[] = []

    separationData?.forEach(item => {
      item.colhetron_separation_quantities.forEach(qty => {
        const centro = storeToCenter.get(qty.store_code)
        if (centro) { // Só incluir se tiver centro mapeado
          faturamentoItems.push({
            material: item.material_code,
            loja: qty.store_code,
            centro: centro,
            quantidade: qty.quantity
          })
        }
      })
    })

    return NextResponse.json({
      items: faturamentoItems,
      totalItems: faturamentoItems.length,
      totalVolume: faturamentoItems.reduce((sum, item) => sum + item.quantidade, 0)
    })

  } catch (error) {
    console.error('Erro ao gerar tabela de faturamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}