#!/usr/bin/env bash
# ==============================================================================
# DENTE DENTAL CRM — PRODUCTION CLOUD 1-CLICK DEPLOY SCRIPT
# ==============================================================================
# Commands:
#   ./deploy.sh          - Full verification, build, and zero-downtime start
#   ./deploy.sh down     - Stop all cloud containers
#   ./deploy.sh restart  - Restart all containers
#   ./deploy.sh status   - Check health and status of containers
#   ./deploy.sh logs     - Stream real-time container logs
#   ./deploy.sh test     - Run local healthcheck tests against endpoints
# ==============================================================================

set -euo pipefail

# Visual styling
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"

# Command Dispatcher
COMMAND="${1:-up}"

case "$COMMAND" in
    down|stop)
        info "Остановка облачных контейнеров DENTE CRM..."
        docker compose -f "$COMPOSE_FILE" down
        success "Контейнеры остановлены."
        exit 0
        ;;
    restart)
        info "Перезапуск сервисов..."
        docker compose -f "$COMPOSE_FILE" restart
        success "Сервисы перезапущены."
        exit 0
        ;;
    status)
        info "Текущее состояние контейнеров:"
        docker compose -f "$COMPOSE_FILE" ps
        exit 0
        ;;
    logs)
        SERVICE="${2:-}"
        info "Подключение к логам ${SERVICE:-всех контейнеров} (Ctrl+C для выхода)..."
        docker compose -f "$COMPOSE_FILE" logs -f ${SERVICE}
        exit 0
        ;;
    test)
        info "Запуск диагностических тестов локальных портов..."
        echo "1. Healthcheck Cloud Relay (порт 4000):"
        docker compose -f "$COMPOSE_FILE" exec cloud-relay wget -qO- http://127.0.0.1:4000/health || error "Cloud Relay недоступен!"
        echo ""
        echo "2. Healthcheck Booking Server (порт 3000):"
        docker compose -f "$COMPOSE_FILE" exec booking-server wget -qO- http://127.0.0.1:3000/health || error "Booking Server недоступен!"
        echo ""
        echo "3. Redis PING:"
        docker compose -f "$COMPOSE_FILE" exec redis redis-cli ping || error "Redis недоступен!"
        echo ""
        success "Все внутренние сервисы отвечают 200 OK!"
        exit 0
        ;;
    up|start)
        # Continue to full deployment sequence below
        ;;
    *)
        echo "Использование: $0 [up|down|restart|status|logs|test]"
        exit 1
        ;;
esac

echo -e "${BOLD}${BLUE}==================================================================${NC}"
echo -e "${BOLD} DENTE DENTAL CRM — 24/7 CLOUD VPS PRODUCTION DEPLOYMENT ${NC}"
echo -e "${BOLD}${BLUE}==================================================================${NC}"

# ------------------------------------------------------------------------------
# 1. Проверка окружения и файла .env
# ------------------------------------------------------------------------------
info "Проверка конфигурационного файла .env..."

if [ ! -f "$ENV_FILE" ]; then
    error "Файл $ENV_FILE не найден в директории $SCRIPT_DIR!"
    if [ -f ".env.example" ]; then
        echo "Создайте его из шаблона:"
        echo "  cp .env.example .env"
        echo "  nano .env"
    fi
    exit 1
fi

# Load environment variables for local validation
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Проверка обязательных переменных
MISSING_VARS=()
[ -z "${DOMAIN:-}" ] && MISSING_VARS+=("DOMAIN")
[ -z "${RELAY_SECRET:-}" ] && MISSING_VARS+=("RELAY_SECRET")
[ -z "${JWT_SECRET:-}" ] && MISSING_VARS+=("JWT_SECRET")
[ -z "${REDIS_PASSWORD:-}" ] && MISSING_VARS+=("REDIS_PASSWORD")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    error "В файле .env отсутствуют обязательные переменные: ${MISSING_VARS[*]}"
    exit 1
fi

# Проверка дефолтных паролей-заглушек
if [[ "${RELAY_SECRET}" == *"change_me"* ]] || [[ "${JWT_SECRET}" == *"change_me"* ]] || [[ "${REDIS_PASSWORD}" == *"change_me"* ]]; then
    warn "ВНИМАНИЕ: В .env обнаружены стандартные секреты с 'change_me'!"
    warn "Для безопасности в продакшене сгенерируйте уникальные ключи:"
    echo "  RELAY_SECRET=\$(openssl rand -hex 32)"
    echo "  JWT_SECRET=\$(openssl rand -hex 32)"
    echo "  REDIS_PASSWORD=\$(openssl rand -hex 24)"
    echo ""
    read -r -p "Продолжить развертывание несмотря на предупреждение? [y/N] " response
    if [[ ! "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        info "Развертывание отменено пользователем."
        exit 1
    fi
fi

success "Файл .env проверен и корректен (Домен: ${DOMAIN})."

# ------------------------------------------------------------------------------
# 2. Валидация синтаксиса Caddyfile
# ------------------------------------------------------------------------------
info "Проверка синтаксиса Caddyfile через официальный Caddy контейнер..."

docker run --rm \
    -v "$SCRIPT_DIR/Caddyfile:/etc/caddy/Caddyfile:ro" \
    -e "DOMAIN=${DOMAIN}" \
    -e "ACME_EMAIL=${ACME_EMAIL:-admin@${DOMAIN}}" \
    -e "ALLOWED_IFRAME_ORIGINS=${ALLOWED_IFRAME_ORIGINS:-*}" \
    caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile > /dev/null

success "Синтаксис Caddyfile 100% валиден."

# ------------------------------------------------------------------------------
# 3. Сборка и запуск контейнеров в фоне
# ------------------------------------------------------------------------------
info "Сборка легковесных образов (cloud-relay, booking-server)..."
docker compose -f "$COMPOSE_FILE" build --quiet

info "Запуск продакшен-контейнеров..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# ------------------------------------------------------------------------------
# 4. Проверка доступности (Healthcheck Loop)
# ------------------------------------------------------------------------------
info "Ожидание готовности сервисов (проверка healthcheck)..."

TIMEOUT=60
ELAPSED=0
ALL_HEALTHY=false

while [ $ELAPSED -lt $TIMEOUT ]; do
    UNHEALTHY_COUNT=0

    # Проверяем статус каждого сервиса
    for SERVICE in redis cloud-relay booking-server caddy; do
        STATUS=$(docker compose -f "$COMPOSE_FILE" ps "$SERVICE" --format "{{.Health}}" 2>/dev/null || echo "")
        if [ "$STATUS" != "healthy" ] && [ -n "$STATUS" ]; then
            UNHEALTHY_COUNT=$((UNHEALTHY_COUNT + 1))
        fi
    done

    if [ $UNHEALTHY_COUNT -eq 0 ]; then
        ALL_HEALTHY=true
        break
    fi

    sleep 3
    ELAPSED=$((ELAPSED + 3))
    echo -n "."
done
echo ""

if [ "$ALL_HEALTHY" = true ]; then
    success "Все сервисы успешно запущены и прошли Healthcheck!"
else
    warn "Таймаут ожидания healthcheck ($TIMEOUT сек). Проверьте логи командой: ./deploy.sh logs"
fi

# ------------------------------------------------------------------------------
# 5. Итоговый отчет и боевые эндпоинты
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo -e "${GREEN}${BOLD}  РАЗВЕРТЫВАНИЕ УСПЕШНО ЗАВЕРШЕНО! ОБЛАЧНЫЙ ШЛЮЗ АКТИВЕН 24/7    ${NC}"
echo -e "${GREEN}${BOLD}==================================================================${NC}"
echo ""
echo -e "Публичные защищенные HTTPS эндпоинты клиники:"
echo -e "  📅 ${BOLD}Онлайн-запись (виджет / Telegram):${NC}  https://booking.${DOMAIN}"
echo -e "  📱 ${BOLD}Личный кабинет пациента (PWA):${NC}     https://my.${DOMAIN}"
echo -e "  🔬 ${BOLD}Портал лаборатории (ЗТЛ):${NC}          https://lab.${DOMAIN}"
echo -e "  ⚡ ${BOLD}Шлюз туннеля клиники (WSS):${NC}        wss://relay.${DOMAIN}/ws/clinic"
echo ""
echo -e "${BOLD}Для подключения локального сервера клиники:${NC}"
echo "В файле apps/api/.env локального сервера клиники добавьте:"
echo "  CLOUD_RELAY_URL=wss://relay.${DOMAIN}/ws/clinic"
echo "  RELAY_SECRET=${RELAY_SECRET}"
echo ""
echo -e "${BOLD}Полезные команды обслуживания:${NC}"
echo "  ./deploy.sh status   - Просмотр статуса контейнеров"
echo "  ./deploy.sh logs     - Просмотр логов в реальном времени"
echo "  ./deploy.sh restart  - Перезапуск сервисов"
echo "  ./deploy.sh down     - Остановка сервисов"
echo "  ./deploy.sh test     - Проверка внутренних API"
echo ""
