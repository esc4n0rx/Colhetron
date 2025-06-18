import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface RouteParams {
  params: {
    id: string;
  };
}
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: separationId } = params;

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error(`[API DOWNLOAD - ${separationId}] Erro: Token de autorização ausente.`);
      return NextResponse.json({ error: 'Token de autorização necessário' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      console.error(`[API DOWNLOAD - ${separationId}] Erro: Token JWT inválido.`);
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const workbook = XLSX.utils.book_new();

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select('material_code, description, colhetron_separation_quantities(store_code, quantity)')
      .eq('separation_id', separationId);

    if (itemsError) {
      console.error(`[API DOWNLOAD - ${separationId}] Erro ao buscar itens no Supabase:`, itemsError);
      throw itemsError;
    }

    if (!items || items.length === 0) {
    } else {
      const allStores = new Set<string>();
      items.forEach(item => {
        item.colhetron_separation_quantities.forEach(qty => allStores.add(qty.store_code));
      });
      const sortedStores = Array.from(allStores).sort();

      const separacaoData = items.map(item => {
        const row: { [key: string]: string | number } = {
          'CÓDIGO': item.material_code,
          'DESCRIÇÃO': item.description,
        };
        sortedStores.forEach(store => { row[store] = 0; });
        item.colhetron_separation_quantities.forEach(qty => { row[qty.store_code] = qty.quantity; });
        return row;
      });
      
      const separacaoWorksheet = XLSX.utils.json_to_sheet(separacaoData);
      separacaoWorksheet['!cols'] = [{ wch: 15 }, { wch: 50 }, ...sortedStores.map(() => ({ wch: 10 }))];
      XLSX.utils.book_append_sheet(workbook, separacaoWorksheet, 'Separacao');
    }

    const { data: mediaItems, error: mediaError } = await supabaseAdmin
      .from('colhetron_media_analysis')
      .select('codigo, material, quantidade_kg, quantidade_caixas, media_sistema')
      .eq('separation_id', separationId);

    if (mediaError) {
      console.error(`[API DOWNLOAD - ${separationId}] Erro ao buscar dados de análise no Supabase:`, mediaError);
      throw mediaError;
    }

    if (!mediaItems || mediaItems.length === 0) {
    } else {
        const mediaWorksheet = XLSX.utils.json_to_sheet(mediaItems, {
            header: ["codigo", "material", "quantidade_kg", "quantidade_caixas", "media_sistema"]
        });
        XLSX.utils.sheet_add_aoa(mediaWorksheet, [["Código", "Material", "Qtd KG", "Qtd Caixas", "Média Sistema"]], { origin: "A1" });
        mediaWorksheet['!cols'] = [ { wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 } ];
        XLSX.utils.book_append_sheet(workbook, mediaWorksheet, 'Analise de Media');
    }
    
    if (workbook.SheetNames.length === 0) {
        return NextResponse.json({ error: 'Nenhum dado encontrado para gerar o relatório.' }, { status: 404 });
    }

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio_${separationId}.xlsx"`,
      },
    });

  } catch (error) {
    const err = error as any;
    console.error(`[API DOWNLOAD - ${separationId}] Erro CATASTRÓFICO:`, err.message);
    console.error(`[API DOWNLOAD - ${separationId}] Stack Trace:`, err.stack);
    return NextResponse.json({ error: 'Erro interno do servidor', details: err.message }, { status: 500 });
  }
}