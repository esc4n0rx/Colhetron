// app/api/cadastro/materiais/[id]/route.ts (ATUALIZADO)
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const updateMaterialSchema = z.object({
  material: z.string().optional(),
  descricao: z.string().optional(),
  category: z.string().optional()
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

    // Buscar material existente
    const { data: existingMaterial, error: checkError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('*')
      .eq('id', id)
      .single()

    if (checkError || !existingMaterial) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
    }

    // Verificar conflito de código (se o código está sendo alterado)
    if (validatedData.material && validatedData.material !== existingMaterial.material) {
      const { data: conflictMaterial } = await supabaseAdmin
        .from('colhetron_materiais')
        .select('id')
        .eq('material', validatedData.material)
        .neq('id', id)
        .single()

      if (conflictMaterial) {
        return NextResponse.json({ 
          error: 'Já existe um material com este código' 
        }, { status: 409 })
      }
    }

    // Preparar dados para atualização
    const updateData: any = {
      ...validatedData,
      updated_at: new Date().toISOString()
    }

    // Se categoria foi fornecida, atualizar ambas as colunas
    if (validatedData.category) {
      updateData.diurno = validatedData.category
      updateData.noturno = validatedData.category
    }

    // Remover category do updateData (campo virtual)
    delete updateData.category

    // Atualizar material
    const { data: updatedMaterial, error: updateError } = await supabaseAdmin
      .from('colhetron_materiais')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Erro ao atualizar material:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar material' }, { status: 500 })
    }

    // Log da atividade de alteração de categoria
    if (validatedData.category && validatedData.category !== existingMaterial.diurno) {
      await logActivity({
        userId: decoded.userId,
        action: 'Categoria do item alterada',
        details: `A categoria do item '${existingMaterial.material}' foi alterada de '${existingMaterial.diurno || 'N/A'}' para '${validatedData.category}'`,
        type: 'update'
      })
    }

    // Retornar material no formato esperado
    const formattedMaterial = {
      id: updatedMaterial.id,
      material: updatedMaterial.material,
      descricao: updatedMaterial.descricao,
      category: updatedMaterial.diurno,
      noturno: updatedMaterial.noturno,
      diurno: updatedMaterial.diurno
    }

    return NextResponse.json(formattedMaterial)

  } catch (error) {
    console.error('Erro na atualização:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}