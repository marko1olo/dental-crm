#!/usr/bin/env bash
# ==============================================================================
# DENTE DENTAL CRM — VPS AUTOMATED INITIAL SETUP
# ==============================================================================
# Target OS: Ubuntu 22.04 LTS / 24.04 LTS / Debian 11 / 12
# Installs: Docker Engine, Docker Compose Plugin, UFW Firewall (SSH, 80, 443)
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

# ------------------------------------------------------------------------------
# 4. Configure UFW Firewall (SSH Multi-Port Safe Detection + 80 + 443 TCP/UDP)
# ------------------------------------------------------------------------------
info "Настройка сетевого экрана UFW..."

# Сбор всех активных и сконфигурированных SSH-портов во избежание lockout
SSH_PORTS_TO_ALLOW=()

# 4.1. Проверка текущей активной SSH-сессии пользователя ($SSH_CONNECTION или $SSH_CLIENT)
if [ -n "${SSH_CONNECTION:-}" ]; then
    ACTIVE_PORT=$(echo "$SSH_CONNECTION" | awk '{print $3}')
    if [ -n "$ACTIVE_PORT" ]; then
        info "Обнаружен активный порт входящей SSH-сессии: ${ACTIVE_PORT}"
        SSH_PORTS_TO_ALLOW+=("$ACTIVE_PORT")
    fi
elif [ -n "${SSH_CLIENT:-}" ]; then
    ACTIVE_PORT=$(echo "$SSH_CLIENT" | awk '{print $3}')
    if [ -n "$ACTIVE_PORT" ]; then
        info "Обнаружен активный порт входящей SSH-сессии (SSH_CLIENT): ${ACTIVE_PORT}"
        SSH_PORTS_TO_ALLOW+=("$ACTIVE_PORT")
    fi
fi

# 4.2. Полная проверка рантайм-конфигурации sshd (учитывает Ubuntu 22/24 drop-in /etc/ssh/sshd_config.d/*.conf)
if command -v sshd &> /dev/null; then
    DETECTED_SSHD_PORTS=$(sshd -T 2>/dev/null | awk '$1=="port"{print $2}' || true)
    for p in $DETECTED_SSHD_PORTS; do
        if [ -n "$p" ]; then
            SSH_PORTS_TO_ALLOW+=("$p")
        fi
    done
fi

# 4.3. Резервный поиск в статических файлах конфигурации
if [ -f /etc/ssh/sshd_config ]; then
    STATIC_PORTS=$(grep -Ei "^\s*Port\s+[0-9]+" /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' || true)
    for p in $STATIC_PORTS; do
        [ -n "$p" ] && SSH_PORTS_TO_ALLOW+=("$p")
    done
fi

if [ -d /etc/ssh/sshd_config.d ]; then
    DROPIN_PORTS=$(grep -Eih "^\s*Port\s+[0-9]+" /etc/ssh/sshd_config.d/*.conf 2>/dev/null | awk '{print $2}' || true)
    for p in $DROPIN_PORTS; do
        [ -n "$p" ] && SSH_PORTS_TO_ALLOW+=("$p")
    done
fi

# Стандартный порт 22 как обязательный fallback
SSH_PORTS_TO_ALLOW+=("22")

# Дедупликация портов
mapfile -t UNIQUE_SSH_PORTS < <(printf "%s\n" "${SSH_PORTS_TO_ALLOW[@]}" | sort -u)

for port in "${UNIQUE_SSH_PORTS[@]}"; do
    info "Разрешаем SSH порт: ${port}/tcp (защита от локаута)..."
    ufw allow "${port}/tcp" comment "SSH Remote Management (Port ${port})"
done

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
success "Файрвол UFW настроен и включен (доступны SSH-порты: ${UNIQUE_SSH_PORTS[*]}, 80, 443 tcp/udp)."

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
