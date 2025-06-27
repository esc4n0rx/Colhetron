import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

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

    const items = await getFaturamentoItems(decoded.userId)

    const materialCodes = [...new Set(items.map(item => item.material))]
    
    const { data: mediaItems, error: mediaError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('codigo, media_sistema')
      .eq('user_id', decoded.userId)
      .in('codigo', materialCodes)

    if (mediaError) {
      console.error('Erro ao buscar médias:', mediaError)
      return NextResponse.json({ error: 'Erro ao buscar médias do sistema' }, { status: 500 })
    }

    const mediaMap = new Map<string, number>()
    mediaItems?.forEach(item => {
      mediaMap.set(item.codigo, item.media_sistema)
    })

    const missingMedias = materialCodes.filter(code => !mediaMap.has(code))
    if (missingMedias.length > 0) {
      return NextResponse.json({ 
        error: `Médias não encontradas para os materiais: ${missingMedias.join(', ')}. Execute a análise de médias primeiro.` 
      }, { status: 400 })
    }

    const currentDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    
    const excelData = items.map(item => {
      const mediaSistema = mediaMap.get(item.material) || 0
      const qtdCalculada = item.quantidade * mediaSistema

      return {
        'Data': currentDate,
        'Centro': item.centro,
        'Grupo Comprador': 'F06',
        'Código fornecedor': 'CD03',
        'Codigo': item.material,
        'QTD': Math.round(qtdCalculada * 100) / 100,
        'DP': 'DP01'
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturamento')

    const columnWidths = [
      { wch: 12 }, // Data
      { wch: 10 }, // Centro
      { wch: 15 }, // Grupo Comprador
      { wch: 15 }, // Código fornecedor
      { wch: 15 }, // Codigo
      { wch: 12 }, // QTD
      { wch: 8 }   // DP
    ]
    worksheet['!cols'] = columnWidths

    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    return new Response(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="faturamento_${new Date().toISOString().split('T')[0]}.xlsx"`
      }
    })

  } catch (error) {
    console.error('Erro ao gerar template Excel:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

async function getFaturamentoItems(userId: string) {
  const { data: activeSeparation, error: sepError } = await supabaseAdmin
    .from('colhetron_separations')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (sepError || !activeSeparation) {
    throw new Error('Nenhuma separação ativa encontrada')
  }

  const { data: separationItems, error: itemsError } = await supabaseAdmin
    .from('colhetron_separation_items')
    .select('id, material_code')
    .eq('separation_id', activeSeparation.id)

  if (itemsError || !separationItems) {
    throw new Error('Erro ao buscar itens de separação')
  }

  const itemIds = separationItems.map(item => item.id)
  
  const { data: separationQuantities, error: quantitiesError } = await supabaseAdmin
    .from('colhetron_separation_quantities')
    .select('store_code, quantity, item_id')
    .in('item_id', itemIds)
    .gt('quantity', 0)

  if (quantitiesError || !separationQuantities) {
    throw new Error('Erro ao buscar dados de separação')
  }

  const itemToMaterialMap = new Map<string, string>()
  separationItems.forEach(item => {
    itemToMaterialMap.set(item.id, item.material_code)
  })

  const uniqueStoreCodes = [...new Set(separationQuantities.map(sq => sq.store_code))]
  
  const { data: lojas, error: lojasError } = await supabaseAdmin
  .from('colhetron_lojas')
  .select('prefixo, centro')
  .in('prefixo', uniqueStoreCodes) 

  if (lojasError) {
    throw new Error('Erro ao buscar dados de lojas')
  }


  const storeToCenter = new Map<string, string>()
  lojas?.forEach(loja => {
    if (loja.centro) {
      storeToCenter.set(loja.prefixo, loja.centro)
    }
  })

  const lojasWithoutCenter = uniqueStoreCodes.filter(store => !storeToCenter.has(store))
  if (lojasWithoutCenter.length > 0) {
    throw new Error(`Lojas sem centro definido: ${lojasWithoutCenter.join(', ')}`)
  }

  const faturamentoMap = new Map<string, any>()

  separationQuantities.forEach(sq => {
    const materialCode = itemToMaterialMap.get(sq.item_id)
    const centro = storeToCenter.get(sq.store_code)
    
    if (!materialCode || !centro) return

    const key = `${sq.store_code}-${materialCode}`
    
    if (faturamentoMap.has(key)) {
      const existing = faturamentoMap.get(key)!
      existing.quantidade += sq.quantity
    } else {
      faturamentoMap.set(key, {
        loja: sq.store_code,
        centro: centro,
        material: materialCode,
        quantidade: sq.quantity
      })
    }
  })

  return Array.from(faturamentoMap.values())
}