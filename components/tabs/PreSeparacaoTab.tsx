"use client"

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Filter, Printer } from "lucide-react";
import { usePreSeparacaoData } from "@/hooks/usePreSeparacaoData";

// --- COMPONENTE PRINCIPAL ---
// Esse cara aqui é responsável pela aba de "Pré-Separação".
// Ele busca os dados, permite filtrar por tipo e gera uma versão para impressão.
export default function PreSeparacaoTab() {
  // Nosso hook customizado que abstrai toda a lógica de buscar e preparar os dados. Show de bola!
  const { data, zones, isLoading, error } = usePreSeparacaoData();
  // Estado simples pra guardar qual filtro de tipo está ativo.
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | "SECO" | "FRIO" | "ORGANICO" | "OVO">("Todos");

  // useMemo para calcular os tipos disponíveis apenas uma vez ou quando os dados mudam.
  // Evita ficar recalculando isso a cada renderização.
  const availableTypes = useMemo(() => {
    const types = new Set(data.map(item => item.tipoSepar));
    // Dando uma organizada nos tipos pra aparecerem numa ordem fixa no filtro. Fica mais intuitivo.
    const sortedTypes = Array.from(types).sort((a,b) => {
      if (a === 'SECO') return -1;
      if (b === 'SECO') return 1;
      if (a === 'FRIO') return -1;
      if (b === 'FRIO') return 1;
      return a.localeCompare(b);
    });
    return ['Todos', ...sortedTypes];
  }, [data]);

  // A maior parte da lógica de negócio vive aqui dentro desse useMemo.
  // Ele é responsável por filtrar e ordenar os dados que vão para a tabela.
  const filteredData = useMemo(() => {
    // Passo 1: Aplicar o filtro de tipo (SECO, FRIO, etc.)
    const typeFiltered = filtroTipo === "Todos"
      ? data // Se for 'Todos', a gente pega a lista completa.
      : data.filter((item) => item.tipoSepar === filtroTipo);

    // ***** AJUSTE 1: FILTRAR ITENS ZERADOS *****
    // Passo 2: Agora, removemos da lista qualquer item cujo total geral seja 0.
    // Isso deixa a tabela bem mais limpa, mostrando só o que importa.
    const nonZeroFiltered = typeFiltered.filter(item => item.totalGeral > 0);

    // ***** AJUSTE 2: ORDENAÇÃO ALFABÉTICA *****
    // Passo 3: Por fim, ordenamos o resultado alfabeticamente pelo nome do material.
    // `localeCompare` é o jeito certo de comparar strings, lidando bem com acentos e etc.
    return nonZeroFiltered.sort((a, b) => a.material.localeCompare(b.material));

  }, [data, filtroTipo]); // Essa função só roda de novo se os dados brutos ou o filtro mudarem. Performance agradece.
  
  // useMemo para calcular os totais das colunas e o total geral.
  // Como ele depende de `filteredData`, ele já vai usar os dados filtrados e ordenados.
  const totals = useMemo(() => {
    const zoneTotals: { [key: string]: number } = {};
    zones.forEach(zone => zoneTotals[zone] = 0); // Inicia os totais de cada zona com 0.
    let grandTotal = 0;

    filteredData.forEach(item => {
        zones.forEach(zone => {
            zoneTotals[zone] += (item[zone] as number || 0);
        });
        grandTotal += item.totalGeral;
    });

    return { ...zoneTotals, totalGeral: grandTotal } as { [key: string]: number };
  }, [filteredData, zones]);

  // useCallback para a função de impressão com sistema de paginação otimizado.
  // Ela não será recriada a cada render, a não ser que suas dependências mudem.
  const handlePrint = useCallback(() => {
    if (filteredData.length === 0) return; // Se não tem nada pra imprimir, a gente nem se mexe.

    // ***** AJUSTE: LIMITADOR DE 18 ITENS POR PÁGINA *****
    const itemsPerPage = 18;
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    const printStyles = `
      <style>
        @media print {
          @page {
            size: landscape; /* Página deitada pra caber mais colunas */
            margin: 1cm;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #333;
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 1.5rem;
            border-bottom: 2px solid #ccc;
            padding-bottom: 0.5rem;
          }
          .header-info h1 {
            font-size: 16pt; margin: 0; font-weight: bold;
          }
          .header-info p {
            font-size: 11pt; margin: 0;
          }
          .header-datetime {
            text-align: right; font-size: 9pt;
          }
          .page-info {
            position: fixed;
            top: 1cm;
            right: 1cm;
            font-size: 8pt;
          }
          .page-container {
            break-after: page;
          }
          .page-container:last-child {
            break-after: avoid;
          }
          table {
            width: 100%; border-collapse: collapse; margin-top: 1rem;
          }
          th, td {
            border: 1px solid #333; /* Bordas mais visíveis */
            padding: 6px; 
            text-align: left;
          }
          th {
            background-color: #000 !important; /* Fundo preto */
            color: #fff !important; /* Texto branco */
            font-weight: bold;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tbody tr:nth-child(even) {
            background-color: #f2f2f2 !important; /* zebra-striping para melhor leitura */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tfoot tr {
            font-weight: bold; 
            background-color: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      </style>
    `;

    let content = '<html><head>' + printStyles + '</head><body>';

    for (let page = 0; page < totalPages; page++) {
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
        const pageData = filteredData.slice(startIndex, endIndex);
        const isLastPage = page === totalPages - 1;
        const currentPageNum = page + 1;

        // Cabeçalho da tabela com a coluna "Total Geral" sempre visível.
        const tableHeader = `
          <thead>
            <tr>
              <th>TIPO SEPARAÇÃO</th>
              <th>MATERIAL SEPARAÇÃO</th>
              ${zones.map(zone => `<th class="text-center">${zone}</th>`).join('')}
              <th class="text-center">Total Geral</th>
            </tr>
          </thead>
        `;

        // Corpo da tabela renderizando o total de cada linha.
        const tableBody = `
          <tbody>
            ${pageData.map(item => `
              <tr>
                <td>${item.tipoSepar}</td>
                <td>${item.material}</td>
                ${zones.map(zone => `<td class="text-center">${item[zone] || 0}</td>`).join('')}
                <td class="text-center">${item.totalGeral || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        `;
        const calculatedGrandTotal = zones.reduce((sum, zone) => sum + (totals[zone] || 0), 0);

        const tableFooter = `
          <tfoot>
            <tr>
              <td colspan="2" class="text-right"><strong>Total Geral</strong></td>
              ${zones.map(zone => `<td class="text-center"><strong>${totals[zone] || 0}</strong></td>`).join('')}
              <td class="text-center"><strong>${calculatedGrandTotal}</strong></td>
            </tr>
          </tfoot>
        `;


        
        content += `
            <div class="page-container">
                <div class="print-header">
                    <div class="header-info">
                        <h1>Relatório de Separação</h1>
                    </div>
                    <div class="header-datetime">
                        <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                        <p>Página ${currentPageNum} de ${totalPages}</p>
                    </div>
                </div>
                <table>
                    ${tableHeader}
                    ${tableBody}
                    ${isLastPage ? tableFooter : ''} 
                </table>
            </div>
        `;
    }

    content += '</body></html>';
    
    const printWindow = window.open('', '_blank');
    if(printWindow) {
        printWindow.document.write(content);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    }
// AQUI ESTÁ A CORREÇÃO PRINCIPAL: Usando o array de dependências que você informou.
}, [filteredData, zones, totals, filtroTipo]);

  // --- RENDERIZAÇÃO CONDICIONAL ---
  // Enquanto os dados não chegam, mostramos um spinner. Essencial pra UX.
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">Calculando pré-separação...</span>
      </div>
    );
  }

  // Se der algum pau na busca dos dados, mostramos uma mensagem de erro clara.
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <span className="ml-3 text-gray-400">Erro ao carregar dados: {error}</span>
      </div>
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Filtros e botão de impressão */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">TIPO SEPARAÇÃO:</span>
                {availableTypes.filter(type => type !== 'Todos').map(type => (
                    <Button
                        key={type}
                        size="sm"
                        variant={filtroTipo === type ? "secondary" : "ghost"}
                        onClick={() => setFiltroTipo(type as any)}
                        className="text-xs px-3 py-1"
                    >
                        {type}
                    </Button>
                ))}
                <Button
                    size="sm"
                    variant={filtroTipo === "Todos" ? "secondary" : "ghost"}
                    onClick={() => setFiltroTipo("Todos")}
                    className="text-xs px-3 py-1"
                >
                    Todos
                </Button>
            </div>
            <Button 
                onClick={handlePrint} 
                disabled={filteredData.length === 0}
                variant="outline"
                className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50"
                aria-label="Imprimir pré-separação"
            >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
            </Button>
        </div>
      </div>

      {/* A tabela em si */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 bg-gray-800/50">
                <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-28">TIPO SEPARAÇÃO</TableHead>
                <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-80">MATERIAL SEPARAÇÃO</TableHead>
                {zones.map(zone => (
                  <TableHead key={zone} className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-24">{zone}</TableHead>
                ))}
                <TableHead className="text-gray-300 font-semibold text-xs text-center w-24">Total Geral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Se tiver dados, a gente mapeia e cria as linhas. Senão, mostra uma mensagem. */}
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <TableRow key={`${item.material}-${index}`} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                    <TableCell className="text-white text-xs border-r border-gray-700 font-medium">{item.tipoSepar}</TableCell>
                    <TableCell className="text-white text-xs border-r border-gray-700">{item.material}</TableCell>
                    {zones.map(zone => (
                      <TableCell key={zone} className="text-center text-xs border-r border-gray-700">
                        {/* Se o valor for 0, ele aparece mais apagadinho. Um detalhe legal de UI. */}
                        <span className={ (item[zone] as number || 0) > 0 ? 
                          "text-white font-medium" : 
                          "text-gray-500"
                        }>
                          {(item[zone] as number) || 0}
                        </span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-xs">
                      <span className="text-white font-semibold">{item.totalGeral}</span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={zones.length + 3} className="text-center text-gray-400 py-8">
                    Nenhum item encontrado para o filtro selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {/* Footer com totais só aparece se tiver dados */}
            {filteredData.length > 0 && (
              <tfoot>
                <TableRow className="bg-gray-800/80 border-gray-700">
                  <TableCell colSpan={2} className="text-right text-white font-semibold text-xs border-r border-gray-700">
                    Total Geral
                  </TableCell>
                  {zones.map(zone => (
                    <TableCell key={zone} className="text-center text-white font-semibold text-xs border-r border-gray-700">
                      {totals[zone]}
                    </TableCell>
                  ))}
                  <TableCell className="text-center text-white font-semibold text-xs">
                    {totals.totalGeral}
                  </TableCell>
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </div>
    </motion.div>
  );
}