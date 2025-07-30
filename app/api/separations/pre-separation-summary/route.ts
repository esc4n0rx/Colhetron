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

    // Buscar dados dos itens com suas quantidades, filtrando por separation_id
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        type_separation,
        colhetron_separation_quantities!inner (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', activeSeparation.id)
      .gt('colhetron_separation_quantities.quantity', 0)

    if (itemsError) {
      console.error('Erro ao buscar itens:', itemsError)
      return NextResponse.json({ error: 'Erro interno do servidor ao buscar itens' }, { status: 500 })
    }

    // Buscar códigos de loja únicos que têm itens com quantidade > 0
    const { data: storesWithQuantities, error: storesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code')
      .eq('separation_id', activeSeparation.id)
      .gt('quantity', 0)

    if (storesError) {
      console.error('Erro ao buscar lojas com quantidades:', storesError)
      return NextResponse.json({ error: 'Erro interno do servidor ao buscar lojas' }, { status: 500 })
    }

    const uniqueStoreCodes = [...new Set(storesWithQuantities?.map(s => s.store_code) || [])]

    if (uniqueStoreCodes.length === 0) {
      return NextResponse.json({
        data: [],
        zones: []
      })
    }

    // Buscar informações de zona para as lojas relevantes
    const { data: lojas, error: lojasError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, zonaSeco, zonaFrio')
      .in('prefixo', uniqueStoreCodes)

    if (lojasError) {
      console.error('Erro ao buscar dados das lojas:', lojasError)
      return NextResponse.json({ error: 'Erro interno do servidor ao buscar dados das lojas' }, { status: 500 })
    }

    const lojasMap = new Map<string, { zonaSeco: string; zonaFrio: string }>()
    lojas?.forEach(loja => {
      lojasMap.set(loja.prefixo, { zonaSeco: loja.zonaSeco, zonaFrio: loja.zonaFrio })
    })

    const summary = new Map<string, {
      tipoSepar: string
      material_code: string
      description: string
      zones: Map<string, number>
    }>()
    
    // Processar itens
    for (const item of items || []) {
      // **AJUSTE PRINCIPAL: Criar uma chave única combinando código do material e tipo de separação**
      const uniqueKey = `${item.material_code}|${item.type_separation}`;

      if (!summary.has(uniqueKey)) {
        summary.set(uniqueKey, {
          tipoSepar: item.type_separation || 'SECO',
          material_code: item.material_code,
          description: item.description,
          zones: new Map<string, number>()
        })
      }

      const summaryItem = summary.get(uniqueKey)!

      const quantities = (item.colhetron_separation_quantities || []) as { store_code: string; quantity: number }[];
      
      for (const qty of quantities) {
        if (qty.quantity > 0) {
          const lojaInfo = lojasMap.get(qty.store_code)
          if (lojaInfo) {
            const zone = item.type_separation === 'FRIO' ? lojaInfo.zonaFrio : lojaInfo.zonaSeco
            if (zone) {
              summaryItem.zones.set(zone, (summaryItem.zones.get(zone) || 0) + qty.quantity)
            }
          }
        }
      }
    }

    const allZones = new Set<string>()
    const formattedData = Array.from(summary.values()).map(item => {
      let totalGeral = 0
      const zoneData: { [key: string]: number } = {}

      item.zones.forEach((quantity, zone) => {
        allZones.add(zone)
        totalGeral += quantity
        zoneData[zone] = quantity
      })

      return {
        tipoSepar: item.tipoSepar,
        material: item.description, // Usar a descrição para exibição
        ...zoneData,
        totalGeral,
      }
    })

    // Filtrar itens que, após o processamento, não têm quantidade
    const dataWithQuantity = formattedData.filter(item => item.totalGeral > 0)
    
    // Garantir que todas as zonas existentes sejam colunas em todas as linhas
    const sortedZones = Array.from(allZones).sort()

    const finalData = dataWithQuantity.map(row => {
      const completeRow: { [key: string]: any } = { ...row }
      sortedZones.forEach(zone => {
        if (!(zone in completeRow)) {
          completeRow[zone] = 0
        }
      })
      return completeRow
    }).sort((a, b) => a.material.localeCompare(b.material)) // Ordenar por descrição do material

    return NextResponse.json({
      data: finalData,
      zones: sortedZones
    })

  } catch (error) {
    console.error('Erro na API de pré-separação:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}