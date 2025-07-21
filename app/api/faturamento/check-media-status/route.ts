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

    // Buscar médias para os materiais da separação
    const { data: mediaItems, error: mediaError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('codigo, media_real')
      .in('codigo', materialCodes)

    if (mediaError) {
      console.error('Erro ao buscar médias:', mediaError)
      return NextResponse.json({ error: 'Erro ao buscar dados de média' }, { status: 500 })
    }

    // Verificar quais materiais não têm média
    const analyzedCodes = new Set(mediaItems?.map(item => item.codigo) || [])
    const missingMedia = materialCodes.filter(code => !analyzedCodes.has(code))

    // Verificar quais materiais têm média mas sem media_real
    const invalidMedia = mediaItems?.filter(item => !item.media_real).map(item => item.codigo) || []

    const allMissingOrInvalid = [...missingMedia, ...invalidMedia]

    if (allMissingOrInvalid.length > 0) {
      return NextResponse.json({ 
        error: `Materiais sem média válida: ${allMissingOrInvalid.join(', ')}`,
        missingMedia: allMissingOrInvalid,
        totalMaterials: materialCodes.length,
        validMaterials: materialCodes.length - allMissingOrInvalid.length
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Todas as médias estão disponíveis',
      totalMaterials: materialCodes.length,
      validMaterials: materialCodes.length
    })

  } catch (error) {
    console.error('Erro ao verificar status das médias:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}