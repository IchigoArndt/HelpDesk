# HelpDesk — Smart-Base

MVP de Banco de Dados II com PostgreSQL, Node.js 22 e Prisma ORM. A trilha escolhida é **A — ORM Avançado**. A busca TF-IDF complementa a demonstração de persistência relacional e transações. Entrega prevista nas diretrizes: **10/11/2026**.

## Executar com Docker (recomendado)

Requer Docker com Docker Compose. Não é necessário instalar Node.js, npm ou PostgreSQL no computador.

```sh
cd Backend
docker compose up --build -d --wait --wait-timeout 240
```

Esse comando constrói o backend, aguarda a saúde do PostgreSQL 16, aplica a migração versionada, popula **5000 chamados** e inicia a API. O volume mantém os dados entre reinicializações. A execução sequencial do seeder não sobrescreve nem duplica os registros de demonstração existentes.

- API: http://localhost:3000
- Saúde da API: http://localhost:3000/health
- PostgreSQL local: `localhost:5432`, banco/usuário/senha de desenvolvimento: `helpdesk`.

As portas são publicadas somente em `127.0.0.1`. Essas credenciais são destinadas à demonstração local. O `.env` do computador não é copiado para a imagem; o Compose define a conexão do backend com o serviço `postgres`.

```sh
# Estado, logs e demonstração
docker compose ps
docker compose logs --tail 80 backend
docker compose exec backend npm run demo

# Testes unitários, validação do Prisma e integração real
docker compose exec backend npm test
docker compose exec backend npm run prisma:validate
docker compose run --rm -e TEST_DATABASE_URL=postgresql://helpdesk:helpdesk@postgres:5432/helpdesk backend npm run test:integration

# Parar, preservando o volume de dados
docker compose down
```

A integração cria um schema aleatório `helpdesk_test_...` no PostgreSQL e remove apenas esse schema ao terminar. A massa do schema `public` permanece intacta. O teste confirma a equivalência entre migração e schema Prisma, seed repetível, persistência de status, reindexação de texto, rejeição de referências inválidas e rollback após falha de chave estrangeira.

Para mudar a quantidade de chamados, com o banco em execução:

```sh
docker compose run --rm -e SEED_COUNT=10000 backend npm run seed
```

O seeder aceita de 1 a 100000 registros. Não execute duas instâncias simultâneas. Reduzir a quantidade não exclui registros anteriores. A apresentação recomenda pelo menos 1000 chamados.

## Execução sem contêiner para o backend

Requer Node.js **22 a 24** e PostgreSQL disponível. Em `Backend/`, copie `.env.example` para `.env` e ajuste `DATABASE_URL`. No PowerShell, use `Copy-Item .env.example .env`; no Bash, `cp .env.example .env`.

```sh
npm ci
npm run prisma:validate
npm run prisma:deploy
npm run prisma:generate
npm test
npm run seed
npm run demo
npm start
```

O setup Linux/Fedora em `Backend/setup.sh` continua disponível com Podman. Se usar Docker para o PostgreSQL e Node no host, suba apenas o serviço do banco com `docker compose up -d postgres` e siga os comandos npm acima. Não inicie dois backends na mesma porta.

## Trilha A e modelagem

O schema em `Backend/prisma/schema.prisma` contém sete modelos:

| Modelo | Finalidade |
| --- | --- |
| Author | Autores com email único |
| Category | Categorias com nome único |
| Product | Produtos associados a autor e categoria |
| Article | Artigos com texto longo, autor e categoria |
| Ticket | Chamados com descrição, solução, status, autor, categoria e produto opcional |
| Term | Vocabulário de tokens únicos |
| TicketTerm | Associação N:N entre chamados e termos, com frequência ponderada |

As relações usam chaves estrangeiras. `TicketTerm` possui chave primária composta; excluir um chamado remove suas ocorrências no índice por cascata. Há índices para busca por termo e filtros por categoria/status/data. Textos longos usam `TEXT` e o status utiliza enum.

```mermaid
erDiagram
  Author ||--o{ Ticket : escreve
  Author ||--o{ Article : escreve
  Author ||--o{ Product : cadastra
  Category ||--o{ Ticket : classifica
  Category ||--o{ Article : classifica
  Category ||--o{ Product : classifica
  Product o|--o{ Ticket : relacionado
  Ticket ||--o{ TicketTerm : indexa
  Term ||--o{ TicketTerm : ocorre
```

A criação e a atualização de chamados usam transações interativas: verificam referências, gravam o chamado e atualizam o índice na mesma transação. Uma falha desfaz as gravações. A integração força uma falha de chave estrangeira após indexar um chamado e verifica que nem o chamado nem os termos novos persistiram.

A trilha entregue é A. Não há integração com Elasticsearch/Typesense (B) nem RAG/pgvector (C). Autenticação e interface gráfica não integram o escopo de avaliação do backend descrito no trabalho.

## Busca e demonstração

O índice invertido usa TF-IDF: título tem peso 3, solução peso 2 e descrição peso 1. A consulta normaliza caixa e acentos, remove stopwords e ordena por relevância, data e ID. A busca calcula o ranking no Node.js; não se promete escala ilimitada.

`npm run demo` (ou o comando Docker equivalente) exibe contagens persistidas, relações de um chamado, comprova rollback e executa quatro buscas. Mostra o tempo da primeira execução e a mediana de cinco repetições. Os tempos dependem do ambiente e são calculados a cada execução.

A massa contém 20 autores fictícios, cinco categorias, cinco produtos, cinco artigos e 5000 chamados com textos longos, datas variadas e os quatro status. Os emails usam o domínio reservado `.example`. As inserções e o índice são feitos em lotes transacionais de 100 chamados.

## Rotas da API

| Método | Rota | Entrada |
| --- | --- | --- |
| GET | `/health` | Saúde do processo |
| POST | `/authors` | `name, email` |
| GET | `/authors`, `/authors/:id` | Lista/detalhes |
| POST | `/categories` | `name, description?` |
| GET | `/categories`, `/categories/:id` | Lista/detalhes |
| POST | `/products` | `name, description, authorId, categoryId` |
| GET | `/products`, `/products/:id` | Lista/detalhes |
| POST | `/articles` | `title, body, authorId, categoryId` |
| GET | `/articles`, `/articles/:id` | Lista/detalhes |
| POST | `/tickets` | `title, description, solution?, status?, authorId, categoryId, productId?` |
| GET | `/tickets` | Filtros opcionais `status`, `categoryId` |
| GET | `/tickets/:id` | Detalhes |
| PATCH | `/tickets/:id` | `title, description, solution, status, productId` |
| GET | `/tickets/search` | `q`, `limit` opcional entre 1 e 100 |

Status: `ABERTO`, `EM_ANDAMENTO`, `RESOLVIDO`, `FECHADO`. O POST preserva o status informado; o padrão é `ABERTO`. Para limpar solução ou produto, envie `null`. As operações de chamados rejeitam texto vazio, IDs inválidos e status desconhecidos. Use os IDs retornados pela API, pois a numeração depende dos dados existentes.

```sh
curl -fsS "http://localhost:3000/tickets/search?q=impressora+pdf&limit=5"
```

## Migrações e bancos existentes

A migração inicial em `Backend/prisma/migrations/` foi gerada pelo Prisma a partir do schema. `npm run prisma:deploy` aplica o histórico em um banco/schema novo sem criar migrações adicionais. Para evoluir o modelo, use `npm run prisma:migrate -- --name descricao_da_mudanca` e versione o SQL gerado.

Um banco antigo com tabelas mas sem esse histórico exige conferir a estrutura e estabelecer uma baseline antes de aplicar. Não use reset nem marque migrações como aplicadas sem confirmar equivalência. O setup não apaga dados existentes automaticamente.

## Arquitetura e testes

`Backend/src/application/` contém casos de uso e validações; `infrastructure/` contém repositórios Prisma e indexação; `presentation/` contém rotas, controllers e tratamento HTTP de erros. O Dockerfile instala dependências pelo lockfile e gera o client Prisma; o processo da aplicação executa como usuário `node`.

`npm test` verifica normalização, ponderação, entradas e a geração em memória de 5000 registros. `npm run test:integration` usa PostgreSQL real e exige `TEST_DATABASE_URL`. No host, defina essa variável apontando para o banco de testes antes da execução. O usuário do banco precisa poder criar schemas. Nenhuma chave ou senha pessoal deve ser versionada.

## Frontend opcional e auditoria

O frontend Circuito está em [Front/](Front/README.md). Para executar, use `cd Front` e `npm run dev`, abrindo http://localhost:5173. Ele é demonstrativo, usa persistência local no navegador e ainda não grava na API; não é necessário para a avaliação de Banco de Dados II.

[IA_LOG.md](IA_LOG.md) documenta os pedidos desta conversa, intervenções e resultados reais de validação. Prompts de sessões anteriores só devem ser adicionados a partir dos registros reais da dupla. O Git deve refletir a participação efetiva de ambos, sem autoria ou commits inventados.

Os resultados reais da execução de 01/11/2026 estão em [VALIDACAO.md](VALIDACAO.md).
