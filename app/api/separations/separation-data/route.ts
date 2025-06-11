// app/api/separations/separation-data/route.ts
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

    // 1. Encontrar a separação ativa do usuário
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      return NextResponse.json({ data: [], lojas: [] })
    }

    // 2. Buscar todos os itens e suas quantidades para a separação ativa
    const { data: itemsWithQuantities, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        description,
        type_separation,
        colhetron_separation_quantities (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', activeSeparation.id)

    if (itemsError) throw new Error(`Erro ao buscar itens: ${itemsError.message}`)

    // 3. Buscar todas as lojas cadastradas pelo usuário
    const { data: lojas, error: lojasError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, nome, zonaSeco, subzonaSeco, zonaFrio, ordemSeco, ordemFrio')
      .eq('user_id', decoded.userId)

    if (lojasError) throw new Error(`Erro ao buscar lojas: ${lojasError.message}`)

    const lojasMap = new Map(lojas.map(loja => [loja.prefixo, loja]))

    // 4. Processar dados para o formato da tabela
    const separationData = itemsWithQuantities.map(item => {
      const quantities: { [key: string]: number } = {}
      
      // Adicionar quantidades para todas as lojas
      item.colhetron_separation_quantities.forEach(qty => {
        if (lojasMap.has(qty.store_code)) {
          quantities[qty.store_code] = qty.quantity
        }
      })

      return {
        id: item.id,
        material: item.description,
        tipoSepar: item.type_separation,
        ...quantities
      }
    })

    return NextResponse.json({ 
      data: separationData,
      lojas: lojas 
    })

  } catch (error) {
    console.error('Erro na API de separação:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}