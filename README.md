# HelpDesk — Circuito (comunidade de suporte)

MVP de Banco de Dados II com PostgreSQL, Node.js 22 e Prisma ORM. A trilha escolhida é **A — ORM Avançado**. O produto é um **helpdesk comunitário** (suporte entre pares, no estilo pergunta → respostas → solução aceita), com a busca TF-IDF complementando a demonstração de persistência relacional e transações. Entrega prevista nas diretrizes: **10/11/2026**.

O backend (`Backend/`) é a API Node.js + Prisma; o front-end **Circuito** (`Front/`) consome essa API pelo proxy `/api`. Os dois sobem juntos (veja abaixo).

Para publicar (API + Postgres no Railway, front no Vercel), veja [DEPLOY.md](DEPLOY.md).

## Executar tudo

Requer Docker (ou Podman com `docker` emulado) para o backend e Node.js 18+ para o front-end.

```sh
# 1. Backend + PostgreSQL (aplica migrações e popula os dados)
cd Backend
docker compose up --build -d --wait --wait-timeout 240

# 2. Front-end (outro terminal)
cd Front
npm run dev
```

- Interface: http://localhost:5173
- API direta: http://localhost:3000 (saúde em `/health`)
- PostgreSQL local: `localhost:5432`, banco/usuário/senha de desenvolvimento: `helpdesk`.

O comando do Compose constrói o backend, aguarda a saúde do PostgreSQL 16, aplica as migrações versionadas, popula os dados e inicia a API. O volume mantém os dados entre reinicializações. O seeder é repetível: uma segunda execução não sobrescreve nem duplica nada. As portas são publicadas somente em `127.0.0.1` e as credenciais servem apenas à demonstração local. O `.env` do computador não é copiado para a imagem.

Se a imagem for reconstruída com o contêiner antigo ainda ativo (ocorre com `podman-compose`), remova o contêiner do backend antes de subir de novo, preservando o volume do banco:

```sh
docker stop backend_backend_1 && docker rm backend_backend_1
docker compose up -d --wait
```

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

A integração cria um schema aleatório `helpdesk_test_...` no PostgreSQL e remove apenas esse schema ao terminar. A massa do schema `public` permanece intacta. Os testes confirmam a equivalência entre migração e schema Prisma, seed repetível, cadastro e sessão, privacidade do e-mail, publicação com validação, aceite de solução com reindexação, votos, itens salvos, notificações e rollback após falha de chave estrangeira.

Para mudar o volume de dados de demonstração, com o banco em execução:

```sh
docker compose run --rm -e SEED_COUNT=10000 backend npm run seed
```

O seeder aceita de 1 a 100000 publicações geradas. Não execute duas instâncias simultâneas. Reduzir a quantidade não exclui registros anteriores. A apresentação recomenda pelo menos 1000 registros.

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

O schema em `Backend/prisma/schema.prisma` contém 14 modelos:

| Modelo | Finalidade |
| --- | --- |
| Member | Membros com e-mail único, nível e interesses |
| Session | Sessões; o token opaco é guardado apenas como hash SHA-256 |
| Category | Categorias de hardware com ícone |
| Article | Guias da base de conhecimento |
| Post | Publicações (pergunta/solução) com status `OPEN`/`RESOLVED`, placar, visualizações e imagem opcional |
| Reply | Respostas; no máximo uma é a solução aceita da publicação |
| Tag e PostTag | Tags e associação N:N com publicações |
| PostVote e ReplyVote | Votos +1/-1 por membro, com chave primária composta |
| Bookmark | Itens salvos por membro |
| Notification | Avisos de resposta e de solução aceita |
| Term e PostTerm | Vocabulário e índice invertido com frequência ponderada (N:N) |

As relações usam chaves estrangeiras. `PostTag`, `PostVote`, `ReplyVote`, `Bookmark` e `PostTerm` têm chave primária composta, o que garante um voto, um salvo e um termo por par. Excluir uma publicação remove em cascata respostas, votos, salvos, tags associadas, notificações e ocorrências do índice. Há índices para busca por termo e filtros por categoria/status/data. Textos longos usam `TEXT`, o status usa enum e interesses usam `TEXT[]`.

```mermaid
erDiagram
  Member ||--o{ Session : abre
  Member ||--o{ Post : publica
  Member ||--o{ Reply : responde
  Member ||--o{ PostVote : vota
  Member ||--o{ ReplyVote : vota
  Member ||--o{ Bookmark : salva
  Member ||--o{ Notification : recebe
  Category ||--o{ Post : classifica
  Post ||--o{ Reply : tem
  Post ||--o{ PostTag : marca
  Tag ||--o{ PostTag : usada
  Post ||--o{ PostVote : recebe
  Reply ||--o{ ReplyVote : recebe
  Post ||--o{ Bookmark : guardada
  Post ||--o{ PostTerm : indexa
  Term ||--o{ PostTerm : ocorre
```

As operações compostas usam transações interativas do Prisma:

- **Publicar**: confere a categoria, grava a publicação com tags (`connectOrCreate`) e reindexa o texto.
- **Aceitar solução**: trava a publicação com `SELECT ... FOR UPDATE`, desmarca a resposta anterior, atualiza o status, notifica o autor da resposta e reindexa com o texto da solução.
- **Votar**: trava o alvo, grava ou remove o voto e ajusta o placar pelo delta. Repetir a mesma direção remove o voto. Votar no próprio conteúdo é recusado.

Uma falha desfaz todas as gravações; a integração força uma falha de chave estrangeira após indexar uma publicação e verifica que nem ela nem os termos novos persistiram.

A trilha entregue é A. Não há integração com Elasticsearch/Typesense (B) nem RAG/pgvector (C).

### Acesso sem senha

O cadastro pede nome e e-mail e devolve um token de sessão; o login aceita apenas o e-mail. Isso é suficiente para a demonstração, mas **não é autenticação forte**: quem souber um e-mail pode entrar nesse perfil. Não há envio de e-mails, redefinição de senha nem limitação de tentativas. O e-mail nunca aparece em listas ou perfis públicos. Não use dados sensíveis.

## Busca e demonstração

O índice invertido usa TF-IDF: título tem peso 3, tags peso 2, **texto da solução aceita** peso 2 e descrição peso 1. A consulta normaliza caixa e acentos, remove stopwords e ordena por relevância, data e ID. O ranking é calculado no Node.js; não se promete escala ilimitada. Aceitar ou desmarcar uma solução reindexa a publicação, então a busca passa a (ou deixa de) encontrá-la pelas palavras da resposta.

`npm run demo` (ou o comando Docker equivalente) exibe contagens persistidas, as relações de uma publicação, comprova o rollback e executa quatro buscas, mostrando o tempo da primeira execução e a mediana de cinco repetições. Os tempos dependem do ambiente e são calculados a cada execução.

A massa contém os 5 membros e as 5 publicações do protótipo (com respostas, votos e duas soluções aceitas), 7 categorias, 3 guias, 20 membros fictícios de volume e **5000 publicações geradas** (sete cenários de hardware, com respostas e soluções aceitas) com textos longos e datas variadas. Os e-mails usam domínios reservados `.example`. Os membros de volume (`@massa.circuito.example`) não aparecem na listagem de membros nem no ranking de reputação. As inserções e o índice são feitos em lotes transacionais de 100 publicações.

## Rotas da API

Rotas marcadas com **sessão** exigem `Authorization: Bearer <token>`; as demais aceitam visitantes (com sessão, trazem também `saved` e `myVote`).

| Método | Rota | Entrada / observações |
| --- | --- | --- |
| GET | `/health`, `/stats` | Saúde; totais de publicações, resolvidas e membros |
| POST | `/members` | `name, email, level?, interests?` — devolve `member` e `token` |
| POST | `/members/login` | `email` — devolve `member` e `token` |
| GET, PATCH | `/members/me` | **sessão**; PATCH aceita `name, level, interests` |
| POST | `/members/logout` | **sessão**; encerra o token atual |
| GET | `/members`, `/members/:id` | Membros com estatísticas e reputação (sem e-mail) |
| GET | `/categories`, `/categories/:id` | Categorias |
| GET | `/articles`, `/articles/:id` | Guias da base de conhecimento |
| GET | `/posts` | Filtros `status` (`open`, `resolved`, `unanswered`), `categoryId`, `authorId`, `saved=me` (sessão), `sort` (`recent`, `popular`), `limit` até 100, `offset` |
| GET | `/posts/search` | `q` e `limit` opcional entre 1 e 100; ranking TF-IDF |
| POST | `/posts` | **sessão**; `title` (10–160), `description` (20–10000), `category` (nome) ou `categoryId`, `tags` (até 4), `image` (data URL até 2 MB) |
| GET | `/posts/:id` | Detalhes com respostas; incrementa visualizações |
| POST | `/posts/:id/replies` | **sessão**; `body` (10–5000) |
| POST | `/posts/:id/accept` | **sessão**, só o autor; `replyId` — alterna a solução aceita |
| POST, DELETE | `/posts/:id/bookmark` | **sessão**; salva ou remove dos salvos |
| POST | `/votes` | **sessão**; `postId` ou `replyId` (exatamente um) e `direction` (1 ou -1) |
| GET | `/notifications` | **sessão**; itens e total não lido |
| PATCH | `/notifications/read` | **sessão**; marca todas como lidas |

Erros retornam `{ "error": "..." }` com 400 (entrada inválida), 401 (sem sessão), 403 (sem permissão ou autovoto), 404, 409 (e-mail duplicado) ou 413 (corpo grande demais).

```sh
curl -fsS "http://localhost:3000/posts/search?q=ssd+bios&limit=5"
```

## Migrações e bancos existentes

As migrações em `Backend/prisma/migrations/` foram geradas pelo Prisma a partir do schema. `npm run prisma:deploy` aplica o histórico em um banco/schema novo. Para evoluir o modelo, use `npm run prisma:migrate -- --name descricao_da_mudanca` e versione o SQL gerado.

**Atenção:** a migração `20261102000000_community_circuito` troca o domínio de chamados de TI pelo da comunidade. Ela **apaga** as tabelas anteriores (`Ticket`, `TicketTerm`, `Product`, `Author`, `Article`, `Category`, `Term`) e recria o modelo novo; o seed repopula os dados. Faça backup antes de aplicá-la sobre um banco com dados que importem.

Um banco antigo com tabelas mas sem histórico exige conferir a estrutura e estabelecer uma baseline antes de aplicar. Não use reset nem marque migrações como aplicadas sem confirmar equivalência.

## Arquitetura e testes

`Backend/src/application/` contém casos de uso e validações; `infrastructure/` contém repositórios Prisma e indexação; `presentation/` contém rotas, controllers, autenticação por token e tratamento HTTP de erros. O Dockerfile instala dependências pelo lockfile e gera o client Prisma; o processo da aplicação executa como usuário `node`.

`npm test` verifica normalização, ponderação, validações e a geração em memória de 5000 registros. `npm run test:integration` usa PostgreSQL real e exige `TEST_DATABASE_URL`. No host, defina essa variável apontando para o banco de testes antes da execução. O usuário do banco precisa poder criar schemas. Nenhuma chave ou senha pessoal deve ser versionada.

## Front-end e auditoria

O front-end Circuito está em [Front/](Front/README.md). Ele carrega publicações, membros, guias e totais da API, e grava publicações, respostas, votos, aceite de solução, itens salvos e leitura de notificações por ela, usando o proxy `/api` do próprio servidor do front (sem CORS). No navegador ficam apenas o token e o perfil da sessão.

[IA_LOG.md](IA_LOG.md) documenta os pedidos desta conversa, intervenções e resultados reais de validação. Prompts de sessões anteriores só devem ser adicionados a partir dos registros reais da dupla. O Git deve refletir a participação efetiva de ambos, sem autoria ou commits inventados.

Os resultados reais da última execução estão em [VALIDACAO.md](VALIDACAO.md).
