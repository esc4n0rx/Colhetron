"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, ChevronDown } from "lucide-react"

const mockFaturamento = [
  {
    id: 1,
    codLojaSap: "F001",
    codProduto: "100000",
    quantVolumes: 3,
  },
  {
    id: 2,
    codLojaSap: "F001",
    codProduto: "100048",
    quantVolumes: 3,
  },
  {
    id: 3,
    codLojaSap: "F001",
    codProduto: "100061",
    quantVolumes: 2,
  },
  {
    id: 4,
    codLojaSap: "F001",
    codProduto: "100068",
    quantVolumes: 2,
  },
  {
    id: 5,
    codLojaSap: "F001",
    codProduto: "100070",
    quantVolumes: 2,
  },
  {
    id: 6,
    codLojaSap: "F001",
    codProduto: "100074",
    quantVolumes: 1,
  },
  {
    id: 7,
    codLojaSap: "F001",
    codProduto: "100160",
    quantVolumes: 4,
  },
  {
    id: 8,
    codLojaSap: "F001",
    codProduto: "100161",
    quantVolumes: 6,
  },
  {
    id: 9,
    codLojaSap: "F001",
    codProduto: "100162",
    quantVolumes: 3,
  },
  {
    id: 10,
    codLojaSap: "F001",
    codProduto: "100171",
    quantVolumes: 5,
  },
]

export default function FaturamentoTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroLoja, setFiltroLoja] = useState("Todas")
  const [filteredData, setFilteredData] = useState(mockFaturamento)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    applyFilters(term, filtroLoja)
  }

  const handleLojaFilter = (loja: string) => {
    setFiltroLoja(loja)
    applyFilters(searchTerm, loja)
  }

  const applyFilters = (search: string, loja: string) => {
    let filtered = mockFaturamento

    if (search) {
      filtered = filtered.filter(
        (item) => item.codProduto.includes(search) || item.codLojaSap.toLowerCase().includes(search.toLowerCase()),
      )
    }

    if (loja !== "Todas") {
      filtered = filtered.filter((item) => item.codLojaSap === loja)
    }

    setFilteredData(filtered)
  }

  const generateTemplate = () => {
    // Simulação de geração de template
    const csvContent = [
      "COD_LOJA_SAP,COD_PRODUTO,Quant. Volumes",
      ...filteredData.map((item) => `${item.codLojaSap},${item.codProduto},${item.quantVolumes}`),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `faturamento_template_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalVolumes = filteredData.reduce((sum, item) => sum + item.quantVolumes, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold apple-font text-white">Faturamento</h2>
          <p className="text-gray-400">Gestão de faturamento e geração de templates</p>
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
            />
          </div>

          <Select value={filtroLoja} onValueChange={handleLojaFilter}>
            <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="Todas">Todas</SelectItem>
              <SelectItem value="F001">F001</SelectItem>
              <SelectItem value="F002">F002</SelectItem>
              <SelectItem value="F003">F003</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Seção Aba Calc e Botão */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-green-200 px-4 py-2 rounded">
            <span className="text-gray-800 font-semibold text-sm">Aba Calc {">>>"}</span>
            <div className="text-gray-800 font-bold text-lg">{totalVolumes.toLocaleString()}</div>
            <div className="text-gray-600 text-sm">{totalVolumes.toLocaleString()}</div>
          </div>
        </div>

        <Button
          onClick={generateTemplate}
          className="bg-black hover:bg-gray-800 text-white font-bold px-6 py-3 text-sm"
        >
          GERAR TEMPLATE
        </Button>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-300 rounded">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-300 bg-gray-100">
                <TableHead className="text-gray-800 font-semibold text-xs border-r border-gray-300 w-32">
                  <div className="flex items-center justify-between">
                    COD_LOJA_SAP
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs border-r border-gray-300 w-32">
                  <div className="flex items-center justify-between">
                    COD_PRODUTO
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center w-32">Quant. Volumes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, index) => (
                <TableRow key={item.id} className="border-gray-300 hover:bg-gray-50 transition-colors">
                  <TableCell className="text-gray-800 text-xs border-r border-gray-300 font-medium">
                    {item.codLojaSap}
                  </TableCell>
                  <TableCell className="text-gray-800 text-xs border-r border-gray-300">{item.codProduto}</TableCell>
                  <TableCell className="text-center text-xs">
                    <span className="text-gray-800 font-semibold">{item.quantVolumes}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredData.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-gray-400 text-lg">Nenhum item encontrado para faturamento</p>
        </motion.div>
      )}
    </motion.div>
  )
}
