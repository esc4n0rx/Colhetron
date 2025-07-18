// app/api/faturamento/check-media-status/route.ts
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
      return NextResponse.json({ 
        error: 'Nenhuma separação ativa encontrada. Crie uma separação primeiro.' 
      }, { status: 404 })
    }

    // Buscar materiais da separação ativa
    const { data: separationItems, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('material_code')
      .eq('separation_id', activeSeparation.id)

    if (itemsError || !separationItems) {
      return NextResponse.json({ 
        error: 'Erro ao buscar itens da separação ativa' 
      }, { status: 500 })
    }

    const materialCodes = [...new Set(separationItems.map(item => item.material_code))]
    
    if (materialCodes.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhum material encontrado na separação ativa' 
      }, { status: 404 })
    }

    // Buscar análise de médias para os materiais da separação
    const { data: mediaItems, error: mediaError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('id, codigo, material, status, media_sistema')
      .eq('user_id', decoded.userId)
      .in('codigo', materialCodes)

    if (mediaError) {
      console.error('Erro ao buscar itens de análise de médias:', mediaError)
      return NextResponse.json({ error: 'Erro ao buscar dados de análise' }, { status: 500 })
    }

    // Verificar se há materiais sem análise de média
    const analyzedCodes = new Set(mediaItems?.map(item => item.codigo) || [])
    const missingAnalysis = materialCodes.filter(code => !analyzedCodes.has(code))

    if (missingAnalysis.length > 0) {
      return NextResponse.json({ 
        error: `Materiais sem análise de média: ${missingAnalysis.join(', ')}. Execute a análise de médias primeiro.`,
        missingMaterials: missingAnalysis,
        totalMaterialsInSeparation: materialCodes.length,
        materialsWithAnalysis: analyzedCodes.size
      }, { status: 400 })
    }

    // Analisar status dos itens
    const errorItems = mediaItems?.filter(item => item.status !== 'OK') || []
    const criticalItems = errorItems.filter(item => item.status === 'CRÍTICO')
    const warningItems = errorItems.filter(item => item.status === 'ATENÇÃO')

    const result = {
      totalItems: mediaItems?.length || 0,
      totalMaterialsInSeparation: materialCodes.length,
      itemsWithError: errorItems.length,
      criticalItems: criticalItems.length,
      warningItems: warningItems.length,
      successRate: Math.round(((mediaItems?.length || 0) - errorItems.length) / (mediaItems?.length || 1) * 100),
      errorItems: errorItems.map(item => ({
        id: item.id,
        codigo: item.codigo,
        material: item.material,
        status: item.status,
        error: getErrorMessage(item.status),
        mediaSistema: item.media_sistema
      })),
      summary: {
        canProceed: errorItems.length === 0,
        hasWarnings: warningItems.length > 0,
        hasCriticalIssues: criticalItems.length > 0,
        recommendedAction: getRecommendedAction(criticalItems.length, warningItems.length)
      }
    }

    return NextResponse.json(result)

  } catch (error) {
   console.error('Erro ao verificar status das médias:', error)
   return NextResponse.json({ 
     error: 'Erro interno do servidor',
     details: error instanceof Error ? error.message : 'Erro desconhecido'
   }, { status: 500 })
 }
}

function getErrorMessage(status: string): string {
 switch (status) {
   case 'ATENÇÃO':
     return 'Diferença significativa entre estoque e quantidade prevista (>10%)'
   case 'CRÍTICO':
     return 'Problema crítico: estoque zerado ou discrepância muito alta (>20%)'
   default:
     return 'Status não identificado ou problema não especificado'
 }
}

function getRecommendedAction(criticalCount: number, warningCount: number): string {
 if (criticalCount > 0) {
   return 'Recomendado corrigir itens críticos antes de prosseguir'
 } else if (warningCount > 0) {
   return 'Revisar itens com atenção ou prosseguir com cautela'
 } else {
   return 'Todos os itens estão OK - pode prosseguir com segurança'
 }
}