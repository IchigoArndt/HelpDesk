# Prisma no Backend — Resumo

Este documento resume como o Prisma ORM é usado para acessar o PostgreSQL neste backend.

## 1. Visão geral

| Item | Valor |
| --- | --- |
| ORM | Prisma 5.22 (`@prisma/client` + CLI `prisma`) |
| Banco | PostgreSQL 16 |
| Schema | `prisma/schema.prisma` |
| Migrações | `prisma/migrations/` (versionadas, aplicadas com `migrate deploy`) |
| Cliente único | `src/infrastructure/database/prismaClient.js` |
| Conexão | variável de ambiente `DATABASE_URL` |

Exemplo de `DATABASE_URL` (o mesmo do `docker-compose.yml`):

```
postgresql://helpdesk:helpdesk@postgres:5432/helpdesk?schema=public
```

Fora do Docker, use `localhost` no lugar de `postgres`.

## 2. Estrutura de arquivos

```
Backend/
├── prisma/
│   ├── schema.prisma              # modelos, enum, relações e índices
│   └── migrations/
│       ├── migration_lock.toml    # trava o provider (postgresql)
│       ├── 20261030000100_init/
│       ├── 20261030000200_query_indexes/
│       └── 20261102000000_community_circuito/   # domínio atual (comunidade)
└── src/
    ├── infrastructure/
    │   ├── database/prismaClient.js   # new PrismaClient() compartilhado
    │   ├── repositories/              # único lugar que fala com o Prisma
    │   └── services/                  # tokenizer + indexService (TF-IDF)
    └── seed.js                        # popula o banco (via `prisma.seed`)
```

O Prisma só é usado na camada de **infraestrutura** (repositórios, serviços de índice e seed).
Controllers e casos de uso não importam o Prisma diretamente.

## 3. Modelos (schema.prisma)

**Domínio da comunidade**

| Modelo | Papel | Observações |
| --- | --- | --- |
| `Member` | Usuário | `email` único, `interests String[]` (array nativo do Postgres) |
| `Session` | Sessão de login | guarda só o **hash SHA-256** do token; `onDelete: Cascade` |
| `Category` | Categoria da publicação | `name` único |
| `Article` | Artigo da base de conhecimento | `title` único, `body` como `TEXT` |
| `Post` | Publicação | enum `PostStatus` (`OPEN`/`RESOLVED`), `score`, `views`, `updatedAt` automático |
| `Reply` | Resposta | `accepted` marca a solução aceita; `score` |
| `Tag` / `PostTag` | Tags (N:N) | `PostTag` com chave composta `[postId, tagId]` |
| `PostVote` / `ReplyVote` | Votos (+1 / −1) | chave composta `[memberId, postId]` / `[memberId, replyId]` |
| `Bookmark` | Publicações salvas | chave composta `[memberId, postId]` |
| `Notification` | Notificações | índice `[memberId, read, createdAt]` |

**Índice invertido (busca TF-IDF)**

| Modelo | Papel |
| --- | --- |
| `Term` | Termo/token único (`token @unique`) |
| `PostTerm` | Posting: `[postId, termId]` com `tf` (frequência ponderada) |

Pesos do `tf`: título ×3, tags ×2, solução aceita ×2, descrição ×1.

### Relações e regras de exclusão

- Apagar um `Post` remove em cascata suas `Reply`, votos, `Bookmark`, `Notification` e `PostTerm`.
- Apagar um `Member` remove em cascata `Session`, votos, `Bookmark` e `Notification`.
- `Post.author`, `Post.category`, `Reply.author`, `PostTag.tag` e `PostTerm.term` **não** têm cascade
  (o banco impede apagar quem ainda é referenciado).

### Índices

Definidos com `@@index` para os acessos mais comuns, por exemplo:

- `Post`: `[categoryId, status, createdAt]`, `[authorId]`, `[score]`
- `Reply`: `[postId, createdAt]`, `[authorId]`
- `PostTerm`: `[termId]` (acelera a busca por token)

## 4. Fluxo de migrações

| Comando (npm) | Comando Prisma | Quando usar |
| --- | --- | --- |
| `npm run prisma:generate` | `prisma generate` | Gera o client a partir do schema (já roda no build do Docker) |
| `npm run prisma:validate` | `prisma validate` | Valida o schema (precisa de `DATABASE_URL` definida) |
| `npm run prisma:migrate` | `prisma migrate dev` | **Desenvolvimento**: cria e aplica uma nova migração |
| `npm run prisma:deploy` | `prisma migrate deploy` | **Execução/produção**: só aplica migrações existentes |
| `npm run seed` | `node src/seed.js` | Popula dados de exemplo (idempotente) |

Fluxo para alterar o banco:

1. Edite `prisma/schema.prisma`.
2. Rode `npm run prisma:migrate -- --name descricao_da_mudanca`.
3. Versione a pasta nova em `prisma/migrations/`.
4. Reinicie o backend: o container aplica a migração sozinho.

> A migração `20261102000000_community_circuito` é **destrutiva**: ela remove as tabelas do
> domínio antigo (tickets, autores, produtos) antes de criar o schema da comunidade.

## 5. Inicialização no Docker

O `Dockerfile` executa, nesta ordem:

```
npm run prisma:deploy   # aplica as migrações pendentes
npm run seed            # insere dados de exemplo (não duplica)
node src/server.js      # sobe a API
```

No build, `prisma generate` já foi executado, então o client existe antes de o servidor iniciar.
O Postgres usa o volume `helpdesk_pgdata`, então os dados persistem entre reinicializações.

Para zerar o banco: `docker compose down -v` (apaga o volume) e suba novamente.

## 6. Como o código usa o Prisma

### Cliente compartilhado

```js
// src/infrastructure/database/prismaClient.js
const { PrismaClient } = require("@prisma/client");
module.exports = new PrismaClient();
```

Uma única instância é reutilizada por toda a aplicação (pool de conexões compartilhado).

### Consultas com `include`/`select`

Os repositórios carregam relações de uma vez só (autor, categoria, tags, respostas e o voto/salvo do
usuário logado) com `include`, evitando consultas repetidas.

### Transações interativas

Operações que alteram várias tabelas usam `prisma.$transaction(async (tx) => { ... })`, garantindo
tudo-ou-nada. Exemplos:

- **Criar publicação**: cria o `Post`, conecta/cria as `Tag` com `connectOrCreate` e reindexa os termos.
- **Responder**: cria a `Reply` e, se o autor for outra pessoa, cria a `Notification`.
- **Aceitar solução**: desmarca as demais respostas, marca a escolhida, atualiza o `status` do post,
  notifica e reindexa.
- **Votar**: cria/atualiza/remove o voto e ajusta o `score` com `increment`.

### Controle de concorrência (`FOR UPDATE`)

Para evitar condições de corrida em voto e aceite, o repositório trava a linha antes de alterar:

```js
await tx.$queryRawUnsafe(`SELECT id FROM "${table}" WHERE id = $1 FOR UPDATE`, id);
```

A tabela vem de um valor fixo no código (`"Post"` ou `"Reply"`), e o `id` vai como parâmetro, sem
concatenação de entrada do usuário.

### Chaves compostas

Modelos como `PostVote` usam `@@id([memberId, postId])`. O Prisma gera o seletor correspondente:

```js
await tx.postVote.findUnique({ where: { memberId_postId: { memberId, postId } } });
```

### Busca TF-IDF

A busca lê os postings em `PostTerm` dos tokens da consulta, calcula o IDF suavizado
`ln((N+1)/(df+1)) + 1` e soma `tf × idf` por publicação. O índice é mantido por
`src/infrastructure/services/indexService.js` sempre que um post é criado ou uma solução é
aceita/removida.

### Tratamento de erros do Prisma

O `errorHandler` converte códigos do Prisma em respostas HTTP:

| Código Prisma | Significado | HTTP |
| --- | --- | --- |
| `P2002` | Violação de unicidade (ex.: e-mail repetido) | 409 |
| `P2003` | Violação de chave estrangeira | 409 |
| `P2025` | Registro não encontrado | 404 |

## 7. Comandos úteis

```bash
# Subir banco + API
docker compose up --build -d

# Validar o schema
DATABASE_URL="postgresql://helpdesk:helpdesk@localhost:5432/helpdesk?schema=public" npx prisma validate

# Inspecionar os dados no navegador
DATABASE_URL="postgresql://helpdesk:helpdesk@localhost:5432/helpdesk?schema=public" npx prisma studio

# Ver se o schema diverge das migrações
npx prisma migrate diff --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma --shadow-database-url "$SHADOW_DATABASE_URL"

# Testes (unitários e de integração com Postgres)
npm test
npm run test:integration
```

## 8. Observações

- Quando o container do backend é recriado com `podman-compose`, pode ser necessário parar e remover
  o container antigo (`backend_backend_1`) antes de subir de novo; o volume do banco é preservado.
- O login é só por e-mail (sem senha) e é voltado à demonstração acadêmica; o token fica no banco
  apenas como hash.
- Evite editar migrações já aplicadas; crie uma nova migração para cada mudança no schema.
