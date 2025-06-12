import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'


export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação
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

    const { separationId } = await request.json()

    if (!separationId) {
      return NextResponse.json(
        { error: 'ID da separação é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se a separação pertence ao usuário
    const { data: separation, error: checkError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id, user_id, file_name')
      .eq('id', separationId)
      .eq('user_id', decoded.userId)
      .single()

    if (checkError || !separation) {
      return NextResponse.json(
        { error: 'Separação não encontrada ou não autorizada' },
        { status: 404 }
      )
    }

    // Deletar separação (cascade vai deletar itens e quantidades automaticamente)
    const { error: deleteError } = await supabaseAdmin
      .from('colhetron_separations')
      .delete()
      .eq('id', separationId)
      .eq('user_id', decoded.userId)

    if (deleteError) {
      console.error('Erro ao deletar separação:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao deletar separação' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Separação deletada com sucesso',
      fileName: separation.file_name
    })

  } catch (error) {
    console.error('Erro na deleção:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}