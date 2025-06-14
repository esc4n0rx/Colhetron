// app/api/faturamento/generate-excel/route.ts
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

    // 1. Gerar dados da tabela de faturamento (reutilizar lógica)
    const items = await getFaturamentoItems(decoded.userId)

    // 2. Buscar médias do sistema para cada material
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

    // Criar mapa de código para média
    const mediaMap = new Map<string, number>()
    mediaItems?.forEach(item => {
      mediaMap.set(item.codigo, item.media_sistema)
    })

    // 3. Verificar se todas as médias foram encontradas
    const missingMedias = materialCodes.filter(code => !mediaMap.has(code))
    if (missingMedias.length > 0) {
      return NextResponse.json({ 
        error: `Médias não encontradas para os materiais: ${missingMedias.join(', ')}. Execute a análise de médias primeiro.` 
      }, { status: 400 })
    }

    // 4. Gerar dados para o Excel
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
        'QTD': Math.round(qtdCalculada * 100) / 100, // Arredondar para 2 casas decimais
        'DP': 'DP01'
      }
    })

    // 5. Criar workbook Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturamento')

    // 6. Configurar largura das colunas
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

    // 7. Gerar buffer do Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // 8. Retornar arquivo Excel
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

// Função auxiliar para buscar itens de faturamento (CORRIGIDA)
async function getFaturamentoItems(userId: string) {
  // 1. Buscar separação ativa
  const { data: activeSeparation, error: sepError } = await supabaseAdmin
    .from('colhetron_separations')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (sepError || !activeSeparation) {
    throw new Error('Nenhuma separação ativa encontrada')
  }

  // 2. Buscar itens da separação
  const { data: separationItems, error: itemsError } = await supabaseAdmin
    .from('colhetron_separation_items')
    .select('id, material_code')
    .eq('separation_id', activeSeparation.id)

  if (itemsError || !separationItems) {
    throw new Error('Erro ao buscar itens de separação')
  }

  // 3. Buscar quantidades para esses itens
  const itemIds = separationItems.map(item => item.id)
  
  const { data: separationQuantities, error: quantitiesError } = await supabaseAdmin
    .from('colhetron_separation_quantities')
    .select('store_code, quantity, item_id')
    .in('item_id', itemIds)
    .gt('quantity', 0)

  if (quantitiesError || !separationQuantities) {
    throw new Error('Erro ao buscar dados de separação')
  }

  // 4. Criar mapa de item_id para material_code
  const itemToMaterialMap = new Map<string, string>()
  separationItems.forEach(item => {
    itemToMaterialMap.set(item.id, item.material_code)
  })

  // 5. Buscar mapeamento de lojas
  const uniqueStoreCodes = [...new Set(separationQuantities.map(sq => sq.store_code))]
  
  const { data: lojas, error: lojasError } = await supabaseAdmin
    .from('colhetron_lojas')
    .select('prefixo, centro')
    .eq('user_id', userId)
    .in('prefixo', uniqueStoreCodes)

  if (lojasError) {
    throw new Error('Erro ao buscar dados de lojas')
  }

  // Criar mapa de prefixo para centro
  const storeToCenter = new Map<string, string>()
  lojas?.forEach(loja => {
    if (loja.centro) {
      storeToCenter.set(loja.prefixo, loja.centro)
    }
  })

  // 6. Verificar se há lojas sem centro
  const lojasWithoutCenter = uniqueStoreCodes.filter(store => !storeToCenter.has(store))
  if (lojasWithoutCenter.length > 0) {
    throw new Error(`Lojas sem centro definido: ${lojasWithoutCenter.join(', ')}`)
  }

  // 7. Agrupar dados
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