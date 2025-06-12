
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'



const updateSchema = z.object({
  itemId: z.string(),
  typeSeparation: z.enum(['SECO', 'FRIO', 'ORGANICO']),
})

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = updateSchema.parse(body)
    const { itemId, typeSeparation } = validatedData

    // Verificar se o item pertence à separação ativa do usuário
    const { data: item, error: itemError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('id, separation_id, colhetron_separations(user_id, status)')
      .eq('id', itemId)
      .single()

    if (itemError || !item || (item.colhetron_separations as any).user_id !== decoded.userId) {
      return NextResponse.json({ error: 'Item não encontrado ou não autorizado' }, { status: 404 })
    }

    if ((item.colhetron_separations as any).status !== 'active') {
      return NextResponse.json({ error: 'Apenas separações ativas podem ser editadas' }, { status: 403 })
    }
    
    // Atualizar o tipo de separação
    const { error: updateError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .update({ type_separation: typeSeparation })
      .eq('id', itemId)

    if (updateError) {
      console.error('Erro ao atualizar tipo de separação:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar o item' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Tipo de separação atualizado com sucesso' })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Erro ao atualizar tipo de separação:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}