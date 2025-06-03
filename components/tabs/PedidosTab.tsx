"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter } from "lucide-react"

const mockPedidos = [
  {
    id: 1,
    tipoSepar: "SECO",
    calibre: "",
    codigo: "136210",
    descricao: "TOMATE CEREJA RAMA KG",
    ABR: 0,
    A5: 0,
    ABE: 0,
    ADA: 0,
    ATA: 0,
    ATER: 0,
    AVA: 0,
    BAR: 0,
    BLU: 0,
    BOT: 0,
    BZOS: 0,
    C648: 0,
  },
  {
    id: 2,
    tipoSepar: "SECO",
    calibre: "",
    codigo: "165550",
    descricao: "TOMATE/NHOS CONFEITE 250G",
    ABR: 0,
    A5: 0,
    ABE: 0,
    ADA: 0,
    ATA: 0,
    ATER: 0,
    AVA: 0,
    BAR: 0,
    BLU: 0,
    BOT: 0,
    BZOS: 0,
    C648: 0,
  },
  {
    id: 3,
    tipoSepar: "SECO",
    calibre: "",
    codigo: "155631",
    descricao: "UVA MOSCATO BDJ 500G",
    ABR: 0,
    A5: 0,
    ABE: 0,
    ADA: 2,
    ATA: 2,
    ATER: 8,
    AVA: 2,
    BAR: 3,
    BLU: 0,
    BOT: 2,
    BZOS: 0,
    C648: 0,
  },
  {
    id: 4,
    tipoSepar: "SECO",
    calibre: "",
    codigo: "154439",
    descricao: "UVA MOSCATO KG",
    ABR: 0,
    A5: 0,
    ABE: 0,
    ADA: 0,
    ATA: 0,
    ATER: 0,
    AVA: 2,
    BAR: 2,
    BLU: 0,
    BOT: 0,
    BZOS: 0,
    C648: 0,
  },
  {
    id: 5,
    tipoSepar: "SECO",
    calibre: "",
    codigo: "152793",
    descricao: "UVA PRETA SEM SEMENTE HNT 500G UN",
    ABR: 0,
    A5: 0,
    ABE: 10,
    ADA: 8,
    ATA: 4,
    ATER: 6,
    AVA: 10,
    BAR: 0,
    BLU: 2,
    BOT: 4,
    BZOS: 2,
    C648: 0,
  },
  {
    id: 6,
    tipoSepar: "SECO",
    calibre: "",
    codigo: "100346",
    descricao: "UVA RED GLOBE KG",
    ABR: 0,
    A5: 0,
    ABE: 0,
    ADA: 1,
    ATA: 0,
    ATER: 0,
    AVA: 0,
    BAR: 1,
    BLU: 0,
    BOT: 0,
    BZOS: 0,
    C648: 0,
  },
  {
    id: 7,
    tipoSepar: "SECO",
    calibre: "",
    codigo: "100268",
    descricao: "UVA ROSADA BANDEJA UN",
    ABR: 1,
    A5: 0,
    ABE: 1,
    ADA: 1,
    ATA: 0,
    ATER: 1,
    AVA: 1,
    BAR: 1,
    BLU: 1,
    BOT: 1,
    BZOS: 0,
    C648: 0,
  },
]

const lojas = ["ABR", "A5", "ABE", "ADA", "ATA", "ATER", "AVA", "BAR", "BLU", "BOT", "BZOS", "C648"]

export default function PedidosTab() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState("Todos")
  const [filteredPedidos, setFilteredPedidos] = useState(mockPedidos)

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    applyFilters(term, filtroTipo)
  }

  const handleTipoFilter = (tipo: string) => {
    setFiltroTipo(tipo)
    applyFilters(searchTerm, tipo)
  }

  const applyFilters = (search: string, tipo: string) => {
    let filtered = mockPedidos

    if (search) {
      filtered = filtered.filter(
        (pedido) => pedido.descricao.toLowerCase().includes(search.toLowerCase()) || pedido.codigo.includes(search),
      )
    }

    if (tipo !== "Todos") {
      filtered = filtered.filter((pedido) => pedido.tipoSepar === tipo)
    }

    setFilteredPedidos(filtered)
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

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
          <h2 className="text-2xl font-bold apple-font text-white">Pedidos do Dia</h2>
          <p className="text-gray-400 capitalize">{today}</p>
        </div>

        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400 h-10"
            />
          </div>

          <Select value={filtroTipo} onValueChange={handleTipoFilter}>
            <SelectTrigger className="w-32 bg-gray-800/50 border-gray-700 text-white h-10">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="FRIO">FRIO</SelectItem>
              <SelectItem value="SECO">SECO</SelectItem>
              <SelectItem value="ORGÂNICO">ORGÂNICO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 bg-gray-800/50">
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-20">
                    TIPO DE SEPAR.
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-20">
                    CALIBRE
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 w-24">
                    Código
                  </TableHead>
                  <TableHead className="text-gray-300 font-semibold text-xs border-r border-gray-700 min-w-80">
                    Descrição
                  </TableHead>
                  {lojas.map((loja) => (
                    <TableHead
                      key={loja}
                      className="text-gray-300 font-semibold text-xs text-center border-r border-gray-700 w-12"
                    >
                      {loja}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.map((pedido, index) => (
                  <TableRow key={pedido.id} className="border-gray-700 hover:bg-gray-800/30 transition-colors">
                    <TableCell className="text-white text-xs border-r border-gray-700 font-medium">
                      {pedido.tipoSepar}
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs border-r border-gray-700">{pedido.calibre}</TableCell>
                    <TableCell className="text-blue-400 text-xs border-r border-gray-700 font-mono">
                      {pedido.codigo}
                    </TableCell>
                    <TableCell className="text-white text-xs border-r border-gray-700">{pedido.descricao}</TableCell>
                    {lojas.map((loja) => (
                      <TableCell key={loja} className="text-center text-xs border-r border-gray-700">
                        <span
                          className={`${pedido[loja as keyof typeof pedido] > 0 ? "text-green-400 font-semibold" : "text-gray-500"}`}
                        >
                          {pedido[loja as keyof typeof pedido] || ""}
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

      {filteredPedidos.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
          <p className="text-gray-400 text-lg">Nenhum pedido encontrado</p>
        </motion.div>
      )}
    </motion.div>
  )
}
