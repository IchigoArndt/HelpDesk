# Circuito — comunidade de hardware

Front-end responsivo do HelpDesk comunitário. HTML semântico, CSS e módulos JavaScript nativos, sem dependências de instalação. Requer Node.js 18 ou superior e o backend em execução (veja o [README principal](../README.md)).

## Executar

```sh
cd Backend && docker compose up --build -d --wait   # API em http://localhost:3000
cd ../Front
npm run dev
```

Abra http://localhost:5173. Para verificar a sintaxe e os testes de comportamento:

```sh
npm run check
```

Sem o backend, a interface mostra um aviso de erro com o botão "Tentar novamente"; não há dados simulados de reserva.

## O que já funciona

- Feed carregado da API, com busca sem distinção de acentos, filtros combinados por categoria/status e ordenação por data ou votos. A busca de 3 ou mais caracteres também consulta `/posts/search` (TF-IDF) e inclui publicações cuja **solução aceita** contém os termos.
- Cadastro dedicado em `/#register`, em duas etapas (identidade e interesses opcionais), com validação por campo e prévia do perfil. Cria o membro na API (`POST /members`). O login pelo modal usa só o e-mail (`POST /members/login`). **Não há senha.**
- Publicações com categoria, tags, texto com **negrito** e código inline, imagem com preview (até 2 MB), enviadas à API.
- Detalhes, respostas, votos reversíveis positivos/negativos e solução aceita pelo autor da publicação, todos persistidos. O voto é otimista e volta ao estado anterior se a API recusar (por exemplo, voto no próprio conteúdo).
- Itens salvos por membro (exigem entrar), perfis públicos com reputação calculada pela API, página de membros e base de conhecimento carregadas do backend.
- Notificações de resposta e de solução aceita, exibidas ao abrir o sino ou ao recarregar (não há tempo real).
- Estados de carregamento, erro e vazio, mensagens de validação, diálogos nativos com navegação por teclado, foco visível e suporte a movimento reduzido.
- Navegação adaptada a celular, tablet e desktop. A coluna de destaques é recolhida em telas menores.

## Arquitetura

```text
Front/
  index.html             # shell semântico e diálogo compartilhado
  server.js              # servidor estático e proxy de leitura/escrita para a API
  src/
    app.js               # componentes de renderização, estado e eventos
    api.js               # cliente da API, sessão (token) e tratamento de erros
    registration.js      # tela e comportamento do cadastro
    registration.css     # layout responsivo do cadastro
    data.js              # categorias, filtros, votos e conversão API -> interface
    styles.css           # identidade visual, componentes e breakpoints
  tests/domain.test.js   # filtros, votos, tempo relativo e conversão da API
```

O estado compartilhado é centralizado em `app.js`. Componentes como `postCard`, `avatar`, `profileContent` e `rightRail` reutilizam a mesma representação. As regras de seleção e votos são funções independentes em `data.js`. Todo conteúdo vindo da API (inclusive guias e mensagens) é escapado antes da renderização; apenas negrito e código inline são interpretados nas publicações.

## Proxy e sessão

O `server.js` encaminha para `http://localhost:3000` apenas rotas conhecidas (`health`, `stats`, `members`, `categories`, `articles`, `posts`, `votes`, `notifications`) e os métodos `GET`, `POST`, `PATCH` e `DELETE`, repassando o cabeçalho `Authorization` e limitando o corpo a 3,5 MB. Assim o front chama `/api/...` no mesmo domínio, sem liberar CORS no backend. A variável `API_URL` altera o destino e `PORT` altera a porta do front-end.

A sessão é um token opaco devolvido no cadastro/login e guardado em `localStorage` (`circuito-session`), junto do perfil. Se a API responder 401, o token é descartado e o usuário é avisado. Dados da versão demonstrativa antiga (`circuito-v1`) são removidos automaticamente.

## Limites desta versão

O acesso só exige nome e e-mail: não é autenticação forte, não há envio de e-mails, redefinição de senha nem tempo real. O feed carrega as 100 publicações mais recentes (os totais do painel vêm de `/stats`); a paginação completa e os anexos em armazenamento de arquivos ficam para uma próxima etapa. As imagens trafegam como data URL no JSON.

As fontes DM Sans e Manrope são carregadas do Google Fonts; sem acesso à internet, a interface usa a fonte sans-serif do sistema.
