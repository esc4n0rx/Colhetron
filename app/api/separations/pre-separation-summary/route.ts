
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';



export async function GET(request: NextRequest) {
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

    // 1. Encontrar a separação ativa do usuário
    const { data: activeSeparation, error: sepError } = await supabaseAdmin
      .from('colhetron_separations')
      .select('id')
      .eq('user_id', decoded.userId)
      .eq('status', 'active')
      .single();

    if (sepError || !activeSeparation) {
      return NextResponse.json({ data: [], zones: [] });
    }

    // 2. Buscar todos os itens e suas quantidades para a separação ativa
    const { data: itemsWithQuantities, error: itemsError } = await supabaseAdmin
      .from('colhetron_separation_items')
      .select(`
        id,
        description,
        type_separation,
        colhetron_separation_quantities (
          store_code,
          quantity
        )
      `)
      .eq('separation_id', activeSeparation.id);

    if (itemsError) throw new Error(`Erro ao buscar itens: ${itemsError.message}`);

    // 3. Buscar todas as lojas cadastradas pelo usuário para mapear zonas
    const { data: lojas, error: lojasError } = await supabaseAdmin
      .from('colhetron_lojas')
      .select('prefixo, zonaSeco, zonaFrio')
      .eq('user_id', decoded.userId);

    if (lojasError) throw new Error(`Erro ao buscar lojas: ${lojasError.message}`);

    const lojasMap = new Map(lojas.map(loja => [loja.prefixo, { zonaSeco: loja.zonaSeco, zonaFrio: loja.zonaFrio }]));

    // 4. Processar e agregar os dados
    const summary = new Map<string, { tipoSepar: string, material: string, zones: Map<string, number> }>();

    for (const item of itemsWithQuantities) {
      const key = `${item.description}-${item.type_separation}`;
      if (!summary.has(key)) {
        summary.set(key, {
          tipoSepar: item.type_separation,
          material: item.description,
          zones: new Map<string, number>(),
        });
      }

      const summaryItem = summary.get(key)!;

      for (const qty of item.colhetron_separation_quantities) {
        const lojaInfo = lojasMap.get(qty.store_code);
        if (lojaInfo) {
          const zone = item.type_separation === 'FRIO' ? lojaInfo.zonaFrio : lojaInfo.zonaSeco;
          if (zone) {
            summaryItem.zones.set(zone, (summaryItem.zones.get(zone) || 0) + qty.quantity);
          }
        }
      }
    }

    // 5. Formatar a saída e obter a lista de zonas dinâmicas
    const allZones = new Set<string>();
    const formattedData = Array.from(summary.values()).map(item => {
      let totalGeral = 0;
      const zoneData: { [key: string]: number } = {};
      
      item.zones.forEach((quantity, zone) => {
        allZones.add(zone);
        totalGeral += quantity;
        zoneData[zone] = quantity;
      });

      return {
        tipoSepar: item.tipoSepar,
        material: item.material,
        ...zoneData,
        totalGeral,
      };
    });
    
    // Ordenar para garantir consistência
    const sortedZones = Array.from(allZones).sort();
    
    // Garantir que todas as linhas tenham todas as zonas
    const finalData = formattedData.map(row => {
        const completeRow = { ...row };
        sortedZones.forEach(zone => {
            if (!(zone in completeRow)) {
                (completeRow as any)[zone] = 0;
            }
        });
        return completeRow;
    }).sort((a,b) => a.material.localeCompare(b.material));


    return NextResponse.json({ data: finalData, zones: sortedZones });

  } catch (error) {
    console.error('Erro na API de pré-separação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}