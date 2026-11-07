# Publicar Circuito (Railway + Vercel)

API + PostgreSQL no **Railway**; interface no **Vercel**. O front continua chamando `/api/...`; no Vercel a pasta `Front/api` faz o proxy para a URL da API.

## 1. Railway (API + Postgres)

1. Crie um projeto em [railway.app](https://railway.app) e adicione um banco **PostgreSQL**.
2. Adicione um serviço a partir deste repositório:
   - **Root Directory:** `Backend`
   - O `Dockerfile` e o `railway.toml` já estão em `Backend/`
3. Vincule o Postgres ao serviço da API (variável `DATABASE_URL` injetada automaticamente).
4. Variáveis opcionais no serviço da API:

| Variável | Valor |
| --- | --- |
| `ALLOWED_ORIGINS` | URL do front, ex. `https://seu-app.vercel.app` (vírgula se houver várias) |

5. Faça o deploy e abra a URL pública do serviço (ex. `https://….up.railway.app`).
6. Confira: `GET https://….up.railway.app/health` → `{ "status": "ok" }`.

Na primeira subida o contêiner aplica migrações e roda o seed (pode levar alguns minutos). O healthcheck em `/health` espera até 5 minutos.

## 2. Vercel (front)

1. Importe o mesmo repositório em [vercel.com](https://vercel.com).
2. Configure o projeto:
   - **Root Directory:** `Front`
   - Framework Preset: Other
   - Build Command: deixe vazio
   - Output Directory: deixe vazio (arquivos estáticos na raiz do Front)
3. Em **Environment Variables**, defina:

| Variável | Valor |
| --- | --- |
| `API_URL` | URL pública da API no Railway, **sem** barra no final (ex. `https://….up.railway.app`) |

4. Deploy. A interface fica em `https://seu-app.vercel.app`.

## 3. Conferência

1. Abra o front na Vercel — o feed deve carregar.
2. Cadastre um membro e publique uma dúvida.
3. Se a API responder e o front mostrar erro de rede, confira se `API_URL` no Vercel está correta e redeploy.

## Desenvolvimento local

Não muda: `docker compose` no Backend + `npm run dev` no Front (proxy do `server.js` para `localhost:3000`).
