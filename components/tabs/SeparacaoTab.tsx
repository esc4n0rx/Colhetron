"use client"

import { useState, useMemo, useCallback } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, AlertCircle, Filter, Printer } from "lucide-react"
import { useSeparacaoData } from "@/hooks/useSeparacaoData"

export default function SeparacaoTab() {
  const { data, lojas, isLoading, error, getOrderedStores } = useSeparacaoData()
  const [filtroTipo, setFiltroTipo] = useState<"Todos" | "SECO" | "FRIO" | "ORGANICO">("Todos")
  const [filtroZona, setFiltroZona] = useState<string>("Todas")
  const [filtroSubzona, setFiltroSubzona] = useState<string>("Todas")

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


  const filteredData = useMemo(() => {
    if (filtroTipo === "Todos") return data
    return data.filter(item => item.tipoSepar === filtroTipo)
  }, [data, filtroTipo])


  const orderedStores = useMemo(() => {
    if (filtroTipo === "Todos") return []
    
    let stores = getOrderedStores(filtroTipo)
    
    if (filtroZona !== "Todas") {
      stores = stores.filter(loja => {
        const zona = filtroTipo === 'FRIO' ? loja.zonaFrio : loja.zonaSeco
        return zona === filtroZona
      })
    }
    

    if (filtroSubzona !== "Todas" && filtroTipo === 'SECO') {
      stores = stores.filter(loja => loja.subzonaSeco === filtroSubzona)
    }
    
    return stores
  }, [getOrderedStores, filtroTipo, filtroZona, filtroSubzona])

  const totals = useMemo<{ [key: string]: number }>(() => {
    const storeTotals: { [key: string]: number } = {}
    let grandTotal = 0

    orderedStores.forEach(store => {
      storeTotals[store.prefixo] = 0
    })

    filteredData.forEach(item => {
      orderedStores.forEach(store => {
        const quantity = (item[store.prefixo] as number) || 0
        storeTotals[store.prefixo] += quantity
        grandTotal += quantity
      })
    })

    storeTotals.total = grandTotal
    return storeTotals
  }, [filteredData, orderedStores])

  const handlePrint = useCallback(() => {
    if (filteredData.length === 0 || orderedStores.length === 0) return

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
          .filter-info {
            background-color: #f5f5f5;
            padding: 0.5rem;
            margin-bottom: 1rem;
            border-radius: 4px;
            font-size: 9pt;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 4px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            font-size: 8pt;
          }
          td {
            font-size: 8pt;
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
          .store-header {
            writing-mode: vertical-lr;
            text-orientation: mixed;
            min-width: 30px;
            max-width: 30px;
          }
        }
      </style>
    `

    const filterInfo = `
      <div class="filter-info">
        <strong>Filtros Aplicados:</strong> 
        Tipo: ${filtroTipo} | 
        Zona: ${filtroZona} | 
        Subzona: ${filtroSubzona}
      </div>
    `

    const tableHeader = `
      <thead>
        <tr>
          <th rowspan="2" style="vertical-align: middle;">MATERIAL SEPARAÇÃO</th>
          ${orderedStores.map(store => `
            <th class="text-center store-header">${store.prefixo}</th>
          `).join('')}
        </tr>
        <tr>
          ${orderedStores.map(store => `
            <th class="text-center" style="font-size: 7pt;">${store.nome.substring(0, 15)}</th>
          `).join('')}
        </tr>
      </thead>
    `

    const tableBody = `
      <tbody>
        ${filteredData.map(item => `
          <tr>
            <td style="min-width: 200px;">${item.material}</td>
            ${orderedStores.map(store => `
              <td class="text-center">${(item[store.prefixo] as number) || 0}</td>
            `).join('')}
          </tr>
        `).join('')}
      </tbody>
    `

    const tableFooter = `
    <tfoot>
      <tr>
        <td class="text-right"><strong>Total Geral</strong></td>
        ${orderedStores.map(store => `
          <td class="text-center"><strong>${(totals as any)[store.prefixo] || 0}</strong></td>
        `).join('')}
      </tr>
    </tfoot>
  `

    const reportTitle = `SEPARAÇÃO ${filtroTipo !== 'Todos' ? `(${filtroTipo})` : ''}`
    const now = new Date()
    
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
          ${filterInfo}
          <table>
            ${tableHeader}
            ${tableBody}
            ${tableFooter}
          </table>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }
  }, [filteredData, orderedStores, totals, filtroTipo, filtroZona, filtroSubzona])


  const handleTipoChange = (tipo: typeof filtroTipo) => {
    setFiltroTipo(tipo)
    setFiltroZona("Todas")
    setFiltroSubzona("Todas")
  }

  const handleZonaChange = (zona: string) => {
    setFiltroZona(zona)
    setFiltroSubzona("Todas")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="ml-3 text-gray-400">Carregando dados de separação...</span>
      </div>
    )
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
    )
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
          disabled={filteredData.length === 0 || orderedStores.length === 0}
          variant="outline"
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card className="bg-gray-900/50 border-gray-800 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">TIPO SEPARAÇÃO</span>
              <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((tipo) => (
                <Button
                  key={tipo}
                  size="sm"
                  variant={filtroTipo === tipo ? "default" : "outline"}
                  onClick={() => handleTipoChange(tipo as typeof filtroTipo)}
                  className={`text-xs ${
                    filtroTipo === tipo 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {tipo}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">ZONA SEPARAÇÃO</span>
              <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-2">
              {availableZones.map((zona) => (
                <Button
                  key={zona}
                  size="sm"
                  variant={filtroZona === zona ? "default" : "outline"}
                  onClick={() => handleZonaChange(zona)}
                  disabled={filtroTipo === "Todos"}
                  className={`text-xs ${
                    filtroZona === zona 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } disabled:opacity-50`}
                >
                  {zona}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">SUBZONA SEPARAÇÃO</span>
              <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-1">
              {availableSubzones.map((subzona) => (
                <Button
                  key={subzona}
                  size="sm"
                  variant={filtroSubzona === subzona ? "default" : "outline"}
                  onClick={() => setFiltroSubzona(subzona)}
                  disabled={filtroTipo !== "SECO" || filtroZona === "Todas"}
                  className={`text-xs ${
                    filtroSubzona === subzona 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  } disabled:opacity-50`}
                >
                  {subzona}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>


      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 bg-gray-800/50">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-8">
                    Quant. Volumes
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-80">
                    MATERIAL SEPARAÇÃO
                  </TableHead>
                  {orderedStores.map((store, index) => (
                    <TableHead
                      key={store.prefixo}
                      className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-12"
                    >
                      -{index + 1}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow className="border-gray-700 bg-gray-800/30">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700"></TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700"></TableHead>
                  {orderedStores.map((store) => (
                    <TableHead
                      key={`${store.prefixo}-name`}
                      className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-12"
                    >
                      {store.prefixo}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                      <TableCell className="text-white text-xs border-r border-gray-700 font-medium"></TableCell>
                      <TableCell className="text-white text-xs border-r border-gray-700">{item.material}</TableCell>
                      {orderedStores.map((store) => (
                        <TableCell key={store.prefixo} className="text-center text-xs border-r border-gray-700">
                          <span
                            className={`${
                              (item[store.prefixo] as number) > 0 
                                ? "text-green-400 font-semibold" 
                                : "text-gray-500"
                            }`}
                          >
                            {(item[store.prefixo] as number) || ""}
                          </span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={orderedStores.length + 2} className="text-center text-gray-400 py-8">
                      {filtroTipo === "Todos" 
                        ? "Selecione um tipo de separação para visualizar os dados"
                        : "Nenhum material encontrado para os filtros selecionados"
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {filteredData.length > 0 && (
                <tfoot>
                  <TableRow className="bg-gray-800 border-t-2 border-gray-700">
                    <TableHead colSpan={2} className="text-right text-white font-bold text-sm pr-4">
                      Total Geral
                    </TableHead>
                    {orderedStores.map((store) => (
                      <TableCell key={`total-${store.prefixo}`} className="text-center text-white font-bold text-sm">
                        {totals[store.prefixo] || 0}
                      </TableCell>
                    ))}
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}