import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, generateToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'
import { logActivity } from '@/lib/activity-logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validar dados de entrada
    const validatedData = loginSchema.parse(body)
    const { email, password } = validatedData

    // Buscar usuário no banco
    const { data: user, error } = await supabaseAdmin
      .from('colhetron_user')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(password, user.password)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      )
    }

    // Gerar token JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    })

    // Atualizar último login
    await supabaseAdmin
      .from('colhetron_user')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Retornar dados do usuário (sem senha) e token
    const { password: _, ...userWithoutPassword } = user

    await logActivity({
      userId: user.id,
      action: 'Login realizado',
      details: `Login no sistema via ${user.email}`,
      type: 'login',
      metadata: {
        email: user.email,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      user: userWithoutPassword,
      token
    })

  } catch (error) {
    console.error('Erro no login:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}