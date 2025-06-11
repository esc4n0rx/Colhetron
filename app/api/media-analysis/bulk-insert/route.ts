// app/api/media-analysis/bulk-insert/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function POST(request: NextRequest) {
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

    const { items } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Lista de itens é obrigatória' }, { status: 400 })
    }

    // Buscar separação ativa para calcular estoque atual
    const { data: activeSeparation } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    // Processar cada item
    const processedItems = await Promise.all(items.map(async (item) => {
      const mediaSistema = item.quantidadeCaixas > 0 ? item.quantidadeKg / item.quantidadeCaixas : 0
      
      // Calcular estoque atual baseado na separação ativa
      let estoqueAtual = 0
      if (activeSeparation) {
        const { data: itemData } = await supabaseAdmin
          .from('colhetron_separation_items')
          .select(`
            colhetron_separation_quantities(quantity)
          `)
          .eq('separation_id', activeSeparation.id)
          .eq('material_code', item.codigo)

        if (itemData && itemData.length > 0) {
          estoqueAtual = itemData.reduce((sum, itemRow) => {
            return sum + (itemRow.colhetron_separation_quantities?.reduce((qSum: number, q: any) => qSum + q.quantity, 0) || 0)
          }, 0)
        }
      }

      const diferencaCaixas = estoqueAtual - item.quantidadeCaixas
      const mediaReal = estoqueAtual > 0 && item.quantidadeCaixas > 0 ? 
        (item.quantidadeKg * estoqueAtual / item.quantidadeCaixas) / estoqueAtual : 0

      // Determinar status
      let status = 'OK'
      if (Math.abs(diferencaCaixas) > item.quantidadeCaixas * 0.1) {
        status = 'ATENÇÃO'
      }
      if (Math.abs(diferencaCaixas) > item.quantidadeCaixas * 0.2) {
        status = 'CRÍTICO'
      }

      return {
        user_id: decoded.userId,
        codigo: item.codigo,
        material: item.material,
        quantidade_kg: item.quantidadeKg,
        quantidade_caixas: item.quantidadeCaixas,
        media_sistema: mediaSistema,
        estoque_atual: estoqueAtual,
        diferenca_caixas: diferencaCaixas,
        media_real: mediaReal,
        status
      }
    }))

    // Inserir no banco em lotes
    const batchSize = 100
    for (let i = 0; i < processedItems.length; i += batchSize) {
      const batch = processedItems.slice(i, i + batchSize)
      
      const { error: insertError } = await supabaseAdmin
        .from('colhetron_media_analysis')
        .upsert(batch, { 
          onConflict: 'user_id,codigo',
          ignoreDuplicates: false 
        })

      if (insertError) {
        console.error('Erro ao inserir batch:', insertError)
        return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      message: 'Itens adicionados com sucesso',
      count: processedItems.length 
    })

  } catch (error) {
    console.error('Erro no bulk insert:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}