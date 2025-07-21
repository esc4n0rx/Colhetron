// app/api/separations/pre-separation-summary/route.ts
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

    // AJUSTE: Buscar dados dos itens filtrando apenas quantidades > 0 usando separation_id
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
      .gt('colhetron_separation_quantities.quantity', 0) // AJUSTE: Filtrar apenas quantidades > 0

    if (itemsError) {
      console.error('Erro ao buscar itens:', itemsError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    // Buscar dados das lojas usando separation_id
    const { data: storesWithQuantities, error: storesError } = await supabaseAdmin
      .from('colhetron_separation_quantities')
      .select('store_code')
      .eq('separation_id', activeSeparation.id)
      .gt('quantity', 0) // AJUSTE: Filtrar apenas quantidades > 0

    if (storesError) {
      console.error('Erro ao buscar lojas:', storesError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const uniqueStoreCodes = [...new Set(storesWithQuantities?.map(s => s.store_code) || [])]

    if (uniqueStoreCodes.length === 0) {
      return NextResponse.json({ 
        data: [], 
        zones: [] 
      })
    }

    const { data: lojas, error: lojasError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, zonaSeco, zonaFrio')
      .in('prefixo', uniqueStoreCodes)

    if (lojasError) {
      console.error('Erro ao buscar dados das lojas:', lojasError)
      return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }

    const lojasMap = new Map<string, { zonaSeco: string; zonaFrio: string }>()
    lojas?.forEach(loja => {
      lojasMap.set(loja.prefixo, { zonaSeco: loja.zonaSeco, zonaFrio: loja.zonaFrio })
    })

    const summary = new Map<string, {
      tipoSepar: string
      material: string
      zones: Map<string, number>
    }>()

    // Processar apenas itens com quantidades > 0
    const validItems = items?.filter(item => {
      const quantities = item.colhetron_separation_quantities || []
      return quantities.some((qty: any) => qty.quantity > 0)
    }) || []

    for (const item of validItems) {
      const summaryItem = {
        tipoSepar: item.type_separation || 'SECO',
        material: item.material_code,
        zones: new Map<string, number>()
      }

      summary.set(item.material_code, summaryItem)

      // Processar apenas quantidades > 0
      const validQuantities = item.colhetron_separation_quantities.filter((qty: any) => qty.quantity > 0)
      
      for (const qty of validQuantities) {
        const lojaInfo = lojasMap.get(qty.store_code)
        if (lojaInfo) {
          const zone = item.type_separation === 'FRIO' ? lojaInfo.zonaFrio : lojaInfo.zonaSeco
          if (zone) {
            summaryItem.zones.set(zone, (summaryItem.zones.get(zone) || 0) + qty.quantity)
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
        material: item.material,
        ...zoneData,
        totalGeral,
      }
    })
    
    // Filtrar apenas itens que têm quantidade total > 0
    const dataWithQuantity = formattedData.filter(item => item.totalGeral > 0)
    
    const sortedZones = Array.from(allZones).sort()
    
    const finalData = dataWithQuantity.map(row => {
        const completeRow = { ...row }
        sortedZones.forEach(zone => {
            if (!(zone in completeRow)) {
                (completeRow as any)[zone] = 0
            }
        })
        return completeRow
    }).sort((a, b) => a.material.localeCompare(b.material))

    return NextResponse.json({ 
      data: finalData, 
      zones: sortedZones 
    })

  } catch (error) {
    console.error('Erro na API de pré-separação:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}