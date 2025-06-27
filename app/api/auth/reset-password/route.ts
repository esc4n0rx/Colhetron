import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { resetPasswordSchema } from '@/lib/auth'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)
    const { email, code, password } = validatedData

    const { data: recoveryData, error: recoveryError } = await supabaseAdmin
      .from('password_recovery_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (recoveryError || !recoveryData) {
      return NextResponse.json(
        { error: 'Código inválido ou expirado' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const { error: updateError } = await supabaseAdmin
      .from('colhetron_user')
      .update({ 
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', recoveryData.user_id)

    if (updateError) {
      console.error('Erro ao atualizar senha:', updateError)
      return NextResponse.json(
        { error: 'Erro ao atualizar senha' },
        { status: 500 }
      )
    }

    await supabaseAdmin
      .from('password_recovery_codes')
      .update({ used: true })
      .eq('id', recoveryData.id)

    await supabaseAdmin
      .from('password_recovery_codes')
      .update({ used: true })
      .eq('user_id', recoveryData.user_id)
      .eq('used', false)

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso!'
    })

  } catch (error) {
    console.error('Erro na redefinição de senha:', error)
    
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