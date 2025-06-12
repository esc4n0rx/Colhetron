// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { forgotPasswordSchema } from '@/lib/auth'
import { sendRecoveryEmail, generateRecoveryCode } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = forgotPasswordSchema.parse(body)
    const { email } = validatedData

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabaseAdmin
      .from('colhetron_user')
      .select('id, email, name')
      .eq('email', email)
      .single()

    // Por segurança, sempre retornamos sucesso mesmo se o email não existir
    if (userError || !user) {
      return NextResponse.json({
        success: true,
        message: 'Se o email existir em nossa base, você receberá as instruções de recuperação.'
      })
    }

    // Gerar código de recuperação
    const recoveryCode = generateRecoveryCode()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutos

    // Salvar código na base de dados
    const { error: insertError } = await supabaseAdmin
      .from('password_recovery_codes')
      .insert([
        {
          user_id: user.id,
          email: user.email,
          code: recoveryCode,
          expires_at: expiresAt.toISOString(),
          used: false
        }
      ])

    if (insertError) {
      console.error('Erro ao salvar código de recuperação:', insertError)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    // Enviar email com código
    const emailResult = await sendRecoveryEmail({
      email: user.email,
      code: recoveryCode,
      name: user.name
    })

    if (!emailResult.success) {
      console.error('Erro ao enviar email:', emailResult.error)
      return NextResponse.json(
        { error: 'Erro ao enviar email de recuperação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Se o email existir em nossa base, você receberá as instruções de recuperação.'
    })

  } catch (error) {
    console.error('Erro na recuperação de senha:', error)
    
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