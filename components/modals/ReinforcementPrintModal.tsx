// components/modals/ReinforcementPrintModal.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, AlertCircle, Filter, Printer, X } from "lucide-react";
import { useReinforcementData, LojaOrdenada } from "@/hooks/useReinforcementData";

interface ReinforcementPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  separationId: string | null;
}

export default function ReinforcementPrintModal({ isOpen, onClose, separationId }: ReinforcementPrintModalProps) {
  const { items, isLoading, error, fetchLastReinforcement, getOrderedStores } = useReinforcementData();
  
  const [filtroZona, setFiltroZona] = useState<string>("Todas");
  const [filtroSubzona, setFiltroSubzona] = useState<string>("Todas");
  
  // Tipo fixo para reforço
  const tipoSeparacaoFixo = 'REFORÇO';

  useEffect(() => {
    if (isOpen && separationId) {
      fetchLastReinforcement(separationId);
    }
  }, [isOpen, separationId, fetchLastReinforcement]);

  const allStoresOrdered = useMemo(() => getOrderedStores(tipoSeparacaoFixo), [getOrderedStores, tipoSeparacaoFixo]);

  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    allStoresOrdered.forEach(loja => {
      const zona = loja.zonaSeco;
      if (zona && zona.trim() !== '') {
        zones.add(zona);
      }
    });
    return ['Todas', ...Array.from(zones).sort()];
  }, [allStoresOrdered]);

  const availableSubzones = useMemo(() => {
    if (filtroZona === "Todas") return ["Todas"];
    
    const subzones = new Set<string>();
    allStoresOrdered.forEach(loja => {
      if (loja.zonaSeco === filtroZona && loja.subzonaSeco && loja.subzonaSeco.trim() !== '') {
        subzones.add(loja.subzonaSeco);
      }
    });
    return ['Todas', ...Array.from(subzones).sort()];
  }, [allStoresOrdered, filtroZona]);

  const orderedStoresToDisplay = useMemo(() => {
    let stores = allStoresOrdered;

    if (filtroZona !== "Todas") {
      stores = stores.filter(loja => loja.zonaSeco === filtroZona);
    }
    
    if (filtroSubzona !== "Todas") {
      stores = stores.filter(loja => loja.subzonaSeco === filtroSubzona);
    }
    
    return stores;
  }, [allStoresOrdered, filtroZona, filtroSubzona]);

  const totals = useMemo(() => {
    const storeTotals: { [key: string]: number } = {};
    let grandTotal = 0;

    orderedStoresToDisplay.forEach(store => {
      storeTotals[store.prefixo] = 0;
    });

    items.forEach(item => {
      orderedStoresToDisplay.forEach(store => {
        const quantity = (item[store.prefixo] as number) || 0;
        storeTotals[store.prefixo] += quantity;
        grandTotal += quantity;
      });
    });

    storeTotals.total = grandTotal;
    return storeTotals;
  }, [items, orderedStoresToDisplay]);

  const handlePrint = useCallback(() => {
    if (items.length === 0 || orderedStoresToDisplay.length === 0) return;

    // A lógica de impressão é uma adaptação direta da SeparacaoTab
    const printStyles = `
      <style>
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; }
          .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem; }
          .header-info h1 { font-size: 16pt; margin: 0; font-weight: bold; }
          .header-info p { font-size: 11pt; margin: 0; }
          .header-datetime { text-align: right; font-size: 9pt; }
          .filter-info { background-color: #f5f5f5; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 9pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border: 1px solid #ddd; padding: 4px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; font-size: 8pt; }
          td { font-size: 8pt; }
          .text-center { text-align: center; }
          .store-header { writing-mode: vertical-lr; text-orientation: mixed; min-width: 30px; max-width: 30px; }
        }
      </style>
    `;

    const filterInfo = `<div class="filter-info"><strong>Filtros:</strong> Zona: ${filtroZona} | Subzona: ${filtroSubzona}</div>`;

    const tableHeader = `<thead><tr><th>MATERIAL</th>${orderedStoresToDisplay.map(store => `<th class="text-center store-header">${store.prefixo}</th>`).join('')}</tr></thead>`;

    const tableBody = `<tbody>${items.map(item => `<tr><td style="min-width: 200px;">${item.material}</td>${orderedStoresToDisplay.map(store => `<td class="text-center">${(item[store.prefixo] as number) || 0}</td>`).join('')}</tr>`).join('')}</tbody>`;

    const tableFooter = `<tfoot><tr><td class="text-right"><strong>Total Geral</strong></td>${orderedStoresToDisplay.map(store => `<td class="text-center"><strong>${totals[store.prefixo] || 0}</strong></td>`).join('')}</tr></tfoot>`;

    const reportTitle = "IMPRESSÃO DE REFORÇO";
    const now = new Date();
    
    const printContent = `<html><head><title>${reportTitle}</title>${printStyles}</head><body><div class="print-header"><div class="header-info"><h1>Sistema Colhetron</h1><p>${reportTitle}</p></div><div class="header-datetime">${now.toLocaleDateString('pt-BR')} <br/>${now.toLocaleTimeString('pt-BR')}</div></div>${filterInfo}<table>${tableHeader}${tableBody}${tableFooter}</table></body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }, [items, orderedStoresToDisplay, totals, filtroZona, filtroSubzona]);

  const handleZonaChange = (zona: string) => {
    setFiltroZona(zona);
    setFiltroSubzona("Todas");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex justify-between items-center">
            <DialogTitle>Impressão de Reforço</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>
          <DialogDescription>Filtre e ordene as lojas para imprimir o mapa de separação do reforço.</DialogDescription>
        </DialogHeader>
        
        <div className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-4 border-y border-gray-700 px-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Zona:</span>
                <div className="flex flex-wrap gap-1">
                  {availableZones.map(zona => (
                      <Button key={zona} size="sm" variant={filtroZona === zona ? "default" : "outline"} onClick={() => handleZonaChange(zona)} className="text-xs">{zona}</Button>
                  ))}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Sub-Zona:</span>
                <div className="flex flex-wrap gap-1">
                  {availableSubzones.map(subzona => (
                      <Button key={subzona} size="sm" variant={filtroSubzona === subzona ? "default" : "outline"} onClick={() => setFiltroSubzona(subzona)} disabled={filtroZona === "Todas"} className="text-xs">{subzona}</Button>
                  ))}
                </div>
            </div>
          </div>
          <Button onClick={handlePrint} disabled={items.length === 0 || orderedStoresToDisplay.length === 0}><Printer className="w-4 h-4 mr-2" />Imprimir</Button>
        </div>
        
        <div className="flex-1 overflow-auto px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-red-400"><AlertCircle className="w-5 h-5 mr-2" /> {error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 bg-gray-800/50">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-80 sticky left-0 bg-gray-800 z-10">MATERIAL</TableHead>
                  {orderedStoresToDisplay.map(store => <TableHead key={store.prefixo} className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-12">{store.prefixo}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? items.map(item => (
                  <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30">
                    <TableCell className="text-white text-xs border-r border-gray-700 sticky left-0 bg-gray-900 z-10">{item.material}</TableCell>
                    {orderedStoresToDisplay.map(store => (
                      <TableCell key={store.prefixo} className="text-center text-xs border-r border-gray-700">
                        <span className={(item[store.prefixo] as number) > 0 ? "text-green-400 font-semibold" : "text-gray-500"}>{(item[store.prefixo] as number) || ""}</span>
                      </TableCell>
                    ))}
                  </TableRow>
                )) : <TableRow><TableCell colSpan={orderedStoresToDisplay.length + 1} className="text-center text-gray-400 py-8">Nenhum item de reforço encontrado.</TableCell></TableRow>}
              </TableBody>
              {items.length > 0 && (
                <tfoot>
                  <TableRow className="bg-gray-800 border-t-2 border-gray-700">
                    <TableHead className="text-right text-white font-bold text-sm pr-4 sticky left-0 bg-gray-800 z-10">Total Geral</TableHead>
                    {orderedStoresToDisplay.map(store => <TableCell key={`total-${store.prefixo}`} className="text-center text-white font-bold text-sm">{totals[store.prefixo] || 0}</TableCell>)}
                  </TableRow>
                </tfoot>
              )}
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}