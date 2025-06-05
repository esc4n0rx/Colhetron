// app/api/cadastro/materiais/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const materialSchema = z.object({
  material: z.string().min(1, 'Material é obrigatório'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  noturno: z.enum(['SECO', 'FRIO']),
  diurno: z.enum(['SECO', 'FRIO'])
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

    // Buscar materiais do usuário
    const { data: materiais, error } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('material')

    if (error) {
      console.error('Erro ao buscar materiais:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar materiais' },
        { status: 500 }
      )
    }

    return NextResponse.json({ materiais: materiais || [] })

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

    // Verificar se já existe material com mesmo código para o usuário
    const { data: existingMaterial } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('material', validatedData.material)
      .single()

    if (existingMaterial) {
      return NextResponse.json(
        { error: 'Já existe um material com este código' },
        { status: 409 }
      )
    }

    // Criar novo material
    const { data: newMaterial, error } = await supabaseAdmin
      .from('colhetron_materiais')
      .insert([
        {
          ...validatedData,
          user_id: decoded.userId
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar material:', error)
      return NextResponse.json(
        { error: 'Erro ao criar material' },
        { status: 500 }
      )
    }

    return NextResponse.json(newMaterial, { status: 201 })

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

export async function PUT(request: NextRequest) {
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
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o material pertence ao usuário
    const { data: existingMaterial, error: checkError } = await supabaseAdmin
      .from('colhetron_materiais')
      .select('id')
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .single()

    if (checkError || !existingMaterial) {
      return NextResponse.json(
        { error: 'Material não encontrado ou não autorizado' },
        { status: 404 }
      )
    }

    // Atualizar material
    const { data: updatedMaterial, error } = await supabaseAdmin
      .from('colhetron_materiais')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar material:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar material' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedMaterial)

  } catch (error) {
    console.error('Erro na atualização de material:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}