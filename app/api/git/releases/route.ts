// app/api/git/releases/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Configurar essas variáveis no seu .env.local
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'seu-usuario'
const GITHUB_REPO = process.env.GITHUB_REPO || 'seu-repositorio'

export async function GET(request: NextRequest) {
  try {
    // Se não tiver token configurado, retornar dados mock
    if (!GITHUB_TOKEN) {
      console.warn('GITHUB_TOKEN não configurado, usando dados mock')
      return NextResponse.json({
        releases: getMockReleases(),
        source: 'mock'
      })
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Colhetron-App'
        },
        next: { revalidate: 300 } // Cache por 5 minutos
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const releases = await response.json()
    
    // Filtrar apenas releases públicos e não-draft
    const filteredReleases = releases
      .filter((release: any) => !release.draft)
      .slice(0, 10) // Últimos 10 releases

    return NextResponse.json({
      releases: filteredReleases,
      source: 'github'
    })

  } catch (error) {
    console.error('Erro ao buscar releases:', error)
    
    // Em caso de erro, retornar dados mock
    return NextResponse.json({
      releases: getMockReleases(),
      source: 'mock',
      error: 'Erro ao conectar com GitHub, usando dados locais'
    })
  }
}

function getMockReleases() {
  return [
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
      published_at: new Date().toISOString(),
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
      published_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
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
      published_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
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
}