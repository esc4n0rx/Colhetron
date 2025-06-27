import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const materialSchema = z.object({
  material: z.string().min(1, 'Material é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  category: z.string().min(1, 'Categoria é obrigatória')
})

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { data: materiais, error } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('*')
      .order('material')

    if (error) {
      console.error('Erro ao buscar materiais:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar materiais' },
        { status: 500 }
      )
    }

    const formattedMateriais = (materiais || []).map(material => ({
      id: material.id,
      material: material.material,
      descricao: material.descricao,
      category: material.diurno || material.noturno || 'SECO',
      noturno: material.noturno,
      diurno: material.diurno
    }))

    return NextResponse.json({ materiais: formattedMateriais })

  } catch (error) {
    console.error('Erro na busca de materiais:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização necessário' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = materialSchema.parse(body)

    const { data: existingMaterial } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('id')
      .eq('material', validatedData.material)
      .single()

    if (existingMaterial) {
      return NextResponse.json(
        { error: 'Já existe um material com este código' },
        { status: 409 }
      )
    }

    const { data: material, error } = await supabaseAdmin
      .from('colhetron_materiais')
      .insert([{
        user_id: decoded.userId,
        material: validatedData.material,
        descricao: validatedData.descricao,
        diurno: validatedData.category,
        noturno: validatedData.category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar material:', error)
      return NextResponse.json(
        { error: 'Erro ao criar material' },
        { status: 500 }
      )
    }

    await logActivity({
      userId: decoded.userId,
      action: 'Material criado',
      details: `Material '${validatedData.material}' criado na categoria '${validatedData.category}'`,
      type: 'update'
    })

    const formattedMaterial = {
      id: material.id,
      material: material.material,
      descricao: material.descricao,
      category: material.diurno,
      noturno: material.noturno,
      diurno: material.diurno
    }

    return NextResponse.json(formattedMaterial, { status: 201 })

  } catch (error) {
    console.error('Erro na criação de material:', error)
    
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