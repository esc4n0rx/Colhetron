
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { id: separationId } = params;

    const { data, error } = await supabaseAdmin
      .from('colhetron_reinforcement_prints')
      .select('file_name, created_at, data')
      .eq('separation_id', separationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar reforços:', error);
      return NextResponse.json({ error: 'Erro ao buscar dados de reforços.' }, { status: 500 });
    }

    return NextResponse.json(data || []);

  } catch (error) {
    console.error('Erro na API de busca de reforços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}