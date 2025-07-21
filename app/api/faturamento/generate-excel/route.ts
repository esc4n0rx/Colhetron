// app/api/faturamento/generate-excel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import * as XLSX from 'xlsx'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function GET(request: NextRequest) {
  return generateExcel(request)
}

export async function POST(request: NextRequest) {
  return generateExcel(request)
}

async function generateExcel(request: NextRequest) {
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

    // Buscar médias para todos os materiais
    const materialCodes = [...new Set(separationData?.map(item => item.material_code) || [])]
    const { data: mediasData, error: mediasError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('codigo, media_real')
      .in('codigo', materialCodes)

    if (mediasError) {
      return NextResponse.json({ error: 'Erro ao buscar médias dos materiais' }, { status: 500 })
    }

    // Criar mapa de material para média
    const materialToMedia = new Map<string, number>()
    mediasData?.forEach(media => {
      if (media.media_real) {
        materialToMedia.set(media.codigo, media.media_real)
      }
    })

    // Verificar se algum material não tem média
    const missingMedia: string[] = []
    materialCodes.forEach(code => {
      if (!materialToMedia.has(code)) {
        missingMedia.push(code)
      }
    })

    if (missingMedia.length > 0) {
      return NextResponse.json({
        error: 'Materiais sem média encontrados',
        missingMedia: missingMedia
      }, { status: 400 })
    }

    // **CORREÇÃO: Agrupar e somar quantidades por material_code + centro**
    const groupedData = new Map<string, {
      material_code: string
      centro: string
      quantidade_total: number
    }>()

    separationData?.forEach(item => {
      const media = materialToMedia.get(item.material_code)
      
      if (media) {
        item.colhetron_separation_quantities.forEach(qty => {
          const centro = storeToCenter.get(qty.store_code)
          
          if (centro) {
            // Chave única: material + centro
            const key = `${item.material_code}-${centro}`
            
            // Se já existe, somar as quantidades
            if (groupedData.has(key)) {
              const existing = groupedData.get(key)!
              existing.quantidade_total += qty.quantity
            } else {
              // Criar novo registro
              groupedData.set(key, {
                material_code: item.material_code,
                centro: centro,
                quantidade_total: qty.quantity
              })
            }
          }
        })
      }
    })

    // Gerar dados do Excel com formato específico
    const excelData: any[] = []
    const currentDate = new Date().toLocaleDateString('pt-BR')

    // Converter o Map agrupado para o formato do Excel
    groupedData.forEach(group => {
      const media = materialToMedia.get(group.material_code)!
      
      // Calcular quantidade convertida (quantidade_total * media_real)
      const quantidadeConvertida = group.quantidade_total * media
      
      // Converter números com vírgula para ponto (se necessário)
      const quantidadeFormatada = quantidadeConvertida.toString().replace(',', '.')
      
      excelData.push({
        'Data': currentDate,
        'Centro': group.centro,
        'Grupo Comprador': 'F06',
        'Código Fornecedor': 'CD03',
        'Código': group.material_code,
        'QTD': quantidadeFormatada,
        'DP': 'DP01'
      })
    })

    if (excelData.length === 0) {
      return NextResponse.json({ error: 'Nenhum dado válido para gerar o Excel' }, { status: 404 })
    }

    // Criar planilha Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 12 }, // Data
      { wch: 15 }, // Centro
      { wch: 18 }, // Grupo Comprador
      { wch: 18 }, // Código Fornecedor
      { wch: 15 }, // Código
      { wch: 12 }, // QTD
      { wch: 8 }   // DP
    ]
    worksheet['!cols'] = colWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Faturamento')

    // Converter para buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    // Gerar nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const fileName = `faturamento_${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Erro ao gerar Excel de faturamento:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}