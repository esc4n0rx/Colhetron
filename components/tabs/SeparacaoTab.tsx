// components/tabs/SeparacaoTab.tsx
// Este componente gerencia a visualização de dados de separação organizados por zona e tipo
// Implementa filtros inteligentes e ocultação automática de colunas e linhas sem quantidades

"use client"

import { useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertCircle, Filter, Printer } from "lucide-react"
import { useSeparacaoData } from "@/hooks/useSeparacaoData"

// Tipagem para as lojas, para garantir consistência
type Store = {
  prefixo: string;
  zonaFrio?: string;
  zonaSeco?: string;
  subzonaSeco?: string;
  // Adicione outras propriedades da loja se necessário
};

export default function SeparacaoTab() {
  // Hook customizado que busca dados de separação e informações das lojas
  const { data, lojas, isLoading, error, getOrderedStores } = useSeparacaoData()
  
  // Estados para controle dos filtros aplicados pelo usuário
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | "SECO" | "FRIO" | "ORGANICO"|"OVOS"| "REFORÇO">("Todos")
  const [filtroZona, setFiltroZona] = useState<string>("Todas")
  const [filtroSubzona, setFiltroSubzona] = useState<string>("Todas")

  // Memoização dos tipos disponíveis nos dados, ordenados por prioridade
  const availableTypes = useMemo(() => {
    const types = new Set(data.map(item => item.tipoSepar))
    const sortedTypes = Array.from(types).sort((a, b) => {
      if (a === 'SECO') return -1
      if (b === 'SECO') return 1
      if (a === 'FRIO') return -1
      if (b === 'FRIO') return 1
      return a.localeCompare(b)
    })
    return ['Todos', ...sortedTypes]
  }, [data])

  // Calcula zonas disponíveis baseado no tipo de separação selecionado
  const availableZones = useMemo(() => {
    if (filtroTipo === "Todos") return ["Todas"]
    const zones = new Set<string>()
    lojas.forEach(loja => {
      const zona = filtroTipo === 'FRIO' ? loja.zonaFrio : loja.zonaSeco
      if (zona && zona.trim() !== '') {
        zones.add(zona)
      }
    })
    return ['Todas', ...Array.from(zones).sort()]
  }, [lojas, filtroTipo])

  // Calcula subzonas disponíveis (apenas para tipo SECO e quando uma zona específica é selecionada)
  const availableSubzones = useMemo(() => {
    if (filtroTipo === "Todos" || filtroZona === "Todas" || filtroTipo === 'FRIO') {
      return ["Todas"]
    }
    const subzones = new Set<string>()
    lojas.forEach(loja => {
      if (loja.zonaSeco === filtroZona && loja.subzonaSeco && loja.subzonaSeco.trim() !== '') {
        subzones.add(loja.subzonaSeco)
      }
    })
    return ['Todas', ...Array.from(subzones).sort()]
  }, [lojas, filtroZona, filtroTipo])

  // Filtra os dados baseado no tipo de separação selecionado
  const filteredData = useMemo(() => {
    if (filtroTipo === "Todos") return []
    return data.filter(item => item.tipoSepar === filtroTipo)
  }, [data, filtroTipo])

  // Obtém lojas ordenadas aplicando filtros de zona e subzona
  const orderedStores = useMemo(() => {
    if (filtroTipo === "Todos") return []
    let stores = getOrderedStores(filtroTipo)
    if (filtroZona !== "Todas") {
      stores = stores.filter(loja => (filtroTipo === 'FRIO' ? loja.zonaFrio : loja.zonaSeco) === filtroZona)
    }
    if (filtroSubzona !== "Todas" && filtroTipo === 'SECO') {
      stores = stores.filter(loja => loja.subzonaSeco === filtroSubzona)
    }
    return stores
  }, [getOrderedStores, filtroTipo, filtroZona, filtroSubzona])

  // Filtra lojas que possuem pelo menos uma quantidade > 0 nos dados filtrados
  const visibleStores = useMemo(() => {
    if (orderedStores.length === 0 || filteredData.length === 0) return []
    return orderedStores.filter(store => 
      filteredData.some(item => (item[store.prefixo] as number) > 0)
    )
  }, [orderedStores, filteredData])

  // ✅ NOVO: Filtra os materiais para exibir apenas linhas com quantidades > 0 nas lojas visíveis
  const visibleData = useMemo(() => {
    if (!visibleStores.length || !filteredData.length) return [];
    // Retorna apenas itens que têm quantidade em pelo menos uma das lojas visíveis
    return filteredData.filter(item =>
      visibleStores.some(store => (item[store.prefixo] as number) > 0)
    );
  }, [filteredData, visibleStores]);
  
  // Função para gerar e imprimir o relatório
  const handlePrint = useCallback(() => {
    if (visibleData.length === 0 || visibleStores.length === 0) return;

    const printStyles = `
      <style>
        @media print {
          @page { size: landscape; margin: 0.8cm; }
          body { font-family: Arial, sans-serif; font-size: 12pt; color: #000; }
          .page-container { break-after: page; }
          .page-container:last-child { break-after: avoid; }
          .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; border-bottom: 2px solid #ccc; padding-bottom: 0.5rem; }
          .header-info h1 { font-size: 20pt; margin: 0; font-weight: bold; }
          .header-info p { font-size: 14pt; margin: 0; }
          .header-datetime { text-align: right; font-size: 10pt; }
          .filter-info { background-color: #f5f5f5; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px; font-size: 10pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border: 1px solid #000; padding: 5px; text-align: left; word-break: break-word; font-size: 9pt; }
          .text-center { text-align: center; }
          .store-header { writing-mode: vertical-lr; text-orientation: mixed; min-width: 35px; max-width: 35px; white-space: nowrap; }
        }
      </style>
    `;

    const reportTitle = `SEPARAÇÃO ${filtroTipo !== 'Todos' ? `(${filtroTipo})` : ''}`;
    const now = new Date();
    
    const chunkSize = Math.ceil(visibleStores.length / 2);
    const storeChunks: Store[][] = [];
    for (let i = 0; i < visibleStores.length; i += chunkSize) {
        storeChunks.push(visibleStores.slice(i, i + chunkSize));
    }

    const pagesHtml = storeChunks.map((storeChunk, index) => {
      const isLastPage = index === storeChunks.length - 1;
      
      const highlightStyle = `font-weight: bold; background-color: #e9ecef;`;

      const tableHeader = `
        <thead>
          <tr>
            <th style="${highlightStyle} min-width: 180px;">MATERIAL SEPARAÇÃO</th>
            ${storeChunk.map(store => `<th class="text-center store-header">${store.prefixo}</th>`).join('')}
            ${isLastPage ? `<th class="text-center" style="${highlightStyle}">TOTAL</th>` : ''}
          </tr>
        </thead>
      `;

      const tableBody = `
        <tbody>
          ${visibleData.map(item => {
            const rowTotalAllStores = visibleStores.reduce((sum, store) => sum + ((item[store.prefixo] as number) || 0), 0);
            // Renderiza a linha apenas se tiver quantidade em alguma loja da página atual
            if (!storeChunk.some(store => (item[store.prefixo] as number) > 0)) {
              return '';
            }
            return `
              <tr>
                <td style="${highlightStyle}">${item.material}</td>
                ${storeChunk.map(store => {
                  const quantity = (item[store.prefixo] as number) || 0;
                  return `<td class="text-center">${quantity || ''}</td>`;
                }).join('')}
                ${isLastPage ? `<td class="text-center" style="${highlightStyle}">${rowTotalAllStores || ''}</td>` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      `;
      
      const tableFooter = `
        <tfoot>
          <tr>
            <td style="${highlightStyle}">Total Loja</td>
            ${storeChunk.map(store => {
              // ✅ CORREÇÃO: Soma apenas os dados visíveis na tabela
              const totalForStoreOnPage = visibleData.reduce((sum, item) => {
                // Soma apenas se a linha for relevante para a página atual
                if (storeChunk.some(s => (item[s.prefixo] as number) > 0)) {
                  return sum + ((item[store.prefixo] as number) || 0);
                }
                return sum;
              }, 0);
              return `<td class="text-center" style="${highlightStyle}">${totalForStoreOnPage || ''}</td>`;
            }).join('')}
            ${isLastPage ? `<td style="${highlightStyle}"></td>` : ''}
          </tr>
        </tfoot>
      `;

      return `<div class="page-container"><table>${tableHeader}${tableBody}${tableFooter}</table></div>`;
    }).join('');

    const printContent = `<html><head><title>${reportTitle}</title>${printStyles}</head><body><div class="print-header"><div class="header-info"><h1>Sistema Colhetron</h1><p>${reportTitle}</p></div><div class="header-datetime">${now.toLocaleDateString('pt-BR')} <br/>${now.toLocaleTimeString('pt-BR')}</div></div><div class="filter-info"><strong>Filtros Aplicados:</strong> Tipo: ${filtroTipo} | Zona: ${filtroZona} | Subzona: ${filtroSubzona}</div>${pagesHtml}</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }, [visibleData, visibleStores, filtroTipo, filtroZona, filtroSubzona]);

  // Função para alterar tipo de separação e resetar filtros dependentes
  const handleTipoChange = (tipo: typeof filtroTipo) => {
    setFiltroTipo(tipo);
    setFiltroZona("Todas");
    setFiltroSubzona("Todas");
  };

  // Função para alterar zona e resetar subzona
  const handleZonaChange = (zona: string) => {
    setFiltroZona(zona);
    setFiltroSubzona("Todas");
  };

  // Estados de loading e error com componentes estilizados
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">Carregando dados de separação...</span>
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold apple-font text-white">Separação por Zona</h2>
          <p className="text-gray-400">Quantidades organizadas por zona e ordem de separação</p>
        </div>
        <Button
          onClick={handlePrint}
          disabled={visibleData.length === 0 || visibleStores.length === 0}
          variant="outline"
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50"
          aria-label="Imprimir relatório de separação"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900/50 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-medium">TIPO SEPARAÇÃO</span>
                <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-2">
                {availableTypes.map((tipo) => (
                    <Button key={tipo} size="sm" variant={filtroTipo === tipo ? "default" : "outline"} onClick={() => handleTipoChange(tipo as typeof filtroTipo)} className={`text-xs ${filtroTipo === tipo ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`} aria-pressed={filtroTipo === tipo}>
                        {tipo}
                    </Button>
                ))}
            </div>
        </Card>
        <Card className="bg-gray-900/50 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-medium">ZONA SEPARAÇÃO</span>
                <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-2">
                {availableZones.map((zona) => (
                    <Button key={zona} size="sm" variant={filtroZona === zona ? "default" : "outline"} onClick={() => handleZonaChange(zona)} disabled={filtroTipo === "Todos"} className={`text-xs ${filtroZona === zona ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"} disabled:opacity-50`} aria-pressed={filtroZona === zona}>
                        {zona}
                    </Button>
                ))}
            </div>
        </Card>
        <Card className="bg-gray-900/50 border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-medium">SUBZONA SEPARAÇÃO</span>
                <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-1">
                {availableSubzones.map((subzona) => (
                    <Button key={subzona} size="sm" variant={filtroSubzona === subzona ? "default" : "outline"} onClick={() => setFiltroSubzona(subzona)} disabled={filtroTipo !== "SECO" || filtroZona === "Todos"} className={`text-xs ${filtroSubzona === subzona ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"} disabled:opacity-50`} aria-pressed={filtroSubzona === subzona}>
                        {subzona}
                    </Button>
                ))}
            </div>
        </Card>
      </div>

      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 bg-gray-800/50">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-80">MATERIAL SEPARAÇÃO</TableHead>
                  {visibleStores.map((store) => (
                    <TableHead key={store.prefixo} className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-12">
                        {store.prefixo}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ✅ CORREÇÃO: Renderiza a partir de visibleData para mostrar apenas linhas com valores */}
                {visibleData.length > 0 ? (
                  visibleData.map((item) => (
                    <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                      <TableCell className="text-white text-xs border-r border-gray-700">{item.material}</TableCell>
                      {visibleStores.map((store) => (
                        <TableCell key={store.prefixo} className="text-center text-xs border-r border-gray-700">
                          <span className={`${(item[store.prefixo] as number) > 0 ? "text-green-400 font-semibold" : "text-gray-500"}`}>
                            {(item[store.prefixo] as number) || ""}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={visibleStores.length + 1} className="text-center text-gray-400 py-8">
                      {filtroTipo === "Todos" ? "Selecione um tipo de separação para visualizar os dados" : "Nenhum material encontrado para os filtros selecionados"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {/* ✅ CORREÇÃO: Calcula totais a partir de visibleData para refletir a soma correta */}
              {visibleData.length > 0 && visibleStores.length > 0 && (
                <tfoot>
                  <TableRow className="bg-gray-800 border-t-2 border-gray-700">
                    <TableHead className="text-right text-white font-bold text-sm pr-4">Total Loja</TableHead>
                    {visibleStores.map((store) => {
                       const totalForStore = visibleData.reduce((sum, item) => sum + ((item[store.prefixo] as number) || 0), 0);
                       return (
                          <TableCell key={`total-${store.prefixo}`} className="text-center text-white font-bold text-sm">
                            {totalForStore}
                          </TableCell>
                       );
                    })}
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}