# Circuito — comunidade de hardware

Front-end responsivo do HelpDesk. HTML semântico, CSS e módulos JavaScript nativos, sem dependências de instalação. Requer Node.js 18 ou superior.

## Executar

```sh
cd Front
npm run dev
```

Abra http://localhost:5173. Para verificar a sintaxe e os testes de comportamento:

```sh
npm run check
```

## O que já funciona

- Feed com busca sem distinção de acentos, filtros combinados por categoria/status e ordenação por data ou votos.
- Perfil demonstrativo por nome/e-mail, páginas de contribuições próprias, membros e itens salvos.
- Cadastro dedicado em `/#register`, dividido em duas etapas: identidade e interesses opcionais. Inclui indicador de progresso, prévia do nome/avatar, validação por campo, contagem de interesses e navegação de volta preservando o preenchimento. É possível pular a personalização. Os dados continuam locais, sem senha ou autenticação real.
- Publicações com categoria, tags, texto com **negrito** e código inline, imagem com preview, limite de 2 MB e remoção do anexo.
- Detalhes, respostas, votos reversíveis positivos/negativos e solução aceita pelo autor da publicação.
- Perfis públicos com histórico de perguntas, respostas e conquistas por contribuição.
- Base de conhecimento e central de boas-vindas.
- Persistência local, estados vazios, mensagens de validação, diálogos nativos com navegação por teclado, foco visível e suporte a movimento reduzido.
- Navegação adaptada a celular, tablet e desktop. A coluna de destaques é recolhida em telas menores.

## Arquitetura

```text
Front/
  index.html             # shell semântico e diálogo compartilhado
  server.js              # servidor HTTP local e proxy de leitura opcional
  src/
    app.js               # componentes de renderização, estado e eventos
    registration.js      # tela e comportamento do cadastro
    registration.css     # layout responsivo do cadastro
    data.js              # dados de demonstração e regras de filtro/voto
    styles.css           # identidade visual, componentes e breakpoints
  tests/domain.test.js   # filtros combinados, ordenação e transições de votos
```

O estado compartilhado é centralizado em `app.js`. Componentes como `postCard`, `avatar`, `profileContent` e `rightRail` reutilizam a mesma representação. As regras de seleção e votos são funções independentes em `data.js`. O conteúdo fornecido por usuários é escapado antes da renderização; apenas negrito e código inline são interpretados.

## Limites desta versão e API

Esta é uma implementação **demonstrativa local**. Não há autenticação real, envio de e-mails, upload para servidor, notificações em tempo real ou sincronização entre usuários/dispositivos. Os formulários de entrada e cadastro criam apenas uma identidade local e não recebem senhas. Nome/e-mail não comprovam identidade. O armazenamento do navegador conserva as interações; se indisponível ou cheio, a interface avisa que os dados durarão apenas na sessão.

O backend atual possui autores, categorias, produtos, artigos e chamados, mas ainda não possui usuários autenticados, respostas, votos, favoritos e notificações. Por isso o front-end não mistura dados reais e simulados nem grava na API existente.

O servidor disponibiliza um proxy de leitura em `/api/tickets`, `/api/tickets/search`, `/api/categories`, `/api/authors`, `/api/articles` e `/api/health`, encaminhando para `http://localhost:3000`. Ele **ainda não é consumido pela interface**. A variável de ambiente `API_URL` altera o destino, e `PORT` altera a porta do front-end. Esse proxy permite uma integração posterior no mesmo domínio sem liberar CORS globalmente no backend.

Para a versão multiusuário, é necessário implementar no backend sessões seguras, autorização por ID, relações de respostas/votos/favoritos, armazenamento de anexos e eventos de notificação. A busca real deve consumir `/api/tickets/search?q=...` para preservar o ranking TF-IDF existente.

As fontes DM Sans e Manrope são carregadas do Google Fonts; sem acesso à internet, a interface usa a fonte sans-serif do sistema.
