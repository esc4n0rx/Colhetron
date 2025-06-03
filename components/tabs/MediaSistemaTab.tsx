"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search } from "lucide-react"

const mockMediaSistema = [
  {
    id: 1,
    codigo: "144222",
    material: "ASPARGO UND",
    quantidadeKg: 155.0,
    quantidadeCaixas: 155.0,
    mediaSistema: 15,
    estoqueAtual: 145,
    diferencaCaixas: 10,
    mediaReal: 1.068965517,
    status: "OK",
  },
  {
    id: 2,
    codigo: "100081",
    material: "BETERRABA KG",
    quantidadeKg: 1120.0,
    quantidadeCaixas: 56.0,
    mediaSistema: 20,
    estoqueAtual: 46,
    diferencaCaixas: 10,
    mediaReal: 24.3478269,
    status: "OK",
  },
  {
    id: 3,
    codigo: "151570",
    material: "CAQUI RAMA FORTE EXTRA KG",
    quantidadeKg: 3745.0,
    quantidadeCaixas: 535.0,
    mediaSistema: 7,
    estoqueAtual: 529,
    diferencaCaixas: 6,
    mediaReal: 7.079395085,
    status: "OK",
  },
  {
    id: 4,
    codigo: "100379",
    material: "CENOURA EXTRA KG",
    quantidadeKg: 4120.0,
    quantidadeCaixas: 206.0,
    mediaSistema: 20,
    estoqueAtual: 171,
    diferencaCaixas: 35,
    mediaReal: 24.09356725,
    status: "OK",
  },
  {
    id: 5,
    codigo: "100234",
    material: "BATATA INGLESA KG",
    quantidadeKg: 2850.0,
    quantidadeCaixas: 142.5,
    mediaSistema: 18,
    estoqueAtual: 138,
    diferencaCaixas: 4.5,
    mediaReal: 20.63492063,
    status: "OK",
  },
  {
    id: 6,
    codigo: "100567",
    material: "TOMATE SALADA KG",
    quantidadeKg: 1890.0,
    quantidadeCaixas: 94.5,
    mediaSistema: 22,
    estoqueAtual: 89,
    diferencaCaixas: 5.5,
    mediaReal: 21.23595506,
    status: "OK",
  },
]

export default function MediaSistemaTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredData, setFilteredData] = useState(mockMediaSistema)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    const filtered = mockMediaSistema.filter(
      (item) => item.material.toLowerCase().includes(term.toLowerCase()) || item.codigo.includes(term),
    )
    setFilteredData(filtered)
  }

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
          <h2 className="text-2xl font-bold apple-font text-white">Análise de Médias</h2>
          <p className="text-gray-400">Análise comparativa entre médias e estoque atual</p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por material ou código..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-gray-300 rounded">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-300">
                <TableHead
                  colSpan={9}
                  className="text-center text-gray-800 font-bold text-sm bg-yellow-200 border-r border-gray-300 py-3"
                >
                  Análise de Médias
                </TableHead>
              </TableRow>
              <TableRow className="border-gray-300 bg-gray-100">
                <TableHead className="text-gray-800 font-semibold text-xs border-r border-gray-300 w-20 bg-white">
                  CÓDIGO
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs border-r border-gray-300 min-w-60 bg-white">
                  MATERIAL
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-white">
                  Quantidade
                  <br />
                  KG
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-white">
                  Quantidade
                  <br />
                  Caixas
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-yellow-200">
                  Média Sistema
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-yellow-200">
                  Estoque Atual
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-yellow-200">
                  Diferença
                  <br />
                  em Caixas
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-yellow-200">
                  Média Real
                </TableHead>
                <TableHead className="text-gray-800 font-semibold text-xs text-center w-20 bg-yellow-200">
                  STATUS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item, index) => (
                <TableRow key={item.id} className="border-gray-300 hover:bg-gray-50 transition-colors">
                  <TableCell className="text-gray-800 text-xs border-r border-gray-300 font-medium bg-white">
                    {item.codigo}
                  </TableCell>
                  <TableCell className="text-gray-800 text-xs border-r border-gray-300 bg-white">
                    {item.material}
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-white">
                    <span className="text-gray-800">{item.quantidadeKg.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-white">
                    <span className="text-gray-800">{item.quantidadeCaixas.toFixed(2)}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-100">
                    <span className="text-gray-800 font-semibold">{item.mediaSistema}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-100">
                    <span className="text-gray-800 font-semibold">{item.estoqueAtual}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-100">
                    <span className="text-gray-800 font-semibold">{item.diferencaCaixas}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-yellow-100">
                    <span className="text-gray-800 font-semibold">{item.mediaReal.toFixed(8)}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs bg-yellow-100">
                    <span className="text-gray-800 font-bold">{item.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredData.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-gray-400 text-lg">Nenhum material encontrado</p>
        </motion.div>
      )}
    </motion.div>
  )
}
