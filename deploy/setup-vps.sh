#!/usr/bin/env bash
# ==============================================================================
# DENTE DENTAL CRM — VPS AUTOMATED INITIAL SETUP
# ==============================================================================
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS / Debian 11 / 12
# Installs: Docker Engine, Docker Compose Plugin, UFW Firewall (22, 80, 443)
# ==============================================================================

set -euo pipefail

# Visual formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# 1. Root privileges check
if [ "$(id -u)" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами root (или через sudo)."
    exit 1
fi

info "=================================================================="
info "Запуск первичной настройки VPS для DENTE Dental CRM (Cloud Pack)"
info "=================================================================="

export DEBIAN_FRONTEND=noninteractive

# 2. Update package cache & install basic tools
info "Обновление системных пакетов apt..."
apt-get update -y
apt-get install -y --no-install-recommends \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    wget \
    tar \
    gzip

success "Системные утилиты установлены."

# 3. Install Official Docker Engine & Docker Compose
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    success "Docker и Docker Compose уже установлены: $(docker --version), $(docker compose version)"
else
    info "Установка официального Docker Engine и Compose Plugin..."

    # Prepare keyring directory
    install -m 0755 -d /etc/apt/keyrings

    # Determine OS (Ubuntu or Debian)
    OS_ID=$(lsb_release -is | tr '[:upper:]' '[:lower:]')
    OS_CODENAME=$(lsb_release -cs)

    # Add Docker's official GPG key
    curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Set up the repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_ID} \
      ${OS_CODENAME} stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -y
    apt-get install -y --no-install-recommends \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin

    systemctl enable --now docker
    success "Docker успешно установлен и запущен."
fi

# 4. Configure UFW Firewall (Only 22, 80, 443 TCP/UDP)
info "Настройка сетевого экрана UFW..."

# Detect current SSH port from sshd_config or active connection
SSH_PORT=22
if [ -f /etc/ssh/sshd_config ]; then
    DETECTED_PORT=$(grep -E "^Port [0-9]+" /etc/ssh/sshd_config | awk '{print $2}' || true)
    if [ -n "$DETECTED_PORT" ]; then
        SSH_PORT="$DETECTED_PORT"
    fi
fi

info "Разрешаем SSH порт: ${SSH_PORT}/tcp..."
ufw allow "${SSH_PORT}/tcp" comment "SSH Remote Management"

info "Разрешаем HTTP порт: 80/tcp (Let's Encrypt ACME & HTTP redirect)..."
ufw allow 80/tcp comment "HTTP Port 80"

info "Разрешаем HTTPS порт: 443/tcp (TLS Traffic)..."
ufw allow 443/tcp comment "HTTPS Port 443"

info "Разрешаем HTTP/3 QUIC порт: 443/udp (Modern Web Performance)..."
ufw allow 443/udp comment "HTTP3 QUIC Port 443"

# Default rules: deny incoming, allow outgoing
ufw default deny incoming
ufw default allow outgoing

# Enable UFW non-interactively
info "Активация UFW..."
ufw --force enable
success "Файрвол UFW настроен и включен (доступны порты: ${SSH_PORT}, 80, 443 tcp/udp)."

# 5. Create runtime folders & fix permissions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

info "Создание директорий для данных и логов..."
mkdir -p logs
mkdir -p services/booking-server/data

chmod +x deploy.sh || true
chmod +x setup-vps.sh || true
chmod +x backup-s3.sh || true 2>/dev/null || true

success "=================================================================="
success "Базовая настройка VPS завершена успешно!"
success "=================================================================="
echo ""
echo "Следующие шаги:"
echo "1. Скопируйте шаблон переменных окружения: cp .env.example .env"
echo "2. Откройте .env и укажите ваш DOMAIN и пароли: nano .env"
echo "3. Запустите развертывание одной командой: ./deploy.sh"
echo ""
