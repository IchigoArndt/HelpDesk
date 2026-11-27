# Evolução do Projeto — Melhorias e Correções (Fase 2)

Este documento registra o levantamento técnico, as correções e as melhorias implementadas no **HelpDesk / Circuito** após o feedback da disciplina (entrega prevista em **07/12/2026**), detalhando **o porquê** de cada mudança e **sob quais circunstâncias** ela foi necessária.

---

## Resumo das melhorias

| Frente | Circunstância / Problema encontrado | Solução implementada | Arquivos principais |
| --- | --- | --- | --- |
| **1. Consultas e índices no PostgreSQL** | Busca TF-IDF trafegava milhares de postings para o Node.js; faltavam índices de ordenação/status no feed; ranking de membros agregava dados dos 20 usuários fictícios de volume | Agregação TF-IDF via CTE SQL diretamente no PostgreSQL; nova migração com 3 índices compostos em `Post`; filtragem de `statsFor(memberIds)` | `Backend/prisma/schema.prisma`, `Backend/prisma/migrations/20261127000000_query_performance_indexes/migration.sql`, `Backend/src/infrastructure/repositories/postRepository.js`, `Backend/src/infrastructure/repositories/memberRepository.js` |
| **2. Paginação real e correção da busca TF-IDF no front** | Front-end carregava só `limit=100` e filtrava em memória; resultados antigos retornados pela busca TF-IDF eram descartados se não estivessem nos 100 iniciais | Filtro `category` (por nome) e cabeçalho `X-Total-Count` em `GET /posts`; repasse nos proxies; paginação (`limit=20` + "Carregar mais"); `mergePosts` exibindo os hits do TF-IDF em ordem de relevância | `Backend/src/application/use-cases/postUseCases.js`, `Backend/src/presentation/controllers/postController.js`, `Backend/src/presentation/middlewares/cors.js`, `Front/server.js`, `Front/api/proxy.js`, `Front/src/api.js`, `Front/src/data.js`, `Front/src/app.js` |
| **3. Fluxo de perfil, notificações e criação de posts** | Notificações de posts antigos falhavam ao abrir; rota `PATCH /members/me` já existia no backend sem UI; perfil só via posts do lote atual; formulário não reaproveitava categoria filtrada | `detail(id)` consulta `GET /posts/:id` sob demanda; modal "Editar perfil" integrado a `PATCH /members/me`; histórico do perfil carregado via `authorId`; pré-seleção de categoria no modal de publicação | `Front/src/api.js`, `Front/src/app.js`, `Front/src/styles.css` |

---

## Detalhamento técnico (Por quê e sob quais circunstâncias)

### 1. Otimização da busca TF-IDF e das consultas no PostgreSQL

- **Circunstâncias e problema observado:**
  Após popular o banco com mais de **5.000 publicações** e **176.000 registros** em `PostTerm`, identificamos três gargalos nas consultas do backend:
  1. Em `postRepository.search()`, toda busca por palavras frequentes de hardware (como `placa`, `video`, `ssd`, `memoria`) buscava no PostgreSQL **todas** as linhas correspondentes em `PostTerm`, transferia milhares de objetos para o Node.js, disparava uma segunda query `WHERE id IN (...)` com milhares de IDs apenas para ler `createdAt`, ordenava tudo em memória e só então fazia a terceira query para buscar os `limit` posts finais.
  2. Na tabela `Post`, os índices existentes cobriam `[categoryId, status, createdAt]` e `[score]`, mas não havia índices alinhados às consultas reais do feed geral (`ORDER BY createdAt DESC, id DESC`), de filtro por status (`WHERE status = ... ORDER BY createdAt DESC, id DESC`) e de ordenação popular (`ORDER BY score DESC, createdAt DESC, id DESC`).
  3. Em `memberRepository.findAll()`, `statsFor()` era chamado sem filtro de IDs, executando três `groupBy` sobre todos os autores da base — incluindo os 20 membros fictícios da massa (`@massa.circuito.example`) que concentram 5.000 publicações e mais de 3.300 respostas — apenas para descartar esses totais logo em seguida.

- **Por que fizemos e o que mudou:**
  - Reescrevemos `postRepository.search()` para executar o cálculo completo do TF-IDF (`df`, `idf = ln((N+1)/(df+1)) + 1`, `SUM(tf * idf)`, ordenação e `LIMIT`) diretamente no PostgreSQL com uma CTE parametrizada via `$queryRaw`, trafegando para o Node.js apenas os IDs e scores dos `limit` vencedores antes da hidratação final.
  - Criamos a migração `20261127000000_query_performance_indexes` adicionando os três índices compostos correspondentes em `Post`.
  - Passamos `members.map((m) => m.id)` para `statsFor()` em `memberRepository.findAll()`, restringindo o `groupBy` aos membros reais exibidos pela comunidade.

---

### 2. Correção do bug na busca TF-IDF e paginação integrada ao banco

- **Circunstâncias e problema observado:**
  Ao revisar a integração entre `Front/src/app.js` e a API sobre a massa de 5.000+ publicações, detectamos duas falhas importantes de fluxo e consistência:
  1. **Descarte de resultados antigos na busca TF-IDF:** `refreshPosts()` carregava apenas as 100 publicações mais recentes. Quando o usuário pesquisava um termo presente em uma publicação mais antiga (fora das 100 iniciais), o endpoint `/posts/search` encontrava corretamente no PostgreSQL e devolvia o objeto completo `hit.post`. Porém, `app.js` descartava `hit.post`, guardava só o `id` em `state.searchIds` e chamava `filterPosts(state.posts, ...)`. Como o `id` não estava nos 100 posts em memória, o resultado simplesmente não aparecia na interface.
  2. **Filtros e ordenação presos aos 100 primeiros registros:** Filtrar por categoria, status (`Em aberto`, `Resolvidas`, `Sem resposta`), ordenar por `Mais votadas` ou abrir `Itens salvos` filtrava apenas os 100 posts carregados no boot — deixando cerca de 4.900 registros do banco inacessíveis na interface e sem paginação.

- **Por que fizemos e o que mudou:**
  - Adicionamos suporte ao filtro por nome de categoria (`?category=...`) em `GET /posts`, mantendo compatibilidade total com `categoryId`.
  - Passamos a devolver o total filtrado no cabeçalho HTTP `X-Total-Count` (exposto em `cors.js` e repassado pelos proxies `Front/server.js` e `Front/api/proxy.js`), preservando o formato de array JSON da rota `/posts` para não quebrar clientes ou testes existentes.
  - No front-end, mudamos o carregamento inicial para páginas de `20` publicações consultando diretamente a API conforme categoria, status, ordenação e aba selecionada, com botão **"Carregar mais"** e contador `"Exibindo X de Y publicações"`.
  - Criamos o utilitário `mergePosts` em `Front/src/data.js` e ajustamos `postsContent()` para incorporar os objetos retornados por `/posts/search` na listagem exibida, preservando o ranking de relevância TF-IDF no topo.

---

### 3. Menos cliques e fluxos completos no perfil, notificações e publicação

- **Circunstâncias e problema observado:**
  1. Clicar em **"Ver conversa"** dentro de uma notificação cuja publicação não estivesse na página atual do feed chamava `detail(id)`, que dependia exclusivamente de `byId(id)` em memória e falhava silenciosamente.
  2. O backend já implementava `PATCH /members/me` para atualizar nome, nível de experiência e interesses, mas o front-end não disponibilizava essa funcionalidade nem buscava no banco as publicações do autor ao abrir um perfil.
  3. Ao navegar por uma categoria específica (ex.: `Redes`) e clicar em **Nova publicação**, o usuário precisava selecionar novamente a categoria no modal.

- **Por que fizemos e o que mudou:**
  - `detail(id)` agora busca `GET /posts/:id` na API quando a publicação ainda não está em memória, garantindo abertura confiável a partir de notificações ou buscas.
  - Adicionamos `api.updateMe` e o modal **"Editar perfil"** na página de perfil, além da carga das publicações do membro por `authorId` diretamente da API.
  - O modal de criação de publicação pré-seleciona automaticamente a categoria ativa no filtro do feed.

---

## Organização em Git e próximos passos da dupla (até 07/12/2026)

Seguindo a orientação do professor para registrar cada melhoria/correção em commits específicos e garantir a participação de ambos os integrantes da dupla:

- **Participação da integrante Flávia (`FAR_MelhoriasFase2`):**
  - Levantamento das melhorias, otimização de consultas/índices, correção do fluxo de busca/paginação/notificações/perfil e documentação da evolução.
- **Próximos passos sugeridos para o integrante Felipe (`IchigoArndt`) em sua própria branch/PR antes de 07/12:**
  1. Subir o ambiente Docker (`cd Backend && docker compose up --build -d --wait`) e aplicar a nova migração `20261127000000_query_performance_indexes`.
  2. Rodar `npm run test:integration`, `npm run demo` (registrando os novos tempos médios de busca TF-IDF diretamente no PostgreSQL) e atualizar `VALIDACAO.md` com os resultados reais da execução com PostgreSQL ativo.
  3. Validar a interface completa no navegador (`http://localhost:5173`) — paginação "Carregar mais", busca TF-IDF encontrando publicações antigas e edição de perfil — e fazer o merge/redeploy no Railway + Vercel.
