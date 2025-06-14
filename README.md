# Colhetron

## 📖 Sobre o Projeto

O **Colhetron** é uma aplicação web robusta desenvolvida para otimizar e gerenciar processos logísticos, com foco na separação de materiais. A plataforma oferece um conjunto completo de funcionalidades para controle de cadastros, gerenciamento de separações, faturamento e análise de dados, com o objetivo de aumentar a eficiência e a precisão das operações diárias.

Desenvolvido com tecnologias web modernas, o Colhetron possui uma interface intuitiva e responsiva, promovendo uma experiência de uso simples e eficaz.

---

## ✨ Funcionalidades Principais

O sistema é dividido em módulos funcionais, cada um com foco em uma etapa do processo operacional:

### 🔐 Autenticação e Segurança

* Sistema completo de login, registro e recuperação de senha
* Verificação de e-mail para autenticação de usuários
* Gerenciamento de sessões e proteção de rotas

### 📂 Cadastro Geral

* **Lojas:** cadastro, edição, exclusão e importação em massa
* **Materiais:** registro e organização dos itens operacionais com suporte a importação

### 🚀 Processo de Separação

* **Pré-Separação:** visão geral dos itens antes do início da separação
* **Separação Ativa:** interface dedicada para execução em tempo real com atualizações dinâmicas
* **Histórico de Separacões:** gerenciamento e consulta de registros anteriores
* **Importação de Dados:** suporte a planilhas e entradas textuais

### 📊 Análise de Mídia e Faturamento

* **Análise de Mídia:** adição em massa e limpeza de dados
* **Faturamento:** relatórios tabulares com exportação para Excel e checagem de status

### 👤 Perfil e Configurações

* Gerenciamento de perfil do usuário
* Ajustes de aplicação, como modo claro/escuro
* Páginas "Sobre" e "Atualizações"

---

## 🛠️ Tecnologias Utilizadas

### Frontend

* **Next.js** - Framework React para SSR e SSG
* **React** - Construção de interfaces de usuário
* **TypeScript** - Tipagem estática para JavaScript
* **Tailwind CSS** - Framework utilitário de estilização
* **Shadcn/UI** - Biblioteca de componentes acessíveis e reutilizáveis
* **Context API & Hooks** - Gerenciamento de estado e lógica modular

### Backend & Banco de Dados

* **Supabase** - Banco PostgreSQL, autenticação e APIs automáticas
* **Next.js API Routes** - Endpoints para comunicação com Supabase

### Outras Bibliotecas

* **zod** - Validação de esquemas e tipos
* **react-hook-form** - Gerenciamento de formulários
* **resend** - Envio de e-mails
* **xlsx** - Manipulação de planilhas Excel
* **lucide-react** - Ícones

---

## 🚀 Começando

### Requisitos

* Node.js (v18 ou superior)
* pnpm

### Instalação

```bash
git clone https://github.com/esc4n0rx/Colhetron.git
cd Colhetron
pnpm install
```

### Configuração do Ambiente

Crie um arquivo `.env.local` na raiz do projeto e adicione:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
EMAIL_FROM=seu-email@dominio.com
APP_URL=http://localhost:3000
```

### Executando

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000) para visualizar a aplicação.

---

## 🏗️ Estrutura do Projeto

```
/
├── app/
│   ├── api/          # Backend (API Routes)
│   ├── auth/         # Autenticação
│   └── (dashboard)/  # Páginas principais
├── components/
│   ├── auth/         # Componentes de login/registro
│   ├── modals/       # Modais reutilizáveis
│   ├── pages/        # Componentes de páginas completas
│   ├── tabs/         # Abas do dashboard
│   └── ui/           # Base de UI (Shadcn)
├── contexts/         # Contextos globais
├── hooks/            # Hooks customizados
├── lib/              # Funções e serviços
├── public/           # Arquivos estáticos
└── ...
```

---

## 🤝 Contribuições

Contribuições são muito bem-vindas!

1. Fork este repositório
2. Crie uma nova branch: `git checkout -b feature/MinhaFeature`
3. Commit suas alterações: `git commit -m 'Add MinhaFeature'`
4. Push: `git push origin feature/MinhaFeature`
5. Abra uma Pull Request

Ou abra uma issue com a tag `enhancement` para sugerir melhorias.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE.txt` para mais detalhes.

---

## 📧 Contato

**Seu Nome**
[GitHub](https://github.com//esc4n0rx) • [@seu\_twitter](https://twitter.com/esc4n0rx)
Email: [contato.paulooliver9@gmail.com](mailto:contato.paulooliver9@gmail.com)

**Link do Projeto:** [https://github.com/esc4n0rx/Colhetron](https://github.com/esc4n0rx/Colhetron)
