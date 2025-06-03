"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Filter } from "lucide-react"

const mockSeparacao = [
  {
    id: 1,
    material: "ABACATE KG",
    BLU: 1,
    V157: 1,
    MBN312: 0,
    REC: 2,
    GAR: 2,
    M1083: 0,
    A5: 0,
    C648: 1,
    BLU2: 2,
    FRE: 12,
    ABE: 0,
    REC2: 0,
    ABE2: 1,
    FLA: 2,
    ABR: 0,
    BAR: 3,
  },
  {
    id: 2,
    material: "ABACAXI UND",
    BLU: 0,
    V157: 0,
    MBN312: 0,
    REC: 0,
    GAR: 0,
    M1083: 0,
    A5: 0,
    C648: 0,
    BLU2: 0,
    FRE: 0,
    ABE: 0,
    REC2: 0,
    ABE2: 0,
    FLA: 0,
    ABR: 0,
    BAR: 0,
  },
  {
    id: 3,
    material: "ABOBORA JAPONESA KG",
    BLU: 0,
    V157: 0,
    MBN312: 0,
    REC: 0,
    GAR: 0,
    M1083: 0,
    A5: 0,
    C648: 0,
    BLU2: 1,
    FRE: 0,
    ABE: 0,
    REC2: 0,
    ABE2: 1,
    FLA: 0,
    ABR: 0,
    BAR: 2,
  },
  {
    id: 4,
    material: "ABOBORA MORANGA KG",
    BLU: 0,
    V157: 0,
    MBN312: 0,
    REC: 0,
    GAR: 0,
    M1083: 0,
    A5: 0,
    C648: 0,
    BLU2: 0,
    FRE: 0,
    ABE: 0,
    REC2: 0,
    ABE2: 0,
    FLA: 0,
    ABR: 0,
    BAR: 0,
  },
  {
    id: 5,
    material: "ABOBORA SECA KG",
    BLU: 0,
    V157: 0,
    MBN312: 0,
    REC: 0,
    GAR: 0,
    M1083: 0,
    A5: 0,
    C648: 0,
    BLU2: 0,
    FRE: 0,
    ABE: 0,
    REC2: 0,
    ABE2: 0,
    FLA: 0,
    ABR: 0,
    BAR: 0,
  },
  {
    id: 6,
    material: "ABOBRINHA ITALIANA KG",
    BLU: 0,
    V157: 0,
    MBN312: 0,
    REC: 0,
    GAR: 0,
    M1083: 0,
    A5: 0,
    C648: 1,
    BLU2: 3,
    FRE: 0,
    ABE: 0,
    REC2: 1,
    ABE2: 2,
    FLA: 0,
    ABR: 0,
    BAR: 4,
  },
  {
    id: 7,
    material: "ACAFRAO DA TERRA KG",
    BLU: 0,
    V157: 0,
    MBN312: 0,
    REC: 0,
    GAR: 0,
    M1083: 0,
    A5: 0,
    C648: 0,
    BLU2: 0,
    FRE: 0,
    ABE: 0,
    REC2: 0,
    ABE2: 0,
    FLA: 0,
    ABR: 0,
    BAR: 0,
  },
  {
    id: 8,
    material: "ALHO PORO UN",
    BLU: 0,
    V157: 0,
    MBN312: 0,
    REC: 0,
    GAR: 0,
    M1083: 0,
    A5: 0,
    C648: 0,
    BLU2: 1,
    FRE: 0,
    ABE: 0,
    REC2: 0,
    ABE2: 1,
    FLA: 0,
    ABR: 0,
    BAR: 1,
  },
]

const lojas = [
  "BLU",
  "V157",
  "MBN312",
  "REC",
  "GAR",
  "M1083",
  "A5",
  "C648",
  "BLU",
  "FRE",
  "ABE",
  "REC",
  "ABE",
  "FLA",
  "ABR",
  "BAR",
]
const lojasNumeros = ["-1", "1", "-2", "2", "-3", "3", "-4", "4", "-5", "5", "-6", "6", "-7", "7", "-8", "8"]

export default function SeparacaoTab() {
  const [filtroTipo, setFiltroTipo] = useState("FRIO")
  const [filtroZona, setFiltroZona] = useState("ZONA 1")
  const [filtroSubzona, setFiltroSubzona] = useState("N/A")

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold apple-font text-white">Separação por Zona</h2>
          <p className="text-gray-400">Quantidades segmentadas por zonas e subzonas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900/50 border-gray-800 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">TIPO SEPARAÇÃO</span>
              <div className="flex gap-1">
                <Filter className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filtroTipo === "FRIO" ? "default" : "outline"}
                onClick={() => setFiltroTipo("FRIO")}
                className={`text-xs ${filtroTipo === "FRIO" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                FRIO
              </Button>
              <Button
                size="sm"
                variant={filtroTipo === "SECO" ? "default" : "outline"}
                onClick={() => setFiltroTipo("SECO")}
                className={`text-xs ${filtroTipo === "SECO" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                SECO
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">ZONA SEPARAÇÃO</span>
              <div className="flex gap-1">
                <Filter className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filtroZona === "ZONA 1" ? "default" : "outline"}
                onClick={() => setFiltroZona("ZONA 1")}
                className={`text-xs ${filtroZona === "ZONA 1" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                ZONA 1
              </Button>
              <Button
                size="sm"
                variant={filtroZona === "ZONA 2" ? "default" : "outline"}
                onClick={() => setFiltroZona("ZONA 2")}
                className={`text-xs ${filtroZona === "ZONA 2" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
              >
                ZONA 2
              </Button>
            </div>
          </div>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm font-medium">SUBZONA SEPARAÇÃO</span>
              <div className="flex gap-1">
                <Filter className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {["N/A", "SUBZONA 1.1", "SUBZONA 1.2", "SUBZONA 1.3", "SUBZONA 2.1", "SUBZONA 2.2"].map((sub) => (
                <Button
                  key={sub}
                  size="sm"
                  variant={filtroSubzona === sub ? "default" : "outline"}
                  onClick={() => setFiltroSubzona(sub)}
                  className={`text-xs ${filtroSubzona === sub ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  {sub}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 bg-gray-800/50">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-8">
                    Quant. Volumes
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-60">
                    MATERIAL SEPARAÇÃO
                  </TableHead>
                  {lojasNumeros.map((num, index) => (
                    <TableHead
                      key={index}
                      className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-12"
                    >
                      {num}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow className="border-gray-700 bg-gray-800/30">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700"></TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700"></TableHead>
                  {lojas.map((loja, index) => (
                    <TableHead
                      key={index}
                      className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-12"
                    >
                      {loja}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockSeparacao.map((item, index) => (
                  <TableRow key={item.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                    <TableCell className="text-white text-xs border-r border-gray-700 font-medium"></TableCell>
                    <TableCell className="text-white text-xs border-r border-gray-700">{item.material}</TableCell>
                    {lojas.map((loja, lojaIndex) => (
                      <TableCell key={lojaIndex} className="text-center text-xs border-r border-gray-700">
                        <span
                          className={`${item[loja as keyof typeof item] > 0 ? "text-green-400 font-semibold" : "text-gray-500"}`}
                        >
                          {item[loja as keyof typeof item] || ""}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
