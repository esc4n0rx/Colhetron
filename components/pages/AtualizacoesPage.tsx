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
  Loader2
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

export default function AtualizacoesPage({ onBack }: AtualizacoesPageProps) {
  const [releases, setReleases] = useState<GitRelease[]>([])
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    currentVersion: "1.0.0",
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
    
    // Atualizar uptime a cada minuto
    const interval = setInterval(updateSystemInfo, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchReleases = async () => {
    try {
      setError(null)
      
      // Substituir pela URL do seu repositório
      const response = await fetch('/api/git/releases')
      
      if (!response.ok) {
        throw new Error('Erro ao buscar releases')
      }
      
      const data = await response.json()
      setReleases(data.releases || [])
      
      // Atualizar status do sistema baseado na versão atual
      const latestRelease = data.releases?.[0]
      if (latestRelease && latestRelease.tag_name !== systemInfo.currentVersion) {
        setSystemInfo(prev => ({ ...prev, status: 'outdated' }))
      }
      
    } catch (error) {
      console.error('Erro ao buscar releases:', error)
      setError('Não foi possível carregar as atualizações')
      
      // Mock de dados para desenvolvimento
      const mockReleases: GitRelease[] = [
        {
          id: 1,
          tag_name: "v1.2.0",
          name: "Análise de Médias e Melhorias",
          body: `## ✨ Novas Funcionalidades
- Implementação completa do módulo de Análise de Médias
- Sistema de comparação entre médias do sistema e estoque atual
- Exportação de dados para Excel
- Interface aprimorada para visualização de dados

## 🐛 Correções
- Corrigido problema de cálculo automático das diferenças
- Melhorada performance na busca de produtos
- Ajustes na responsividade em dispositivos móveis

## 🔧 Melhorias
- Otimização das consultas ao banco de dados
- Melhoria na experiência do usuário
- Atualização das dependências de segurança`,
          published_at: "2025-06-14T10:00:00Z",
          author: {
            login: "paulo-dev",
            avatar_url: "https://github.com/paulo-dev.png"
          },
          prerelease: false,
          draft: false,
          html_url: "https://github.com/seu-repo/releases/tag/v1.2.0",
          assets: []
        },
        {
          id: 2,
          tag_name: "v1.1.0",
          name: "Sistema de Pré-separação",
          body: `## ✨ Novas Funcionalidades
- Sistema completo de pré-separação por zonas
- Filtros avançados por tipo de separação
- Relatórios de impressão otimizados
- Dashboard com totalizadores

## 🐛 Correções
- Corrigido cálculo de totais por zona
- Melhorada sincronização entre abas
- Ajustes no layout de impressão

## 🔧 Melhorias
- Performance aprimorada no carregamento de dados
- Interface mais intuitiva
- Validações aprimoradas nos formulários`,
          published_at: "2025-06-10T14:30:00Z",
          author: {
            login: "paulo-dev",
            avatar_url: "https://github.com/paulo-dev.png"
          },
          prerelease: false,
          draft: false,
          html_url: "https://github.com/seu-repo/releases/tag/v1.1.0",
          assets: []
        },
        {
          id: 3,
          tag_name: "v1.0.0",
          name: "Release Inicial",
          body: `## 🎉 Release Inicial do Sistema

### ✨ Funcionalidades Principais
- Sistema completo de separação de pedidos
- Upload e processamento de arquivos Excel
- Gestão de separações por estado (SP, ES, RJ)
- Interface moderna e responsiva
- Sistema de autenticação seguro

### 📊 Módulos Inclusos
- **Separação**: Gestão completa do processo
- **Pré-separação**: Organização por zonas
- **Configurações**: Personalização do sistema
- **Relatórios**: Exportação e impressão

### 🔐 Segurança
- Autenticação JWT
- Validação de dados com Zod
- Proteção de rotas
- Criptografia de senhas`,
          published_at: "2025-06-01T09:00:00Z",
          author: {
            login: "paulo-dev",
            avatar_url: "https://github.com/paulo-dev.png"
          },
          prerelease: false,
          draft: false,
          html_url: "https://github.com/seu-repo/releases/tag/v1.0.0",
          assets: []
        }
      ]
      
      setReleases(mockReleases)
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

  const parseReleaseBody = (body: string) => {
    // Converter markdown simples para HTML
    return body
      .replace(/## (.*)/g, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
      .replace(/### (.*)/g, '<h4 class="text-md font-medium text-gray-200 mt-3 mb-2">$1</h4>')
      .replace(/- (.*)/g, '<li class="text-gray-300 ml-4">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
      .replace(/\n/g, '<br/>')
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
      {/* Header */}
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
        
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Status do Sistema */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white apple-font flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <Tag className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Versão Atual</p>
                <p className="text-white font-mono font-bold">v{systemInfo.currentVersion}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {statusInfo.icon}
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <Badge className={statusInfo.color}>
                  {statusInfo.text}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Uptime</p>
                <p className="text-white font-mono">{systemInfo.uptime}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Última Verificação</p>
                <p className="text-white text-sm">{formatDate(systemInfo.lastUpdate)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtro de Busca */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por versão ou funcionalidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <p className="text-sm text-gray-400">
          {filteredReleases.length} {filteredReleases.length === 1 ? 'versão' : 'versões'}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="outline"
                className="ml-auto border-red-600 text-red-400 hover:bg-red-900/20"
              >
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Releases */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredReleases.map((release, index) => (
            <motion.div
              key={release.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="bg-gray-900/50 border-gray-800 hover:border-gray-700 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Tag className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xl font-bold text-white">{release.name}</h3>
                          {release.tag_name === `v${systemInfo.currentVersion}` && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Atual
                            </Badge>
                          )}
                          {release.prerelease && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                              Beta
                            </Badge>
                          )}
                        </div>
                        <p className="text-blue-400 font-mono">{release.tag_name}</p>
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
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Informações do Release */}
                  <div className="flex items-center space-x-6 text-sm text-gray-400">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>{release.author.login}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(release.published_at)}</span>
                    </div>
                    {release.assets.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>{release.assets.length} arquivo{release.assets.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Conteúdo do Release */}
                  <div 
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: parseReleaseBody(release.body) 
                    }}
                  />
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