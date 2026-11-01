# Auditoria de uso da IA — HelpDesk

## Escopo e procedência

Ferramenta: assistente Codex. Etapas desta conversa: 30/10/2026 e 01/11/2026. O PDF de diretrizes foi usado como referência; os prompts exemplares do PDF não foram registrados como se tivessem sido executados pela dupla.

Este registro cobre os pedidos observados nesta conversa. Prompts usados na criação anterior do projeto e adaptações humanas anteriores devem ser complementados pela dupla a partir dos registros reais. Não foram inventados prompts, testes, autoria ou contribuições humanas.

## Pedidos efetivamente recebidos

1. “Valide se o helpDesk tem as infomrações que esta sendo pedido nesse trabalho” — análise de aderência às diretrizes, schema, backend, documentação e Git.
2. “tirando a parte do docker, de resto pode ajustar tudo” — autorização inicial para corrigir backend e documentação, preservando Docker.
3. “na real faz tudo , coloca o docker e pode fazer tudo, depois pode subir pro Github” — autorização em 01/11 para completar infraestrutura, validação real e publicação no GitHub.

## Intervenções da IA

- Identificação da Trilha A (Prisma ORM avançado) e documentação de relações, chave composta, unicidade, integridade referencial e transações.
- Correção do status informado na criação de chamados; validações de IDs, textos, referências e limites de busca.
- Validação de referências dentro da transação e atualização atômica do índice.
- Indexação em lote e consulta TF-IDF com carregamento completo apenas dos resultados selecionados.
- Seeder determinístico com 20 autores, cinco categorias, cinco produtos, cinco artigos e 5000 chamados por padrão, repetível sequencialmente e sem limpeza de dados existentes.
- Demonstração de relações, rollback e medição de quatro consultas com primeira execução e mediana de cinco repetições.
- Dockerfile com Node 22, instalação pelo lockfile, geração do Prisma Client e processo da aplicação como usuário node.
- Compose com PostgreSQL 16, persistência em volume, verificação de saúde e inicialização do backend após o banco, seguida de migrações e seed.
- Migração gerada com `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, separada em estrutura inicial e índices de consulta.
- Testes unitários e integração com PostgreSQL real em schema temporário exclusivo; comparação entre migrações aplicadas e schema Prisma.
- Atualização do README com execução por Docker, comandos npm, testes, limites do frontend e roteiro de apresentação.

## Recuperação dos arquivos da entrega

Em 01/11, o commit local `7ecdcd1` continha modificações em arquivos já versionados, mas os novos arquivos referenciados por essas mudanças não estavam presentes: validação compartilhada, seed, testes, demonstração, migrações SQL e esta auditoria. Esses arquivos foram restaurados e incluídos na entrega. Pastas de migração vazias causaram falhas iniciais de bootstrap e foram corrigidas antes da validação final.

## Adaptações humanas

Nenhuma edição manual da dupla foi relatada durante esta execução. O assistente realizou as mudanças sob autorização do usuário. O Git já continha commits de Flavia Andrade Ribeiro e IchigoArndt; a autoria histórica foi preservada. A dupla deve documentar revisões e adaptações humanas efetivamente realizadas após esta etapa.

## Validação

Na etapa de 30/10, não havia PostgreSQL local acessível e a instalação no Windows foi bloqueada. Em 01/11, a autorização para incluir Docker permitiu instalar as dependências na imagem e executar o backend com PostgreSQL real, sem depender da instalação npm no Windows.

Os resultados finais da validação desta etapa são registrados abaixo após a execução. O teste de integração cria e remove somente um schema aleatório `helpdesk_test_...`; a massa de demonstração em public permanece intacta. Tempos de busca são medições locais e não representam garantia de desempenho em produção.

### Resultado em 01/11/2026

- Build Docker concluído com instalação das 73 dependências do lockfile e geração do Prisma Client 5.22.0.
- `docker compose up --build -d --wait --wait-timeout 240`: backend e PostgreSQL saudáveis.
- `npm run prisma:validate`: schema válido.
- `npm test`: três testes unitários passaram.
- `npm run test:integration`: quatro cenários de integração passaram; o runner reportou cinco testes contando o teste pai. Incluiu aplicação das duas migrações e comparação com o schema Prisma sem diferenças.
- Demonstração de relações e rollback concluída; consulta SQL confirmou 5000 chamados no schema da aplicação.
- Medianas de busca: impressora/pdf 62,81 ms; senha/conta/bloqueada 95,80 ms; rede/wifi 82,29 ms; notebook/superaquecimento 67,31 ms. Cada mediana corresponde a cinco repetições após a primeira consulta, neste ambiente local.
- O schema de integração foi removido ao término; os 5000 chamados da demonstração foram preservados.

O detalhamento reproduzível está em [VALIDACAO.md](VALIDACAO.md). O envio usa a branch existente `FAR_NovosAjustes`; não houve alteração da main nem reescrita do histórico.
