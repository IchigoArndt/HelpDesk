# Publicar Circuito (Railway + Vercel)

API + PostgreSQL no **Railway**; interface no **Vercel**. O navegador fala com o Vercel em `/api/...`; o `vercel.json` reescreve essas rotas para `Front/api/_proxy.js`, que encaminha para a API no Railway (sem Next.js o Vercel não aceita catch-all `[...path]`).

```text
Você  →  Vercel (front)  →  Railway (API)  →  Postgres
```

Faça **nesta ordem**: primeiro Railway (pegue a URL da API), depois Vercel (cole essa URL em `API_URL`).

---

## 0. Antes de começar

1. Conta no [GitHub](https://github.com) com este repositório **já enviado** (`git push`), incluindo as pastas `Backend/` e `Front/`.
2. Conta no [Railway](https://railway.app) (pode entrar com GitHub).
3. Conta no [Vercel](https://vercel.com) (pode entrar com GitHub).
4. Plano gratuito basta para a demonstração; no Railway pode pedir cartão em alguns planos — confira o que a conta free exige no momento.

---

## 1. Railway — banco PostgreSQL

1. Acesse [railway.app](https://railway.app) e faça login.
2. **New Project**.
3. Escolha **Provision PostgreSQL** (ou **Add PostgreSQL**).
4. Aguarde o banco ficar **Online**.
5. (Opcional) Renomeie o projeto para algo como `circuito` / `helpdesk`.

Não copie a `DATABASE_URL` manualmente ainda: o Railway injeta essa variável ao vincular o serviço da API.

---

## 2. Railway — API (Backend)

1. No mesmo projeto, clique **New** → **GitHub Repo** (autorize o Railway se pedir).
2. Selecione o repositório **HelpDesk** (ou o nome do seu fork).
3. Abra o serviço criado (ainda sem root certo, ajuste abaixo).
4. Em **Settings** do serviço:
   - **Root Directory:** `Backend`  
     (só a pasta do backend; o `Dockerfile` e o `railway.toml` ficam aí)
   - **Builder:** deve usar Docker (`Dockerfile`). Com `railway.toml` isso já vem definido.
5. Em **Variables** (ou **Settings → Variables**):
   - Clique em **Add Reference** / **Variable** → referencie a variável `DATABASE_URL` do serviço Postgres  
     **ou** use **Connect** / **Attach** o Postgres a este serviço (o Railway cria `DATABASE_URL` sozinho).
   - Confirme que existe `DATABASE_URL` apontando para o Postgres do projeto.
   - (Opcional por enquanto) `ALLOWED_ORIGINS` — preencha depois, com a URL do Vercel.
6. Em **Settings → Networking** (ou **Public Networking**):
   - **Generate Domain** (domínio público `*.up.railway.app`).
7. Dispare o deploy (**Deploy** / push no GitHub se o deploy automático estiver ligado).
8. Abra **Deployments** → último deploy → **View Logs**.
   - Na **primeira** subida o container roda `prisma migrate deploy` e o **seed** (milhares de publicações) — pode levar **vários minutos**.
   - Espere aparecer algo como `Circuito Backend rodando em http://localhost:…` e o healthcheck passar.
9. Copie a URL pública, **sem barra no final**, por exemplo:

   `https://helpdesk-backend-production-xxxx.up.railway.app`

10. Teste no navegador ou no terminal:

    `https://SUA-URL.up.railway.app/health`

    Resposta esperada:

    ```json
    { "status": "ok" }
    ```

Se `/health` falhar: veja os logs (erro de `DATABASE_URL`, migração ou seed ainda em andamento). Espere o seed terminar antes de concluir que quebrou.

---

## 3. Vercel — front (Circuito)

1. Acesse [vercel.com](https://vercel.com) e faça login (GitHub).
2. **Add New…** → **Project**.
3. Importe o **mesmo** repositório do HelpDesk.
4. Em **Configure Project**:
   - **Framework Preset:** `Other`
   - **Root Directory:** clique em **Edit** e escolha `Front`  
     (não deixe a raiz do monorepo)
   - **Build Command:** apague / deixe vazio (não há build)
   - **Output Directory:** deixe vazio / padrão
   - **Install Command:** pode deixar vazio (o front não tem dependências npm obrigatórias para o estático)
5. Em **Environment Variables**, adicione:

   | Name     | Value                                              | Environment      |
   | -------- | -------------------------------------------------- | ---------------- |
   | `API_URL`| URL do Railway do passo 2.9, **sem** `/` no final | Production (e Preview, se quiser) |

   Exemplo: `https://helpdesk-backend-production-xxxx.up.railway.app`

6. Clique **Deploy** e aguarde concluir.
7. Copie a URL do front, por exemplo:

   `https://helpdesk-xxxx.vercel.app`

---

## 4. Ligar os dois lados (CORS opcional)

O fluxo principal **não precisa de CORS**: o navegador chama só o Vercel; o proxy serverless chama o Railway.

Ainda assim, recomendo no Railway (serviço da API → **Variables**):

| Name              | Value                         |
| ----------------- | ----------------------------- |
| `ALLOWED_ORIGINS` | `https://helpdesk-xxxx.vercel.app` |

Se usar domínio customizado no Vercel, coloque essa URL. Várias origens: separe por vírgula.

Depois de salvar a variável, o Railway redeploya sozinho (ou force um **Redeploy**).

No Vercel, se mudar `API_URL`, faça **Redeploy** do front para a função serverless pegar o valor novo.

---

## 5. Conferir se está publicado

1. Abra a URL do **Vercel** no navegador.
2. A home do Circuito deve carregar o feed (dados do seed).
3. Cadastre um membro (nome + e-mail) e entre.
4. Publique uma dúvida curta e confira se aparece.
5. Teste a busca com um termo de hardware (ex. `ssd`).

Checklist rápido:

| Teste | Onde | OK se |
| --- | --- | --- |
| Saúde da API | `…railway.app/health` | `{ "status": "ok" }` |
| Front abre | URL Vercel | Layout Circuito, sem tela só de erro |
| Proxy | DevTools → Network → `/api/stats` ou `/api/posts` | Status 200 |
| Sessão | Cadastro / login | Token e perfil funcionando |

---

## 6. Problemas comuns

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| Front: “Não foi possível falar com o servidor” | `API_URL` ausente/errada no Vercel | Corrija a variável (sem `/` no fim) e **Redeploy** |
| `/api/...` → 502 com “API_URL não configurada” | Variável não chegou no deploy | Confirme `API_URL` em Production e redeploy |
| Railway: deploy vermelho / healthcheck | Seed ainda rodando ou `DATABASE_URL` sem vínculo | Logs; confirme Postgres ligado ao serviço; espere até ~5 min na 1ª vez |
| API `/health` ok, front vazio/erro | Root Directory do Vercel não é `Front` | Settings do projeto Vercel → Root Directory = `Front` |
| CORS no browser apontando para Railway | Front chamando a API direto | No arranjo atual deve chamar só `/api` no Vercel; confira `api.js` |
| Mudou código e não atualizou | Deploy automático desligado | Push na branch conectada ou Redeploy manual |

---

## 7. Atualizar depois de mudar o código

1. `git push` para a branch ligada ao Railway e ao Vercel (em geral `main`).
2. Os dois devem redeployar sozinhos.
3. Se só mudou variável de ambiente: **Redeploy** no painel correspondente.

---

## Desenvolvimento local (não muda)

```sh
# Backend + Postgres
cd Backend
docker compose up --build -d --wait --wait-timeout 240

# Front (outro terminal)
cd Front
npm run dev
```

- Interface: http://localhost:5173  
- API: http://localhost:3000/health  

Localmente o proxy é o `server.js`. No Vercel, o proxy é `Front/api/_proxy.js` (via rewrite).
