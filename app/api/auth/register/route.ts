import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, generateToken } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email é obrigatório'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  role: z.string().optional().default('user')
})

const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const DEFAULT_AVATAR_URL = `${SUPABASE_STORAGE_URL}/storage/v1/object/public/colhetron-assets/avatar/default.png`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)
    const { email, password, name, role } = validatedData

    const { data: existingUser } = await supabaseAdmin
      .from('colhetron_user')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const { data: user, error } = await supabaseAdmin
      .from('colhetron_user')
      .insert([{
        email,
        password: hashedPassword,
        name,
        role
      }])
      .select('id, email, name, role, created_at, updated_at')
      .single()

    if (error) {
      console.error('Erro ao criar usuário:', error)
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    const defaultProfile = {
      user_id: user.id,
      name: name,
      phone: '',
      department: 'Logística',
      position: 'Operador de Separação',
      bio: 'Novo usuário do sistema Colhetron',
      location: '',
      avatar_url: DEFAULT_AVATAR_URL
    }

    const { error: profileError } = await supabaseAdmin
      .from('colhetron_user_profiles')
      .insert([defaultProfile])

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError)
    }

    const token = generateToken(user)

    return NextResponse.json({
      user,
      token,
      message: 'Usuário criado com sucesso'
    }, { status: 201 })

  } catch (error) {
    console.error('Erro no registro:', error)
    
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