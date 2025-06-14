// app/api/profile/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
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

    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP' },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 2MB' },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop()
    const fileName = `${decoded.userId}-${uuidv4()}.${fileExtension}`
    const filePath = `avatars/${fileName}`

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Upload para o bucket Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('colhetron-assets')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
    }

    // Obter URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from('colhetron-assets')
      .getPublicUrl(filePath)

    const avatarUrl = urlData.publicUrl

    // Atualizar URL do avatar no perfil do usuário
    const { error: updateError } = await supabase
      .from('colhetron_user_profiles')
      .update({ avatar_url: avatarUrl })
      .eq('user_id', decoded.userId)

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Avatar atualizado com sucesso',
      avatar_url: avatarUrl
    })

  } catch (error) {
    console.error('Erro no upload do avatar:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}