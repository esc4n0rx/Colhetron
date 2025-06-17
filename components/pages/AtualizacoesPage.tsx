// components/pages/AtualizacoesPage.tsx
"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft, 
  GitCommit, 
  Tag, 
  Calendar, 
  User, 
  Download, 
  ExternalLink,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  Loader2,
  Bug,
  Sparkles,
  Wrench,
  Star
} from "lucide-react"

interface AtualizacoesPageProps {
  onBack: () => void
}

interface GitRelease {
  id: number
  tag_name: string
  name: string
  body: string
  published_at: string
  author: {
    login: string
    avatar_url: string
  }
  prerelease: boolean
  draft: boolean
  html_url: string
  assets: Array<{
    name: string
    download_count: number
    browser_download_url: string
  }>
}

interface SystemInfo {
  currentVersion: string
  lastUpdate: string
  status: 'updated' | 'outdated' | 'checking'
  uptime: string
  environment: string
}

interface ParsedContent {
  type: 'heading' | 'subheading' | 'list' | 'text' | 'strong'
  content: string
  level?: number
  items?: string[]
}

export default function AtualizacoesPage({ onBack }: AtualizacoesPageProps) {
  const [releases, setReleases] = useState<GitRelease[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    currentVersion: "2.1.0",
    lastUpdate: new Date().toISOString(),
    status: "updated",
    uptime: "0d 0h 0m",
    environment: "production"
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReleases()
    updateSystemInfo()
    
    const interval = setInterval(updateSystemInfo, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchReleases = async () => {
    try {
      setError(null)
      
      const response = await fetch('/api/git/releases')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar releases')
      }
      
      const data = await response.json()
      setReleases(data.releases || [])
      
      const latestRelease = data.releases?.[0]
      if (latestRelease && latestRelease.tag_name !== systemInfo.currentVersion) {
        setSystemInfo(prev => ({ ...prev, status: 'outdated' }))
      }
      
    } catch (error) {
      console.error('Erro ao buscar releases:', error)
      setError('Não foi possível carregar as atualizações')
      
      // Usar dados mock como fallback
      setReleases([
        {
          id: 1,
          tag_name: "v2.1.0",
          name: "Nova Interface e Melhorias de Performance",
          body: `## ✨ Novas Funcionalidades

### 🎨 Interface Redesenhada
- Nova página "Sobre" com métricas em tempo real
- Design mais moderno e profissional
- Animações aprimoradas com Framer Motion
- Gradientes e efeitos visuais otimizados

### 📊 Dashboard Aprimorado
- Estatísticas do sistema em tempo real
- Indicadores de performance
- Métricas de uso e uptime
- Visualização de dados melhorada

## 🐛 Correções

### 🔧 Renderização de Markdown
- **CORRIGIDO**: Formatação incorreta de release notes
- **MELHORADO**: Parser de markdown mais robusto
- **ADICIONADO**: Suporte completo a listas e formatação

### 🚀 Performance
- Otimização no carregamento de componentes
- Redução do tempo de resposta em 30%
- Cache melhorado para dados do sistema

## 🔧 Melhorias Técnicas

- Atualização do TypeScript para versão mais recente
- Melhoria na tipagem de componentes
- Otimização de queries do banco de dados
- Implementação de lazy loading`,
          published_at: new Date().toISOString(),
          author: {
            login: "paulo-dev",
            avatar_url: "https://github.com/paulo-dev.png"
          },
          prerelease: false,
          draft: false,
          html_url: "https://github.com/seu-repo/releases/tag/v2.1.0",
          assets: []
        },
        {
          id: 2,
          tag_name: "v2.0.0",
          name: "Análise de Médias e Sistema de Cadastro",
          body: `## 🎉 Release Principal v2.0

### ✨ Funcionalidades Principais
- **Módulo de Análise de Médias**: Comparação entre médias do sistema e estoque
- **Sistema de Cadastro**: Gerenciamento completo de produtos e dados
- **Exportação Avançada**: Relatórios em Excel com formatação
- **Filtros Inteligentes**: Busca e filtragem aprimoradas

### 🛡️ Segurança
- Validação aprimorada com Zod
- Sanitização de dados de entrada
- Proteção contra ataques XSS
- Logs de auditoria implementados

### 📱 Responsividade
- Design totalmente responsivo
- Otimização para dispositivos móveis
- Interface adaptativa para tablets
- Experiência consistente em todas as telas`,
          published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          author: {
            login: "paulo-dev",
            avatar_url: "https://github.com/paulo-dev.png"
          },
          prerelease: false,
          draft: false,
          html_url: "https://github.com/seu-repo/releases/tag/v2.0.0",
          assets: []
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const updateSystemInfo = () => {
    const startTime = new Date('2025-06-14T08:00:00')
    const now = new Date()
    const diff = now.getTime() - startTime.getTime()
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    setSystemInfo(prev => ({
      ...prev,
      uptime: `${days}d ${hours}h ${minutes}m`,
      lastUpdate: new Date().toISOString()
    }))
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchReleases()
    setIsRefreshing(false)
  }

  const filteredReleases = releases.filter(release =>
    release.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    release.tag_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    release.body.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'updated':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          text: 'Sistema Atualizado',
          color: 'bg-green-500/20 text-green-400 border-green-500/30'
        }
      case 'outdated':
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-400" />,
          text: 'Atualização Disponível',
          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        }
      case 'checking':
        return {
          icon: <Clock className="w-5 h-5 text-blue-400" />,
          text: 'Verificando...',
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
      default:
        return {
          icon: <Activity className="w-5 h-5 text-gray-400" />,
          text: 'Status Desconhecido',
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
        }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Parser de markdown aprimorado
  const parseMarkdown = (markdown: string): ParsedContent[] => {
    const lines = markdown.split('\n').filter(line => line.trim() !== '')
    const parsed: ParsedContent[] = []
    let currentList: string[] = []

    const flushList = () => {
      if (currentList.length > 0) {
        parsed.push({ type: 'list', content: '', items: [...currentList] })
        currentList = []
      }
    }

    lines.forEach(line => {
      const trimmedLine = line.trim()
      
      // Headings principais (##)
      if (trimmedLine.startsWith('## ')) {
        flushList()
        const content = trimmedLine.replace(/^## /, '').trim()
        parsed.push({ type: 'heading', content, level: 2 })
      }
      // Sub-headings (###)
     else if (trimmedLine.startsWith('### ')) {
       flushList()
       const content = trimmedLine.replace(/^### /, '').trim()
       parsed.push({ type: 'subheading', content, level: 3 })
     }
     // Lista items
     else if (trimmedLine.startsWith('- ')) {
       const content = trimmedLine.replace(/^- /, '').trim()
       currentList.push(content)
     }
     // Texto com formatação em negrito
     else if (trimmedLine.includes('**')) {
       flushList()
       parsed.push({ type: 'strong', content: trimmedLine })
     }
     // Texto normal
     else if (trimmedLine.length > 0) {
       flushList()
       parsed.push({ type: 'text', content: trimmedLine })
     }
   })

   flushList()
   return parsed
 }

 const renderParsedContent = (content: ParsedContent, index: number) => {
   const key = `${content.type}-${index}`

   switch (content.type) {
     case 'heading':
       return (
         <motion.div
           key={key}
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: index * 0.05 }}
           className="flex items-center space-x-2 mt-6 mb-3"
         >
           {content.content.includes('✨') && <Sparkles className="w-5 h-5 text-yellow-400" />}
           {content.content.includes('🐛') && <Bug className="w-5 h-5 text-red-400" />}
           {content.content.includes('🔧') && <Wrench className="w-5 h-5 text-blue-400" />}
           <h3 className="text-lg font-bold text-white">{content.content}</h3>
         </motion.div>
       )
     
     case 'subheading':
       return (
         <motion.h4
           key={key}
           initial={{ opacity: 0, x: -15 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ delay: index * 0.05 }}
           className="text-md font-semibold text-gray-200 mt-4 mb-2 flex items-center space-x-2"
         >
           <div className="w-2 h-2 bg-blue-400 rounded-full" />
           <span>{content.content}</span>
         </motion.h4>
       )
     
     case 'list':
       return (
         <motion.ul
           key={key}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: index * 0.05 }}
           className="space-y-2 ml-4 mb-4"
         >
           {content.items?.map((item, itemIndex) => (
             <motion.li
               key={itemIndex}
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: (index * 0.05) + (itemIndex * 0.02) }}
               className="flex items-start space-x-2 text-gray-300"
             >
               <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
               <span dangerouslySetInnerHTML={{ 
                 __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') 
               }} />
             </motion.li>
           ))}
         </motion.ul>
       )
     
     case 'strong':
       return (
         <motion.p
           key={key}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: index * 0.05 }}
           className="text-gray-300 mb-2"
           dangerouslySetInnerHTML={{ 
             __html: content.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') 
           }}
         />
       )
     
     case 'text':
       return (
         <motion.p
           key={key}
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: index * 0.05 }}
           className="text-gray-300 mb-2 leading-relaxed"
         >
           {content.content}
         </motion.p>
       )
     
     default:
       return null
   }
 }

 const statusInfo = getStatusInfo(systemInfo.status)

 if (isLoading) {
   return (
     <div className="flex items-center justify-center min-h-[400px]">
       <div className="text-center">
         <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
         <p className="text-gray-400">Carregando atualizações...</p>
       </div>
     </div>
   )
 }

 return (
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ duration: 0.5 }}
     className="space-y-6"
   >
     {/* Header com Status */}
     <div className="flex items-center justify-between">
       <div className="flex items-center space-x-4">
         <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-400 hover:text-white">
           <ArrowLeft className="w-5 h-5" />
         </Button>
         <div>
           <h1 className="text-2xl font-bold apple-font text-white">Atualizações do Sistema</h1>
           <p className="text-gray-400">Acompanhe as últimas versões e melhorias</p>
         </div>
       </div>
       
       <div className="flex items-center space-x-3">
         <Badge className={statusInfo.color}>
           {statusInfo.icon}
           <span className="ml-2">{statusInfo.text}</span>
         </Badge>
         <Button
           onClick={handleRefresh}
           disabled={isRefreshing}
           variant="outline"
           size="sm"
           className="border-gray-600 text-gray-300 hover:bg-gray-800"
         >
           <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
           Atualizar
         </Button>
       </div>
     </div>

     {/* Informações do Sistema */}
     <Card className="bg-gray-900/50 border-gray-800">
       <CardHeader>
         <CardTitle className="text-white flex items-center">
           <Activity className="w-5 h-5 mr-2 text-green-400" />
           Status do Sistema
         </CardTitle>
       </CardHeader>
       <CardContent>
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
           <div>
             <p className="text-gray-400">Versão Atual</p>
             <p className="text-white font-semibold">{systemInfo.currentVersion}</p>
           </div>
           <div>
             <p className="text-gray-400">Ambiente</p>
             <p className="text-white font-semibold capitalize">{systemInfo.environment}</p>
           </div>
           <div>
             <p className="text-gray-400">Uptime</p>
             <p className="text-white font-semibold">{systemInfo.uptime}</p>
           </div>
           <div>
             <p className="text-gray-400">Última Verificação</p>
             <p className="text-white font-semibold">
               {formatDate(systemInfo.lastUpdate)}
             </p>
           </div>
         </div>
       </CardContent>
     </Card>

     {/* Busca */}
     <div className="relative">
       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
       <Input
         placeholder="Buscar por versão, funcionalidade ou correção..."
         value={searchTerm}
         onChange={(e) => setSearchTerm(e.target.value)}
         className="pl-10 bg-gray-900/50 border-gray-800 text-white placeholder-gray-400"
       />
     </div>

     {/* Error State */}
     {error && (
       <Card className="bg-red-500/10 border-red-500/30">
         <CardContent className="p-4">
           <div className="flex items-center space-x-2 text-red-400">
             <AlertCircle className="w-5 h-5" />
             <span>{error}</span>
           </div>
         </CardContent>
       </Card>
     )}

     {/* Lista de Releases */}
     <div className="space-y-6">
       <AnimatePresence>
         {filteredReleases.map((release, index) => (
           <motion.div
             key={release.id}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -20 }}
             transition={{ duration: 0.4, delay: index * 0.1 }}
           >
             <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
               <CardHeader>
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <div className="flex items-center space-x-2">
                       <Tag className="w-4 h-4 text-blue-400" />
                       <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                         {release.tag_name}
                       </Badge>
                       {release.prerelease && (
                         <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                           Pre-release
                         </Badge>
                       )}
                       {index === 0 && (
                         <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                           <Star className="w-3 h-3 mr-1" />
                           Mais Recente
                         </Badge>
                       )}
                     </div>
                   </div>
                   
                   <div className="flex items-center space-x-2">
                     <Button
                       size="sm"
                       variant="outline"
                       className="border-gray-600 text-gray-300 hover:bg-gray-800"
                       onClick={() => window.open(release.html_url, '_blank')}
                     >
                       <ExternalLink className="w-4 h-4 mr-2" />
                       Ver no Git
                     </Button>
                   </div>
                 </div>
                 
                 <div>
                   <h2 className="text-xl font-bold text-white">{release.name}</h2>
                   <div className="flex items-center space-x-4 text-sm text-gray-400 mt-2">
                     <div className="flex items-center space-x-1">
                       <User className="w-4 h-4" />
                       <span>{release.author.login}</span>
                     </div>
                     <div className="flex items-center space-x-1">
                       <Calendar className="w-4 h-4" />
                       <span>{formatDate(release.published_at)}</span>
                     </div>
                     {release.assets.length > 0 && (
                       <div className="flex items-center space-x-1">
                         <Download className="w-4 h-4" />
                         <span>{release.assets.length} arquivo{release.assets.length !== 1 ? 's' : ''}</span>
                       </div>
                     )}
                   </div>
                 </div>
               </CardHeader>
               
               <CardContent className="prose prose-invert max-w-none">
                 <div className="space-y-1">
                   {parseMarkdown(release.body).map((content, contentIndex) => 
                     renderParsedContent(content, contentIndex)
                   )}
                 </div>
               </CardContent>
             </Card>
           </motion.div>
         ))}
       </AnimatePresence>
     </div>

     {/* Empty State */}
     {filteredReleases.length === 0 && !isLoading && !error && (
       <Card className="bg-gray-900/50 border-gray-800">
         <CardContent className="p-8 text-center">
           <GitCommit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
           <h3 className="text-lg font-semibold text-white mb-2">Nenhuma atualização encontrada</h3>
           <p className="text-gray-400">
             {searchTerm 
               ? 'Tente ajustar os termos de busca'
               : 'Não há releases disponíveis no momento'
             }
           </p>
         </CardContent>
       </Card>
     )}
   </motion.div>
 )
}