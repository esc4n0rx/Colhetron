"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Package, Users, Code, Heart, Github, Mail, Globe } from "lucide-react"

interface SobrePageProps {
  onBack: () => void
}

export default function SobrePage({ onBack }: SobrePageProps) {
  const features = [
    "Gestão completa de pedidos do flv",
    "Pré-separação inteligente",
    "Separação por zonas",
    "Análise de médias",
    "Faturamento automatizado",
    "Interface moderna e responsiva",
    "Tema escuro otimizado",
    "Relatórios em tempo real",
  ]

  const team = [
    { name: "Paulo Oliveira", role: "Desenvolvedor Full Stack", avatar: "👨‍💻" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold apple-font text-white">Sobre o Sistema</h1>
          <p className="text-gray-400">Conheça mais sobre nossa plataforma</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações do Sistema */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Sistema de Separação de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Versão 2.1.0</Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Estável</Badge>
            </div>

            <p className="text-gray-300 leading-relaxed">
              Uma solução moderna e completa para gerenciamento de separação de pedidos, desenvolvida com as mais
              recentes tecnologias web para proporcionar uma experiência fluida e eficiente.
            </p>

            <div className="space-y-2">
              <h4 className="text-white font-semibold">Tecnologias Utilizadas:</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600">
                  Next.js 14
                </Badge>
                <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600">
                  React 18
                </Badge>
                <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600">
                  TypeScript
                </Badge>
                <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600">
                  Tailwind CSS
                </Badge>
                <Badge variant="outline" className="bg-gray-800 text-gray-300 border-gray-600">
                  Framer Motion
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funcionalidades */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Code className="w-5 h-5 mr-2" />
              Principais Funcionalidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center space-x-2 text-gray-300"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Equipe */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Nossa Equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {team.map((member, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="text-2xl">{member.avatar}</div>
                  <div>
                    <p className="text-white font-semibold">{member.name}</p>
                    <p className="text-gray-400 text-sm">{member.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contato e Links */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white apple-font flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Contato e Suporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">Precisa de ajuda ou tem sugestões? Entre em contato conosco!</p>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                suporte@sistema.com
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub Repository
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
              >
                <Globe className="w-4 h-4 mr-2" />
                Documentação
              </Button>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-center text-gray-400 text-sm">
                © 2024 Sistema de Separação. Todos os direitos reservados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}
