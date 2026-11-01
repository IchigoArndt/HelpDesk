# Validação do HelpDesk — 01/11/2026

Execução local no Windows, com Rancher Desktop/Docker Engine 29.1.3, Compose 5.0.1, imagem Node.js 22 e PostgreSQL 16. Prisma Client e CLI 5.22.0. Os comandos abaixo partem de `Backend/`.

## Infraestrutura e banco

`docker compose up --build -d --wait --wait-timeout 240` terminou com os serviços backend e postgres saudáveis. As portas 3000 e 5432 são publicadas apenas em 127.0.0.1. O banco persiste no volume `backend_helpdesk_pgdata` neste ambiente. Dependências instaladas pelo lockfile, client gerado e duas migrações aplicadas.

`docker compose exec backend npm run prisma:validate`: schema válido.

## Testes

```sh
docker compose exec backend npm test
docker compose run --rm -e TEST_DATABASE_URL=postgresql://helpdesk:helpdesk@postgres:5432/helpdesk backend npm run test:integration
```

Três testes unitários passaram: normalização e pesos; validação de entrada; geração de 5000 registros com identidades, relações e soluções coerentes.

Quatro cenários de integração passaram, em schema temporário exclusivo:

1. Seed repetido preserva 1000 chamados, 20 autores, cinco produtos, cinco artigos e suas relações.
2. API persiste o status RESOLVIDO, retorna autor e substitui os termos antigos após alteração do título.
3. Referências inválidas retornam erro sem deixar chamados ou alterações parciais; limite de busca inválido é rejeitado.
4. Uma falha de chave estrangeira após gravação e indexação desfaz o chamado e os termos novos.

O runner reportou cinco testes de integração ao contar o teste pai junto dos quatro cenários. Não houve falhas nem testes ignorados. O preparo da suíte também aplicou as migrações e executou `prisma migrate diff` contra o schema, sem diferenças. O schema temporário foi removido ao término.

## Massa persistida e demonstração

`docker compose exec backend npm run demo` concluiu a prova de relações e o rollback intencional de chamado/índice, com as seguintes contagens:

| Modelo | Registros |
| --- | ---: |
| Author | 20 |
| Category | 5 |
| Product | 5 |
| Article | 5 |
| Ticket | 5000 |
| Term | 9972 |
| TicketTerm | 141401 |

A consulta SQL `SELECT COUNT(*) FROM "Ticket";` confirmou os 5000 chamados após os testes. Os dados do schema public não foram apagados pela integração.

| Consulta | Resultados | Primeira execução (ms) | Mediana de 5 repetições (ms) |
| --- | ---: | ---: | ---: |
| impressora pdf | 5 | 98,90 | 62,81 |
| senha conta bloqueada | 5 | 100,77 | 95,80 |
| rede wifi | 5 | 108,37 | 82,29 |
| notebook superaquecimento | 5 | 91,29 | 67,31 |

São medições locais do repositório de busca, incluindo acesso ao PostgreSQL, sem o custo HTTP. Não representam teste de carga concorrente nem garantia para produção. Os tempos variam conforme hardware, cache e volume de dados.

## Limites da entrega

A trilha demonstrada é A (Prisma), com busca TF-IDF adicional. O frontend permanece demonstrativo e local, conforme seu README; não há alegação de autenticação real, integração multiusuário, Elasticsearch ou RAG. A auditoria contém apenas os prompts observados nesta conversa. A dupla deve complementar o histórico anterior de uso da IA com seus registros reais.
