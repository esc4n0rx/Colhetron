"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Filter, ChevronDown } from "lucide-react"

const mockPreSeparacao = [
  {
    id: 1,
    tipoSepar: "SECO",
    material: "ABACATE KG",
    zona1: 57,
    zona2: 50,
    totalGeral: 107,
  },
  {
    id: 2,
    tipoSepar: "SECO",
    material: "ABACAXI UND",
    zona1: 74,
    zona2: 73,
    totalGeral: 147,
  },
  {
    id: 3,
    tipoSepar: "SECO",
    material: "ABOBORA JAPONESA KG",
    zona1: 17,
    zona2: 17,
    totalGeral: 34,
  },
  {
    id: 4,
    tipoSepar: "SECO",
    material: "ABOBORA MORANGA KG",
    zona1: 0,
    zona2: 1,
    totalGeral: 1,
  },
  {
    id: 5,
    tipoSepar: "SECO",
    material: "ABOBORA SECA KG",
    zona1: 1,
    zona2: 1,
    totalGeral: 2,
  },
  {
    id: 6,
    tipoSepar: "SECO",
    material: "ABOBRINHA ITALIANA KG",
    zona1: 30,
    zona2: 17,
    totalGeral: 47,
  },
  {
    id: 7,
    tipoSepar: "SECO",
    material: "ACAFRAO DA TERRA KG",
    zona1: 1,
    zona2: 1,
    totalGeral: 2,
  },
  {
    id: 8,
    tipoSepar: "SECO",
    material: "ALHO PORO UN",
    zona1: 33,
    zona2: 35,
    totalGeral: 68,
  },
  {
    id: 9,
    tipoSepar: "SECO",
    material: "AMEIXA IMPORTADA KG",
    zona1: 17,
    zona2: 18,
    totalGeral: 35,
  },
  {
    id: 10,
    tipoSepar: "SECO",
    material: "AMEIXA NACIONAL 500G",
    zona1: 4,
    zona2: 6,
    totalGeral: 10,
  },
]

export default function PreSeparacaoTab() {
  const [filtroTipo, setFiltroTipo] = useState("SECO")

  const dadosFiltrados =
    filtroTipo === "Todos" ? mockPreSeparacao : mockPreSeparacao.filter((item) => item.tipoSepar === filtroTipo)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Filtro TIPO SEPARAÇÃO */}
      <Card className="bg-gray-100 border-gray-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-700 font-medium text-sm">TIPO SEPARAÇÃO</span>
            <div className="flex gap-1">
              <Filter className="w-4 h-4 text-gray-500" />
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filtroTipo === "FRIO" ? "default" : "outline"}
              onClick={() => setFiltroTipo("FRIO")}
              className={`text-xs px-4 py-1 ${
                filtroTipo === "FRIO"
                  ? "bg-gray-600 text-white border-gray-600"
                  : "bg-gray-200 text-gray-700 border-gray-400 hover:bg-gray-300"
              }`}
            >
              FRIO
            </Button>
            <Button
              size="sm"
              variant={filtroTipo === "SECO" ? "default" : "outline"}
              onClick={() => setFiltroTipo("SECO")}
              className={`text-xs px-4 py-1 ${
                filtroTipo === "SECO"
                  ? "bg-gray-600 text-white border-gray-600"
                  : "bg-gray-200 text-gray-700 border-gray-400 hover:bg-gray-300"
              }`}
            >
              SECO
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <div className="bg-white border border-gray-300 rounded">
        <div className="bg-gray-200 px-4 py-2 border-b border-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-gray-700 font-medium text-sm">Quant. Volumes</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium text-sm">ZONA SEPARAÇÃO</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-300 bg-gray-100">
                <TableHead className="text-gray-700 font-semibold text-xs border-r border-gray-300 w-20 bg-gray-200">
                  PO SEPARA
                </TableHead>
                <TableHead className="text-gray-700 font-semibold text-xs border-r border-gray-300 min-w-60 bg-gray-200">
                  MATERIAL SEPARAÇÃO
                </TableHead>
                <TableHead className="text-gray-700 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-blue-100">
                  ZONA 1
                </TableHead>
                <TableHead className="text-gray-700 font-semibold text-xs text-center border-r border-gray-300 w-24 bg-blue-100">
                  ZONA 2
                </TableHead>
                <TableHead className="text-gray-700 font-semibold text-xs text-center w-24 bg-gray-200">
                  Total Geral
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dadosFiltrados.map((item, index) => (
                <TableRow key={item.id} className="border-gray-300 hover:bg-gray-50 transition-colors">
                  <TableCell className="text-gray-800 text-xs border-r border-gray-300 font-medium bg-gray-50">
                    {item.tipoSepar}
                  </TableCell>
                  <TableCell className="text-gray-800 text-xs border-r border-gray-300 bg-white">
                    {item.material}
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-blue-50">
                    <span className="text-gray-800 font-semibold">{item.zona1}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs border-r border-gray-300 bg-blue-50">
                    <span className="text-gray-800 font-semibold">{item.zona2}</span>
                  </TableCell>
                  <TableCell className="text-center text-xs bg-gray-50">
                    <span className="text-gray-800 font-bold">{item.totalGeral}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </motion.div>
  )
}
