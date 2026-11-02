# Validação do HelpDesk — 02/11/2026

Execução local em Fedora Linux com Podman 5.8.7 (CLI `docker` emulada) e `podman-compose`, imagem Node.js 22, PostgreSQL 16.15, Node.js 22.23.1 no host, Prisma Client e CLI 5.22.0. Esta rodada valida o backend e o front-end **após a mudança de domínio** para a comunidade Circuito (a validação de 01/11, feita sobre o modelo de chamados, deixou de valer e foi substituída). Os comandos partem de `Backend/`, salvo indicação.

## Infraestrutura e banco

`docker compose up --build -d --wait --wait-timeout 240` subiu PostgreSQL e backend saudáveis. As portas 3000 e 5432 são publicadas apenas em 127.0.0.1. O banco persiste no volume `backend_helpdesk_pgdata`.

A migração `20261102000000_community_circuito` foi aplicada sobre um volume que ainda continha o modelo antigo (5000 chamados), com a saída "3 migrations found" e "All migrations have been successfully applied". Ela descarta as tabelas anteriores por desenho, e o seed repovoou o banco.

Seed: primeira execução `{"requested":5000,"inserted":5000,"curatedInserted":5,"seededPosts":5000,"durationMs":10951}`; execução seguinte `{"inserted":0,"curatedInserted":0,"seededPosts":5000,"durationMs":86}`, confirmando que é repetível. `docker compose exec backend npm run prisma:validate`: schema válido.

Observação de operação: ao reconstruir a imagem com `podman-compose`, o contêiner antigo do backend continuou ativo até ser removido manualmente (`docker stop` e `docker rm` do contêiner, mantendo o volume). O README descreve o procedimento.

## Testes automatizados

Executados no host (Node 22) contra o PostgreSQL do Compose:

```sh
npm test
TEST_DATABASE_URL=postgresql://helpdesk:helpdesk@localhost:5432/helpdesk npm run test:integration
cd ../Front && npm run check
```

Quatro testes unitários do backend passaram: normalização e pesos (título 3, tags 2, solução 2, descrição 1); validação de entradas (IDs, e-mail, tags, direção de voto, filtro de status, imagem data URL); consistência dos dados do protótipo; geração de 5000 registros com títulos distintos, categorias coerentes e uma solução aceita por publicação resolvida.

Sete cenários de integração passaram em schema temporário exclusivo (o runner reportou oito testes ao contar o teste pai), sem falhas nem ignorados:

1. Seed repetido preserva 1005 publicações, 25 membros, 7 categorias e 3 guias; `/stats` retorna 1005 publicações, 502 resolvidas e 5 membros (os membros de volume ficam fora da contagem).
2. Cadastro, login e logout; e-mail duplicado e dados inválidos recusados; token ausente ou inválido retorna 401; a listagem de membros não expõe e-mail nem membros de volume.
3. Publicar exige sessão; título curto, imagem inválida e categoria inexistente são rejeitados sem gravação parcial; a publicação criada é encontrada pela busca TF-IDF; `limit` e `q` inválidos retornam 400; filtros de status validados.
4. Resposta notifica o autor; apenas o autor aceita solução (403 para outro membro); aceitar torna a publicação encontrável pelas palavras da resposta e desmarcar remove essa ocorrência do índice; votos alternam, trocam de direção e retornam a zero; autovoto (403), alvo duplo ou inexistente e direção inválida são rejeitados.
5. Itens salvos são por membro; `saved=me` exige sessão; salvar é idempotente.
6. Uma falha de chave estrangeira após gravar e indexar desfaz a publicação e os termos novos.
7. JSON malformado retorna 400 e corpo acima de 3 MB retorna 413, com mensagem clara.

O preparo da suíte também aplicou as três migrações e executou `prisma migrate diff --exit-code` contra o schema, sem diferenças. O schema temporário foi removido ao término e o schema `public` permaneceu intacto.

Front-end: `npm run check` executou a verificação de sintaxe dos cinco módulos e sete testes (filtros combinados, votos, publicações próprias por ID, ampliação da busca com resultados da API, tempo relativo e conversão do formato da API), todos aprovados.

## Massa persistida e demonstração

`docker compose exec backend npm run demo` concluiu a prova de relações e o rollback intencional de publicação e índice, com as contagens abaixo. Os valores incluem duas publicações e dois membros criados durante o teste manual da interface.

| Modelo | Registros |
| --- | ---: |
| Member | 27 |
| Category | 7 |
| Article | 3 |
| Post | 5007 |
| Reply | 3338 |
| Tag | 30 |
| Term | 10131 |
| PostTerm | 176499 |

| Consulta | Resultados | Primeira execução (ms) | Mediana de 5 repetições (ms) |
| --- | ---: | ---: | ---: |
| placa video temperatura | 5 | 36,29 | 26,97 |
| ssd nvme bios | 5 | 31,14 | 28,15 |
| wifi desconecta notebook | 5 | 15,50 | 15,99 |
| memoria ram diagnostico | 5 | 20,21 | 18,82 |

São medições locais do repositório de busca, incluindo acesso ao PostgreSQL, sem o custo HTTP. Não representam teste de carga concorrente nem garantia para produção. Os tempos variam conforme hardware, cache e volume de dados.

## Teste manual da interface

Com backend e front-end ativos (`http://localhost:5173`), no navegador integrado do Cursor, conduzido por script no console da página:

- O feed carregou da API; o painel exibiu os totais reais (5.006 publicações, 2.502 resolvidas, 7 membros).
- Cadastro pela tela de duas etapas criou o membro e a sessão sobreviveu ao recarregar a página.
- Publicar pelo formulário criou a publicação, exibida no topo do feed com o autor da sessão.
- Voto positivo em publicação de outro membro passou de 24 para 25 e permaneceu marcado; salvar marcou o item; votar na própria publicação foi recusado, o placar voltou ao valor anterior e a interface mostrou "Você não pode votar no próprio conteúdo."
- Resposta enviada no detalhe foi gravada (contador passou para "1 resposta").
- Login pelo modal: e-mail inexistente exibiu o erro da API; e-mail válido entrou, o sino indicava notificação nova, o modal listou "respondeu à sua publicação" e o indicador sumiu ao abrir. O autor aceitou a solução e a publicação passou para "RESOLVIDO".
- Busca por "economia energia adaptador" (palavras presentes só na solução aceita) retornou 0 resultados no filtro local imediato e 7 após a consulta TF-IDF da API, com a publicação correta no topo.
- A página de membros listou os membros reais com reputação calculada; Camila, que teve uma resposta aceita, recebeu 15 pontos.

Não foram testados navegadores diferentes, telas pequenas nem carga concorrente. Os testes manuais deixaram dados de teste no banco local (membros "Teste E2E" e "Camila UI", duas publicações e uma resposta).

## Limites da entrega

A trilha demonstrada é A (Prisma), com busca TF-IDF adicional. O acesso é por nome e e-mail, sem senha: não há autenticação forte, envio de e-mails, tempo real, Elasticsearch ou RAG. O feed carrega as 100 publicações mais recentes. A auditoria contém apenas os prompts observados nesta conversa. A dupla deve complementar o histórico anterior de uso da IA com seus registros reais.
