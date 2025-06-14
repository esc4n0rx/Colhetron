// app/api/profile/route.ts - Correção nas URLs
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { logActivity } from '@/lib/activity-logger'
import { z } from 'zod'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  phone: z.string().optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  avatar_url: z.string().optional()
})

// URL base do Supabase Storage
const SUPABASE_STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const DEFAULT_AVATAR_URL = `${SUPABASE_STORAGE_URL}/storage/v1/object/public/colhetron-assets/avatar/default.png`

export async function GET(request: NextRequest) {
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

    // Buscar perfil do usuário
    const { data: profile, error } = await supabaseAdmin
      .from('colhetron_user_profiles')
      .select('*')
      .eq('user_id', decoded.userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Perfil não existe, criar um perfil padrão
      const { data: user } = await supabaseAdmin
        .from('colhetron_user')
        .select('name, email')
        .eq('id', decoded.userId)
        .single()

      const defaultProfile = {
        user_id: decoded.userId,
        name: user?.name || '',
        phone: '',
        department: 'Logística',
        position: 'Operador de Separação',
        bio: '',
        location: '',
        avatar_url: DEFAULT_AVATAR_URL
      }

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('colhetron_user_profiles')
        .insert([defaultProfile])
        .select()
        .single()

      if (createError) {
        console.error('Erro ao criar perfil padrão:', createError)
        return NextResponse.json({ error: 'Erro ao criar perfil' }, { status: 500 })
      }

      return NextResponse.json(newProfile)
    }

    if (error) {
      console.error('Erro ao buscar perfil:', error)
      return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
    }

    return NextResponse.json(profile)

  } catch (error) {
    console.error('Erro na API de perfil:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const validatedData = profileSchema.parse(body)

    // Atualizar perfil
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('colhetron_user_profiles')
      .update(validatedData)
      .eq('user_id', decoded.userId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar perfil:', error)
      return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
    }

    // Registrar atividade
    await logActivity({
      userId: decoded.userId,
      action: 'Perfil atualizado',
      details: 'Informações do perfil foram atualizadas',
      type: 'profile_update'
    })

    return NextResponse.json(updatedProfile)

  } catch (error) {
    console.error('Erro na atualização do perfil:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}