// app/api/faturamento/volume-indicator/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [VOLUME-INDICATOR] Iniciando cálculo do volume...')
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [VOLUME-INDICATOR] Token de autorização não fornecido')
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      console.log('❌ [VOLUME-INDICATOR] Token inválido')
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    console.log('✅ [VOLUME-INDICATOR] Usuário autenticado:', decoded.userId)

    // Buscar separação ativa
    console.log('🔍 [VOLUME-INDICATOR] Buscando separação ativa...')
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single()

    if (sepError || !activeSeparation) {
      console.log('❌ [VOLUME-INDICATOR] Nenhuma separação ativa encontrada:', sepError)
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada. Crie uma separação primeiro.' 
      }, { status: 404 })
    }

    console.log('✅ [VOLUME-INDICATOR] Separação ativa encontrada:', activeSeparation.id)

    // ✅ CORREÇÃO: Usar PAGINAÇÃO para buscar TODOS os registros
    console.log('🔍 [VOLUME-INDICATOR] Buscando TODOS os registros com paginação...')
    
    let allVolumeData: any[] = []
    let currentPage = 0
    const pageSize = 1000
    let hasMoreData = true

    while (hasMoreData) {
      const from = currentPage * pageSize
      const to = from + pageSize - 1
      
      console.log(`📄 [VOLUME-INDICATOR] Buscando página ${currentPage + 1} (registros ${from} a ${to})...`)
      
      const { data: pageData, error: pageError } = await supabaseAdmin
        .from('colhetron_separation_quantities')
        .select('quantity')
        .eq('separation_id', activeSeparation.id)
        .gt('quantity', 0)
        .range(from, to)

      if (pageError) {
        console.log('❌ [VOLUME-INDICATOR] Erro ao buscar página:', pageError)
        return NextResponse.json({ error: 'Erro ao calcular volume' }, { status: 500 })
      }

      if (!pageData || pageData.length === 0) {
        console.log('🏁 [VOLUME-INDICATOR] Fim dos dados alcançado')
        hasMoreData = false
        break
      }

      allVolumeData.push(...pageData)
      console.log(`✅ [VOLUME-INDICATOR] Página ${currentPage + 1}: ${pageData.length} registros (total acumulado: ${allVolumeData.length})`)

      // Se retornou menos que o pageSize, é a última página
      if (pageData.length < pageSize) {
        console.log('🏁 [VOLUME-INDICATOR] Última página alcançada')
        hasMoreData = false
      }

      currentPage++
      
      // Proteção contra loop infinito
      if (currentPage > 10) {
        console.log('⚠️ [VOLUME-INDICATOR] Muitas páginas! Parando por segurança')
        break
      }
    }

    console.log('📊 [VOLUME-INDICATOR] TODOS os dados coletados:', {
      totalRegistros: allVolumeData.length,
      esperado: 1712,
      paginasProcessadas: currentPage
    })

    // Calcular volumes
    const totalVolume = allVolumeData.reduce((sum, item) => sum + item.quantity, 0)
    const totalItems = allVolumeData.length

    console.log('🎯 [VOLUME-INDICATOR] RESULTADO FINAL COM PAGINAÇÃO:')
    console.log('   📦 Total Volume:', totalVolume)
    console.log('   📋 Total Registros:', totalItems)
    console.log('   🎯 Deve ser 5.620 se pegarmos todos os 1712 registros!')

    return NextResponse.json({
      totalVolume,
      totalItems
    })

  } catch (error) {
    console.log('💥 [VOLUME-INDICATOR] Erro geral:', error)
    console.error('Erro ao calcular indicador de volume:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}