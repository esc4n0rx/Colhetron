// app/api/cadastro/materiais/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const updateMaterialSchema = z.object({
  material: z.string().optional(),
  descricao: z.string().optional(),
  noturno: z.enum(['SECO', 'FRIO']).optional(),
  diurno: z.enum(['SECO', 'FRIO']).optional()
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
    const validatedData = updateMaterialSchema.parse(updates)

    // Verificar se o material pertence ao usuário
    const { data: existingMaterial, error: checkError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('*')
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .single()

    if (checkError || !existingMaterial) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
    }

    // Verificar se há conflito de código (se o código está sendo alterado)
    if (validatedData.material && validatedData.material !== existingMaterial.material) {
      const { data: conflictMaterial } = await supabaseAdmin
        .from('colhetron_materiais')
        .select('id')
        .eq('user_id', decoded.userId)
        .eq('material', validatedData.material)
        .neq('id', id)
        .single()

      if (conflictMaterial) {
        return NextResponse.json({ 
          error: 'Já existe um material com este código' 
        }, { status: 409 })
      }
    }

    // Atualizar material
    const { data: updatedMaterial, error: updateError } = await supabaseAdmin
      .from('colhetron_materiais')
      .update(validatedData)
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar material:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar material' }, { status: 500 })
    }

    return NextResponse.json(updatedMaterial)

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

    // Deletar material
    const { error: deleteError } = await supabaseAdmin
      .from('colhetron_materiais')
      .delete()
      .eq('id', id)
      .eq('user_id', decoded.userId)

    if (deleteError) {
      console.error('Erro ao deletar material:', deleteError)
      return NextResponse.json({ error: 'Erro ao deletar material' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Material deletado com sucesso' })

  } catch (error) {
    console.error('Erro na deleção:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}