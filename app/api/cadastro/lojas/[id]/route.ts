import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const updateLojaSchema = z.object({
  prefixo: z.string().optional(),
  nome: z.string().optional(),
  tipo: z.enum(['CD', 'Loja Padrão', 'Administrativo']).optional(),
  uf: z.string().optional(),
  centro: z.string().optional(),
  zonaSeco: z.string().optional(),
  subzonaSeco: z.string().optional(),
  zonaFrio: z.string().optional(),
  ordemSeco: z.number().optional(),
  ordemFrio: z.number().optional()
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const updates = await request.json()
    const validatedData = updateLojaSchema.parse(updates)

    const { data: existingLoja, error: checkError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingLoja) {
      return NextResponse.json({ error: 'Loja não encontrada' }, { status: 404 })
    }

    if (validatedData.prefixo && validatedData.prefixo !== existingLoja.prefixo) {
      const { data: conflictLoja } = await supabaseAdmin
        .from('colhetron_lojas')
        .select('id')
        .eq('prefixo', validatedData.prefixo)
        .neq('id', id)
        .single()

      if (conflictLoja) {
        return NextResponse.json({ 
          error: 'Já existe uma loja com este prefixo' 
        }, { status: 409 })
      }
    }

    const { data: updatedLoja, error: updateError } = await supabaseAdmin
      .from('colhetron_lojas')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar loja:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar loja' }, { status: 500 })
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Loja Atualizada',
      details: `Loja ${existingLoja.prefixo} - ${existingLoja.nome} foi atualizada`,
      type: 'update',
    })

    return NextResponse.json(updatedLoja)

  } catch (error) {
    console.error('Erro na atualização:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    const { data: existingLoja } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, nome')
      .eq('id', id)
      .single()

    const { error: deleteError } = await supabaseAdmin
      .from('colhetron_lojas')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Erro ao deletar loja:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar loja' }, { status: 500 })
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Loja Deletada',
      details: `Loja ${existingLoja?.prefixo} - ${existingLoja?.nome} foi removida`,
      type: 'update',
    })

    return NextResponse.json({ message: 'Loja deletada com sucesso' })

  } catch (error) {
    console.error('Erro na deleção:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}