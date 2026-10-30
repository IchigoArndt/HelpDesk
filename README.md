# HelpDesk — Smart-Base (Recuperação de Informação)

Sistema de Help Desk com motor de busca TF-IDF sobre chamados antigos.

## Stack

O front-end **Circuito** está disponível em [`Front/`](Front/README.md). Para abrir a comunidade demonstrativa local, execute `cd Front` e `npm run dev`, depois acesse **http://localhost:5173**. Ele funciona sem instalar dependências e sem iniciar o banco de dados.

- **Node.js 22 a 24** (Express 5, CommonJS)
- **PostgreSQL 16** (via Podman)
- **Prisma ORM 5**
- Busca inteligente por **TF-IDF** (título × 3, solução × 2, descrição × 1)

---

## Pré-requisitos (Fedora)

```bash
sudo dnf install nodejs podman podman-compose
```

> Utilize **Node.js 22, 23 ou 24**, conforme as diretrizes da disciplina. Verifique com `node --version`.

---

## Setup rápido (Fedora + Podman)

```bash
cd Backend
bash setup.sh
```

O script sobe o PostgreSQL via Podman, instala as dependências npm, aplica as migrações versionadas, gera o Prisma Client e popula a massa de demonstração. Depois, em `Backend/`, execute `npm run demo`.

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
npm ci
```

### 4. Rodar a migration e gerar o client

```bash
npm run prisma:deploy
npm run prisma:generate
```

### 5. Popular e demonstrar o banco

```bash
npm run seed   # cria 5000 chamados fictícios e seus índices
npm run demo   # verifica relações, rollback e mede a busca
```

O seeder pode ser repetido sequencialmente: insere apenas os chamados de demonstração ausentes e preserva dados existentes. Não execute duas instâncias simultâneas.

### 6. Iniciar o servidor

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
| POST   | /tickets        | `{ title, description, solution?, status?, authorId, categoryId, productId? }` |
| GET    | /tickets        | `?status=ABERTO&categoryId=1`                                         |
| GET    | /tickets/:id    |                                                                       |
| PATCH  | /tickets/:id    | title, description, solution, status, productId (qualquer combinação) |
| GET    | /tickets/search | `?q=impressora+nao+imprime&limit=10`                                  |

#### Status válidos
`ABERTO` | `EM_ANDAMENTO` | `RESOLVIDO` | `FECHADO`

---

## Demonstração da busca TF-IDF

Com o PostgreSQL configurado e as migrações aplicadas, execute em `Backend/`:

```bash
npm run seed
npm run demo
```

A demonstração usa IDs reais do banco. Para consultar a API após `npm start`, em outro terminal:

```bash
curl -fsS "http://localhost:3000/tickets/search?q=impressora+pdf&limit=5"
```

A resposta inclui `score` e os dados do chamado com seus relacionamentos. Para testar o cadastro com `POST /tickets`, obtenha `authorId` e `categoryId` por `GET /authors` e `GET /categories`; use os IDs retornados, pois a numeração depende dos dados existentes. O corpo aceita `status: "RESOLVIDO"` e uma `solution` para representar um chamado antigo resolvido.

---

## Arquitetura

```
Backend/
├── prisma/
│   ├── schema.prisma           ← 7 models + índice invertido (Term, TicketTerm)
│   └── migrations/             ← estrutura inicial e índices de consulta
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


## Escopo acadêmico e Trilha A: Prisma ORM avançado

O MVP avaliado é o backend e a persistência. O frontend Circuito é uma demonstração opcional e não é necessário para a apresentação da disciplina. A trilha escolhida é **A (ORM Avançado)**; a busca TF-IDF complementa essa trilha. Não se declara implementação de Elasticsearch/Typesense (Trilha B) nem RAG/pgvector (Trilha C).

O Prisma representa relações 1:N entre autores/categorias e chamados, artigos e produtos; produtos podem ser associados a vários chamados. O relacionamento N:N entre chamados e termos é representado por `TicketTerm`, cuja chave composta impede ocorrências duplicadas do mesmo termo por chamado. Emails, nomes de categorias e tokens têm restrições de unicidade. Textos longos são armazenados como `TEXT`. O status usa um enum. As chaves estrangeiras preservam a integridade relacional, e a exclusão de um chamado remove suas ocorrências no índice por cascata.

A criação e a atualização de chamados usam transações interativas do Prisma: verificam as referências, gravam o chamado e atualizam seu índice de busca na mesma transação. Uma falha desfaz todas essas gravações. O teste de integração e `npm run demo` exercitam rollback após a criação do índice. Há índices SQL para consulta por termo e filtros de categoria/status/data. A busca ainda calcula o ranking no Node.js e carrega as ocorrências correspondentes: é uma demonstração acadêmica, sem promessa de escala ilimitada.

## Migrações e bancos existentes

As migrações em `Backend/prisma/migrations/` fazem parte da entrega. Em um banco/schema novo, `npm run prisma:deploy` aplica a estrutura versionada; esse comando não exige criar novas migrações. Para evoluir o modelo durante o desenvolvimento, altere o schema, execute `npm run prisma:migrate -- --name descricao_da_mudanca` e versione os arquivos SQL gerados.

Se o banco já contém tabelas criadas antes deste histórico, confira `npx prisma migrate status` e o histórico local antes de aplicar. Um banco existente sem histórico exige comparar a estrutura e estabelecer uma baseline; não use reset nem marque migrações como aplicadas sem confirmar equivalência. O projeto não apaga dados existentes automaticamente.

No Windows/PowerShell, copie a configuração com `Copy-Item .env.example .env`. Configure `DATABASE_URL` para o PostgreSQL disponível. Os comandos npm de migração, seed, demonstração e teste são os mesmos no Windows e no Linux. A infraestrutura e os comandos de contêiner existentes foram preservados.

## Massa de dados e demonstração pelo terminal

`npm run seed` cria 20 autores fictícios, cinco categorias, cinco produtos, cinco artigos e **5000 chamados**, com descrições longas, soluções, datas variadas e os quatro status. Os chamados são indexados em lotes de 100 dentro de transações. A massa cobre impressão, rede, acesso, email e hardware. Os emails usam o domínio reservado `.example`. A reexecução sequencial completa registros ausentes sem duplicar a massa; reduzir a quantidade não remove registros anteriores e os registros já existentes não são sobrescritos.

Para alterar a quantidade, use `SEED_COUNT` (inteiro de 1 a 100000):

```bash
# Bash
SEED_COUNT=10000 npm run seed
```

```powershell
# PowerShell
$env:SEED_COUNT = "10000"
npm run seed
Remove-Item Env:SEED_COUNT
```

Para apresentar, com o PostgreSQL já disponível:

```bash
cd Backend
npm ci
npm run prisma:validate
npm run prisma:deploy
npm run prisma:generate
npm test
npm run seed
npm run demo
npm start
```

`npm run demo` exige pelo menos 1000 chamados e recomenda a massa padrão. Mostra contagens persistidas, autor/categoria/produto de um chamado, prova de rollback e resultados de quatro buscas. Mede a primeira execução e a mediana de cinco repetições por consulta em milissegundos. Esses tempos são medidos na execução, sem números inventados ou garantia de desempenho. A demonstração não precisa da API iniciada e não conserva os registros temporários usados no rollback.

A API aceita `status` opcional no POST de chamados, com padrão `ABERTO`. Textos vazios, IDs inválidos, status desconhecidos e limites fora de 1–100 são rejeitados nas operações de chamados. Use `productId: null` para remover a associação com produto e `solution: null` para limpar a solução. As demais rotas mantêm as validações existentes.

## Verificação automatizada

`npm test` executa testes unitários de normalização, ponderação dos termos, validação de entrada, propagação do status e ordenação da busca, sem precisar de PostgreSQL. Os testes unitários usam substitutos explícitos para o repositório/banco; eles não comprovam persistência real.

`npm run test:integration` exige dependências instaladas e `TEST_DATABASE_URL` apontando para um PostgreSQL em que seja permitido criar schemas. O teste cria um schema aleatório `helpdesk_test_...`, aplica as migrações, verifica equivalência com o schema Prisma, executa a API em porta temporária e testa seed repetido, persistência do status, atualização do índice, referências inválidas e rollback. Ao terminar, remove apenas o schema criado pelo teste; não usa o schema da aplicação.

```powershell
$env:TEST_DATABASE_URL = "postgresql://usuario:senha@localhost:5432/helpdesk"
npm run test:integration
Remove-Item Env:TEST_DATABASE_URL
```

```bash
TEST_DATABASE_URL='postgresql://usuario:senha@localhost:5432/helpdesk' npm run test:integration
```

## Auditoria e entrega

O arquivo [IA_LOG.md](IA_LOG.md) registra os pedidos observados nesta sessão, as intervenções e os limites de validação. O histórico de uso da IA anterior à sessão deve ser complementado pela dupla a partir dos registros reais. Não foram inventados prompts ou contribuições humanas.

Entrega indicada nas diretrizes: **10/11/2026**. Antes da apresentação, execute a validação com o PostgreSQL disponível, conserve a saída real da demonstração e versione as alterações com commits descritivos dos respectivos autores. O histórico de commits deve refletir o trabalho real de cada integrante.
