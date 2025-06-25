// app/api/relatorios/separations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Aguardar params antes de acessar suas propriedades
    const { id: separationId } = await params
    console.log('🚀 [API DETALHES] Iniciando requisição para separação:', separationId)
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API DETALHES] Token de autorização ausente')
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) {
      console.log('❌ [API DETALHES] Token inválido')
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    console.log('✅ [API DETALHES] Token válido para usuário:', decoded.userId)
    console.log('🔍 [API DETALHES] Buscando separação ID:', separationId)

    // Buscar dados da separação - REMOVIDO filtro de user_id para permitir acesso a qualquer separação
    const { data: separation, error: separationError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, type, date, status, file_name, total_items, total_stores, created_at, updated_at, user_id')
      .eq('id', separationId)
      .single()

    if (separationError || !separation) {
      console.error('❌ [API DETALHES] Erro ao buscar separação:', separationError)
      return NextResponse.json({ error: 'Separação não encontrada' }, { status: 404 })
    }

    console.log('✅ [API DETALHES] Separação encontrada:', separation.file_name)

    // Buscar dados do usuário que criou a separação
    const { data: userData, error: userError } = await supabaseAdmin
      .from('colhetron_user')
      .select('name, email')
      .eq('id', separation.user_id)
      .single()

    if (userError) {
      console.error('❌ [API DETALHES] Erro ao buscar usuário:', userError)
      return NextResponse.json({ error: 'Erro ao buscar dados do usuário' }, { status: 500 })
    }

    // Buscar itens da separação com suas quantidades
    console.log('🔍 [API DETALHES] Buscando itens da separação...')
    
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        material_code,
        description,
        type_separation,
        colhetron_separation_quantities (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', separationId)
      .order('material_code')

    if (itemsError) {
      console.error('❌ [API DETALHES] Erro ao buscar itens:', itemsError)
      return NextResponse.json({ error: 'Erro ao buscar detalhes da separação' }, { status: 500 })
    }

    console.log('✅ [API DETALHES] Itens encontrados:', items?.length || 0)

    // Buscar histórico de atividades da separação
    console.log('🔍 [API DETALHES] Buscando atividades da separação...')
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('colhetron_user_activities')
      .select('*')
      .eq('user_id', separation.user_id)
      .eq('metadata->>separationId', separationId) // Filtra pelo separationId dentro do JSONB
      .order('created_at', { ascending: false })
      .limit(100) // Limita para evitar sobrecarga

    if (activitiesError) {
      console.error('❌ [API DETALHES] Erro ao buscar atividades:', activitiesError)
      // Não falha a requisição, apenas retorna sem as atividades
    } else {
      console.log('✅ [API DETALHES] Atividades encontradas:', activities?.length || 0)
    }

    // Formatar dados para resposta
    const detailedSeparation = {
      ...separation,
      user: userData,
      items: items?.map(item => ({
        id: item.id,
        material_code: item.material_code,
        description: item.description,
        type_separation: item.type_separation,
        quantities: item.colhetron_separation_quantities || []
      })) || [],
      activities: activities || [] // Adiciona as atividades à resposta
    }

    return NextResponse.json(detailedSeparation)

  } catch (error) {
    console.error('💥 [API DETALHES] Erro geral:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}