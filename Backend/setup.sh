#!/usr/bin/env bash
# =============================================================================
# setup.sh — Configuração inicial do HelpDesk no Fedora (Podman)
# =============================================================================
# Uso: bash setup.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERRO]${NC} $*"; exit 1; }

# ─────────────────────────────────────────────
# 1. Verificar dependências
# ─────────────────────────────────────────────
info "Verificando dependências..."

command -v node    >/dev/null 2>&1 || error "Node.js não encontrado. Instale: sudo dnf install nodejs"
command -v npm     >/dev/null 2>&1 || error "npm não encontrado."
command -v podman  >/dev/null 2>&1 || error "Podman não encontrado. Instale: sudo dnf install podman podman-compose"

NODE_VER=$(node -e "process.stdout.write(process.versions.node)")
MAJOR=${NODE_VER%%.*}
if [ "$MAJOR" -lt 22 ] || [ "$MAJOR" -gt 24 ]; then
  error "Node.js 22 a 24 é necessário (atual: $NODE_VER)."
fi

if ! command -v podman-compose >/dev/null 2>&1; then
  warn "podman-compose não encontrado. Instalando via pip..."
  pip install --user podman-compose || error "Falha ao instalar podman-compose. Tente: sudo dnf install podman-compose"
fi

info "Dependências OK (Node.js $NODE_VER, Podman $(podman --version | head -1))"

# ─────────────────────────────────────────────
# 2. Copiar .env
# ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  cp .env.example .env
  info ".env criado a partir do .env.example"
else
  warn ".env já existe — mantendo o arquivo atual"
fi

# ─────────────────────────────────────────────
# 3. Habilitar socket do Podman para usuário atual (rootless)
# ─────────────────────────────────────────────
info "Habilitando socket rootless do Podman..."
systemctl --user enable --now podman.socket 2>/dev/null || warn "Não foi possível habilitar podman.socket (pode já estar ativo)"

# ─────────────────────────────────────────────
# 4. Subir PostgreSQL
# ─────────────────────────────────────────────
info "Subindo PostgreSQL com podman-compose..."
podman-compose up -d

info "Aguardando o banco ficar pronto..."
for i in $(seq 1 20); do
  if podman exec helpdesk_db pg_isready -U helpdesk -d helpdesk -q 2>/dev/null; then
    info "PostgreSQL pronto!"
    break
  fi
  sleep 2
  if [ "$i" -eq 20 ]; then
    error "Timeout esperando o PostgreSQL. Verifique com: podman logs helpdesk_db"
  fi
done

# ─────────────────────────────────────────────
# 5. Instalar dependências Node
# ─────────────────────────────────────────────
info "Instalando dependências npm..."
npm ci

# ─────────────────────────────────────────────
# 6. Migration Prisma
# ─────────────────────────────────────────────
info "Rodando migration do Prisma..."
npm run prisma:deploy

# ─────────────────────────────────────────────
# 7. Gerar Prisma Client
# ─────────────────────────────────────────────
info "Gerando Prisma Client..."
npx prisma generate

# 8. Massa de dados para a apresentação
info "Populando dados e índice de busca..."
npm run seed

# ─────────────────────────────────────────────
# Pronto!
# ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN} HelpDesk configurado com sucesso!          ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo -e "  Iniciar servidor:   ${YELLOW}npm run dev${NC}"
echo -e "  Parar banco:        ${YELLOW}podman-compose down${NC}"
echo -e "  Logs do banco:      ${YELLOW}podman logs -f helpdesk_db${NC}"
echo -e "  API:                ${YELLOW}http://localhost:3000${NC}"
echo -e "  Health check:       ${YELLOW}curl http://localhost:3000/health${NC}"
echo ""
