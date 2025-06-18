
"use client"

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Filter, Printer } from "lucide-react";
import { usePreSeparacaoData } from "@/hooks/usePreSeparacaoData";

export default function PreSeparacaoTab() {
  const { data, zones, isLoading, error } = usePreSeparacaoData();
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | "SECO" | "FRIO" | "ORGANICO" | "OVO">("Todos");

  const availableTypes = useMemo(() => {
    const types = new Set(data.map(item => item.tipoSepar));
    const sortedTypes = Array.from(types).sort((a,b) => {
      if (a === 'SECO') return -1;
      if (b === 'SECO') return 1;
      if (a === 'FRIO') return -1;
      if (b === 'FRIO') return 1;
      return a.localeCompare(b);
    });
    return ['Todos', ...sortedTypes];
  }, [data]);

  const filteredData = useMemo(() => {
    if (filtroTipo === "Todos") {
      return data;
    }
    return data.filter((item) => item.tipoSepar === filtroTipo);
  }, [data, filtroTipo]);
  
  const totals = useMemo(() => {
    const zoneTotals: { [key: string]: number } = {};
    zones.forEach(zone => zoneTotals[zone] = 0);
    let grandTotal = 0;

    filteredData.forEach(item => {
        zones.forEach(zone => {
            zoneTotals[zone] += (item[zone] as number || 0);
        });
        grandTotal += item.totalGeral;
    });

    return { ...zoneTotals, totalGeral: grandTotal } as { [key: string]: number };
  }, [filteredData, zones]);

  const handlePrint = useCallback(() => {
    if (filteredData.length === 0) return;

    const printStyles = `
      <style>
        @media print {
          @page {
            size: landscape;
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
          .header-info {
            text-align: left;
          }
          .header-info h1 {
            font-size: 16pt;
            margin: 0;
            font-weight: bold;
          }
          .header-info p {
            font-size: 11pt;
            margin: 0;
          }
          .header-datetime {
            text-align: right;
            font-size: 9pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          tbody tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tfoot tr {
            font-weight: bold;
            background-color: #e8e8e8;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
        }
      </style>
    `;

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

    const tableBody = `
      <tbody>
        ${filteredData.map(item => `
          <tr>
            <td>${item.tipoSepar}</td>
            <td>${item.material}</td>
            ${zones.map(zone => `<td class="text-center">${(item[zone] as number) || 0}</td>`).join('')}
            <td class="text-center">${item.totalGeral}</td>
          </tr>
        `).join('')}
      </tbody>
    `;

    const tableFooter = `
      <tfoot>
        <tr>
          <td colspan="2" class="text-right"><strong>Total Geral</strong></td>
          ${zones.map(zone => `<td class="text-center"><strong>${totals[zone]}</strong></td>`).join('')}
          <td class="text-center"><strong>${totals.totalGeral}</strong></td>
        </tr>
      </tfoot>
    `;

    const reportTitle = `PRÉ-SEPARAÇÃO ${filtroTipo !== 'Todos' ? `(${filtroTipo})` : ''}`;
    const now = new Date();
    const printContent = `
      <html>
        <head>
          <title>${reportTitle}</title>
          ${printStyles}
        </head>
        <body>
          <div class="print-header">
            <div class="header-info">
              <h1>Sistema Colhetron</h1>
              <p>${reportTitle}</p>
            </div>
            <div class="header-datetime">
              ${now.toLocaleDateString('pt-BR')} <br/>
              ${now.toLocaleTimeString('pt-BR')}
            </div>
          </div>
          <table>
            ${tableHeader}
            ${tableBody}
            ${tableFooter}
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }, [filteredData, zones, totals, filtroTipo]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">Calculando pré-separação...</span>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center py-12"
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Erro ao carregar dados</h3>
          <p className="text-gray-400">{error}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold apple-font text-white">Pré-Separação por Zona</h2>
          <p className="text-gray-400">Total de volumes agrupados por material e zona de separação.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 p-1 rounded-lg bg-gray-800/50 border border-gray-700">
                <Filter className="w-4 h-4 text-gray-400 ml-2" />
                {availableTypes.filter(t => t !== 'Todos').map(type => (
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
              {filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <TableRow key={`${item.material}-${index}`} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                    <TableCell className="text-white text-xs border-r border-gray-700 font-medium">{item.tipoSepar}</TableCell>
                    <TableCell className="text-white text-xs border-r border-gray-700">{item.material}</TableCell>
                    {zones.map(zone => (
                      <TableCell key={zone} className="text-center text-xs border-r border-gray-700">
                        <span className="text-gray-300 font-semibold">{(item[zone] as number) || 0}</span>
                      </TableCell>
                    ))}
                    <TableCell className="text-center text-xs">
                      <span className="text-white font-bold">{item.totalGeral}</span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={zones.length + 3} className="text-center text-gray-400 py-8">
                    Nenhum dado encontrado para a seleção atual.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
             <tfoot>
                <TableRow className="bg-gray-800 border-t-2 border-gray-700">
                    <TableHead colSpan={2} className="text-right text-white font-bold text-sm pr-4">Total Geral</TableHead>
                    {zones.map(zone => (
                         <TableCell key={`total-${zone}`} className="text-center text-white font-bold text-sm">
                            {totals[zone]}
                         </TableCell>
                    ))}
                    <TableCell className="text-center text-white font-bold text-sm">
                        {totals.totalGeral}
                    </TableCell>
                </TableRow>
            </tfoot>
          </Table>
        </div>
      </div>
    </motion.div>
  );
}