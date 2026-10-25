# HelpDesk — Smart-Base (Recuperação de Informação)

Sistema de Help Desk com motor de busca TF-IDF sobre chamados antigos.

## Stack

O front-end **Circuito** está disponível em [`Front/`](Front/README.md). Para abrir a comunidade demonstrativa local, execute `cd Front` e `npm run dev`, depois acesse **http://localhost:5173**. Ele funciona sem instalar dependências e sem iniciar o banco de dados.

- **Node.js ≥ 18** (Express 5, CommonJS)
- **PostgreSQL 16** (via Podman)
- **Prisma ORM 5**
- Busca inteligente por **TF-IDF** (título × 3, solução × 2, descrição × 1)

---

## Pré-requisitos (Fedora)

```bash
sudo dnf install nodejs podman podman-compose
```

> Node.js mínimo: **18**. Verifique com `node --version`.

---

## Setup rápido (Fedora + Podman)

```bash
cd Backend
bash setup.sh
```

O script faz tudo: sobe o PostgreSQL via Podman, instala as dependências npm, roda a migration e gera o Prisma Client.

---

## Setup manual (passo a passo)

### 1. Criar o `.env`

```bash
cd Backend
cp .env.example .env
```

### 2. Subir o PostgreSQL com Podman

```bash
podman-compose up -d

# Aguardar o banco ficar pronto
podman exec helpdesk_db pg_isready -U helpdesk -d helpdesk
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Rodar a migration e gerar o client

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Iniciar o servidor

```bash
npm run dev        # hot-reload (node --watch)
# ou
npm start
```

Servidor disponível em **http://localhost:3000**.

---

## Comandos úteis do Podman

```bash
podman-compose up -d          # sobe o banco em background
podman-compose down           # para e remove o container
podman-compose down -v        # para, remove container E volume (reset total)
podman logs -f helpdesk_db    # logs do PostgreSQL em tempo real
podman exec -it helpdesk_db psql -U helpdesk -d helpdesk  # acesso ao psql
```

---

## Rotas da API

### Health
| Método | Rota      |
|--------|-----------|
| GET    | /health   |

### Autores
| Método | Rota          | Body                            |
|--------|---------------|---------------------------------|
| POST   | /authors      | `{ name, email }`               |
| GET    | /authors      |                                 |
| GET    | /authors/:id  |                                 |

### Categorias
| Método | Rota             | Body                            |
|--------|------------------|---------------------------------|
| POST   | /categories      | `{ name, description? }`        |
| GET    | /categories      |                                 |
| GET    | /categories/:id  |                                 |

### Produtos
| Método | Rota           | Body                                                |
|--------|----------------|-----------------------------------------------------|
| POST   | /products      | `{ name, description, authorId, categoryId }`       |
| GET    | /products      |                                                     |
| GET    | /products/:id  |                                                     |

### Artigos
| Método | Rota           | Body                                                |
|--------|----------------|-----------------------------------------------------|
| POST   | /articles      | `{ title, body, authorId, categoryId }`             |
| GET    | /articles      |                                                     |
| GET    | /articles/:id  |                                                     |

### Chamados (Tickets)
| Método | Rota            | Body / Query                                                          |
|--------|-----------------|-----------------------------------------------------------------------|
| POST   | /tickets        | `{ title, description, solution?, authorId, categoryId, productId? }` |
| GET    | /tickets        | `?status=ABERTO&categoryId=1`                                         |
| GET    | /tickets/:id    |                                                                       |
| PATCH  | /tickets/:id    | title, description, solution, status, productId (qualquer combinação) |
| GET    | /tickets/search | `?q=impressora+nao+imprime&limit=10`                                  |

#### Status válidos
`ABERTO` | `EM_ANDAMENTO` | `RESOLVIDO` | `FECHADO`

---

## Demonstração da busca TF-IDF

```bash
# 1. Criar autor e categoria
curl -s -X POST http://localhost:3000/authors \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@empresa.com"}' | jq

curl -s -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Impressoras"}' | jq

# 2. Chamado antigo (já resolvido)
curl -s -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Impressora não imprime documentos PDF",
    "description": "A impressora HP LaserJet para de imprimir arquivos PDF sem mostrar erro.",
    "solution": "Atualizar o driver HP e reinstalar o Adobe Acrobat Reader DC.",
    "status": "RESOLVIDO",
    "authorId": 1, "categoryId": 1
  }' | jq

# 3. Chamado novo (problema atual, sem solução ainda)
curl -s -X POST http://localhost:3000/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Falha ao imprimir PDF",
    "description": "Usuário não consegue imprimir documentos PDF na impressora.",
    "authorId": 1, "categoryId": 1
  }' | jq

# 4. Busca — retorna os chamados ranqueados por relevância
curl -s "http://localhost:3000/tickets/search?q=impressora+nao+imprime+pdf&limit=5" | jq
```

A resposta da busca inclui o campo `score` (quanto maior, mais relevante).

---

## Arquitetura

```
Backend/
├── prisma/
│   └── schema.prisma           ← 7 models + índice invertido (Term, TicketTerm)
├── src/
│   ├── config/index.js
│   ├── server.js               ← Express + rotas + errorHandler
│   ├── application/
│   │   └── use-cases/          ← lógica de negócio + validações
│   ├── infrastructure/
│   │   ├── database/           ← prismaClient.js
│   │   ├── repositories/       ← acesso ao banco via Prisma
│   │   └── services/
│   │       ├── tokenizer.js    ← normalização, stopwords PT-BR, TF ponderado
│   │       └── indexService.js ← reindexação em transação Prisma
│   └── presentation/
│       ├── controllers/        ← handlers Express
│       ├── middlewares/        ← errorHandler
│       └── routes/             ← registro de rotas
├── docker-compose.yml          ← compatível com podman-compose
├── setup.sh                    ← setup automático (Fedora + Podman)
├── .env.example
└── package.json
```
