
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'



const lojaSchema = z.object({
  prefixo: z.string().min(1, 'Prefixo é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipo: z.enum(['CD', 'Loja Padrão', 'Administrativo']),
  uf: z.string().min(2, 'UF é obrigatória'),
  zonaSeco: z.string().optional().default(''),
  subzonaSeco: z.string().optional().default(''),
  zonaFrio: z.string().optional().default(''),
  ordemSeco: z.number().optional().default(0),
  ordemFrio: z.number().optional().default(0)
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

    // Buscar lojas do usuário
    const { data: lojas, error } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('*')
      .eq('user_id', decoded.userId)
      .order('prefixo')

    if (error) {
      console.error('Erro ao buscar lojas:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar lojas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ lojas: lojas || [] })

  } catch (error) {
    console.error('Erro na busca de lojas:', error)
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
    const validatedData = lojaSchema.parse(body)

    // Verificar se já existe loja com mesmo prefixo para o usuário
    const { data: existingLoja } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('prefixo', validatedData.prefixo)
      .single()

    if (existingLoja) {
      return NextResponse.json(
        { error: 'Já existe uma loja com este prefixo' },
        { status: 409 }
      )
    }

    // Criar nova loja
    const { data: newLoja, error } = await supabaseAdmin
      .from('colhetron_lojas')
      .insert([
        {
          ...validatedData,
          user_id: decoded.userId
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar loja:', error)
      return NextResponse.json(
        { error: 'Erro ao criar loja' },
        { status: 500 }
      )
    }

    return NextResponse.json(newLoja, { status: 201 })

  } catch (error) {
    console.error('Erro na criação de loja:', error)
    
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

    // Verificar se a loja pertence ao usuário
    const { data: existingLoja, error: checkError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('id')
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .single()

    if (checkError || !existingLoja) {
      return NextResponse.json(
        { error: 'Loja não encontrada ou não autorizada' },
        { status: 404 }
      )
    }

    // Atualizar loja
    const { data: updatedLoja, error } = await supabaseAdmin
      .from('colhetron_lojas')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar loja:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar loja' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedLoja)

  } catch (error) {
    console.error('Erro na atualização de loja:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}