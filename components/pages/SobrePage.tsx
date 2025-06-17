// components/pages/SobrePage.tsx
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  Package, 
  Users, 
  Code, 
  Heart, 
  Github, 
  Mail, 
  Globe,
  Zap,
  Shield,
  Rocket,
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Monitor,
  Sparkles
} from "lucide-react"

interface SobrePageProps {
  onBack: () => void
}

interface SystemStats {
  uptime: string
  version: string
  lastUpdate: string
  totalSeparations: number
  totalItems: number
  activeUsers: number
  performance: number
}

export default function SobrePage({ onBack }: SobrePageProps) {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    uptime: "0d 0h 0m",
    version: "2.1.0",
    lastUpdate: new Date().toISOString(),
    totalSeparations: 0,
    totalItems: 0,
    activeUsers: 1,
    performance: 98
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSystemStats()
    updateUptime()
    
    // Atualizar uptime a cada minuto
    const interval = setInterval(updateUptime, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchSystemStats = async () => {
    try {
      // Buscar estatísticas reais do sistema
      const response = await fetch('/api/system/stats')
      if (response.ok) {
        const data = await response.json()
        setSystemStats(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateUptime = () => {
    const startTime = new Date('2025-06-14T08:00:00')
    const now = new Date()
    const diff = now.getTime() - startTime.getTime()
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    setSystemStats(prev => ({
      ...prev,
      uptime: `${days}d ${hours}h ${minutes}m`
    }))
  }

  const features = [
    {
      icon: <Package className="w-5 h-5" />,
      title: "Gestão Completa de Separações",
      description: "Sistema robusto para gerenciar todo o processo de separação de pedidos",
      color: "text-blue-400"
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Pré-separação Inteligente",
      description: "Organização automática por zonas para otimizar o processo",
      color: "text-yellow-400"
    },
    {
      icon: <Activity className="w-5 h-5" />,
      title: "Análise de Médias em Tempo Real",
      description: "Comparação entre médias do sistema e estoque atual",
      color: "text-green-400"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Segurança Avançada",
      description: "Autenticação JWT e proteção de dados sensíveis",
      color: "text-purple-400"
    },
    {
      icon: <Monitor className="w-5 h-5" />,
      title: "Interface Moderna",
      description: "Design responsivo com tema escuro otimizado",
      color: "text-cyan-400"
    },
    {
      icon: <Rocket className="w-5 h-5" />,
      title: "Performance Otimizada",
      description: "Carregamento rápido e experiência fluida",
      color: "text-orange-400"
    }
  ]

  const techStack = [
    { name: "Next.js 14", type: "Framework", color: "bg-black/50 text-white border-gray-600" },
    { name: "React 18", type: "Library", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { name: "TypeScript", type: "Language", color: "bg-blue-600/20 text-blue-300 border-blue-600/30" },
    { name: "Tailwind CSS", type: "Styling", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
    { name: "Framer Motion", type: "Animation", color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
    { name: "Supabase", type: "Database", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { name: "Zod", type: "Validation", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30" },
    { name: "Lucide Icons", type: "Icons", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" }
  ]

  const systemMetrics = [
    { icon: <Cpu className="w-5 h-5" />, label: "Performance", value: `${systemStats.performance}%`, color: "text-green-400" },
    { icon: <Server className="w-5 h-5" />, label: "Uptime", value: systemStats.uptime, color: "text-blue-400" },
    { icon: <Database className="w-5 h-5" />, label: "Separações", value: systemStats.totalSeparations.toLocaleString(), color: "text-purple-400" },
    { icon: <HardDrive className="w-5 h-5" />, label: "Itens Processados", value: systemStats.totalItems.toLocaleString(), color: "text-yellow-400" }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8"
    >
      {/* Header com Gradiente */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-lg" />
        <Card className="relative bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center space-x-4">
                  <motion.div 
                    className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Package className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                      Sistema Colhetron
                    </h1>
                    <p className="text-gray-400">Separação Inteligente de Pedidos</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>v{systemStats.version}</span>
                </Badge>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Activity className="w-3 h-3 mr-1" />
                  Online
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas do Sistema */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {systemMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`${metric.color}`}>
                    {metric.icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">{metric.label}</p>
                    <p className={`text-lg font-semibold ${metric.color}`}>{metric.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Funcionalidades Principais */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gray-900/50 border-gray-800 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
                Funcionalidades Principais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`${feature.color} mt-1`}>
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{feature.title}</h4>
                    <p className="text-gray-400 text-sm">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stack Tecnológico */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gray-900/50 border-gray-800 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Code className="w-5 h-5 mr-2 text-blue-400" />
                Stack Tecnológico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {techStack.map((tech, index) => (
                  <motion.div
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="relative"
                  >
                    <Badge 
                      variant="outline" 
                      className={`${tech.color} w-full justify-center py-2 text-xs font-medium transition-all hover:shadow-lg`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{tech.name}</div>
                        <div className="text-xs opacity-75">{tech.type}</div>
                      </div>
                    </Badge>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Performance do Sistema</span>
                  <span className="text-sm font-semibold text-green-400">{systemStats.performance}%</span>
                </div>
                <Progress value={systemStats.performance} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Equipe e Contato */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-400" />
              Equipe de Desenvolvimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  👨‍💻
                </motion.div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Paulo Oliveira</h3>
                  <p className="text-gray-400">Desenvolvedor Full Stack</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                      Next.js
                    </Badge>
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                      TypeScript
                    </Badge>
                    <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      React
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </Button>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  <Mail className="w-4 h-4 mr-2" />
                  Contato
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer com informações adicionais */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-center py-6"
      >
        <div className="flex items-center justify-center space-x-2 text-gray-400">
          <Heart className="w-4 h-4 text-red-400" />
          <span className="text-sm">
            Desenvolvido com dedicação para otimizar processos de separação
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Última atualização: {new Date(systemStats.lastUpdate).toLocaleDateString('pt-BR')}
        </p>
      </motion.div>
    </motion.div>
  )
}