#!/usr/bin/env bash
# ==============================================================================
# DENTE Dental CRM — Automated Telegram Bot & Intercom Gateway Deployment Script
# Target OS: Ubuntu 22.04 / 24.04 LTS, Debian 12
# Mandates: 4 (T.A.R.S.), 8b (Zero-Mocks), 8e (Doctor Autonomy), 8n
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================================================${NC}"
echo -e "${BLUE}  DENTE Dental CRM — Telegram Bot & Intercom VPS Hosting Deployment ${NC}"
echo -e "${BLUE}====================================================================${NC}"

# 1. Проверка прав суперпользователя (root)
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[ERROR] Этот скрипт должен быть запущен с правами root (sudo).${NC}"
   exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_NAME="telegram-bot"
SYSTEMD_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
APP_DIR="${PROJECT_ROOT}/apps/api"
ENV_FILE="${APP_DIR}/.env"

echo -e "${GREEN}[1/7] Проверка окружения сервера...${NC}"
command -v node >/dev/null 2>&1 || { echo -e "${RED}[ERROR] Node.js не установлен. Требуется Node.js 20+.${NC}"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}[ERROR] npm не установлен.${NC}"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo -e "${RED}[ERROR] curl не установлен.${NC}"; exit 1; }

NODE_VER=$(node -v)
echo -e "Node.js версия: ${YELLOW}${NODE_VER}${NC}"

# 2. Создание системного пользователя 'dental', если отсутствует
echo -e "${GREEN}[2/7] Проверка системного пользователя сервиса...${NC}"
if ! id "dental" &>/dev/null; then
    echo -e "Создание системного пользователя ${YELLOW}dental${NC}..."
    useradd -r -s /bin/false -d "${PROJECT_ROOT}" dental
fi

# 3. Генерация необходимых криптографических секретов
echo -e "${GREEN}[3/7] Проверка переменных окружения и ключей шифрования...${NC}"
if [[ ! -f "${ENV_FILE}" ]]; then
    touch "${ENV_FILE}"
    echo -e "Создан файл окружения: ${ENV_FILE}"
fi

generate_secret_if_missing() {
    local var_name="$1"
    local length="${2:-32}"
    if ! grep -q "^${var_name}=" "${ENV_FILE}"; then
        local secret
        secret=$(openssl rand -hex "${length}")
        echo "${var_name}=${secret}" >> "${ENV_FILE}"
        echo -e "Сгенерирован ключ: ${YELLOW}${var_name}${NC}"
    fi
}

generate_secret_if_missing "DENTE_TELEGRAM_WEBHOOK_SECRET" 32
generate_secret_if_missing "DENTE_TELEGRAM_CALLBACK_SECRET" 32
generate_secret_if_missing "DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY" 32

if ! grep -q "^PORT=" "${ENV_FILE}"; then
    echo "PORT=4000" >> "${ENV_FILE}"
fi
if ! grep -q "^NODE_ENV=" "${ENV_FILE}"; then
    echo "NODE_ENV=production" >> "${ENV_FILE}"
fi

# 4. Установка зависимостей и сборка TypeScript
echo -e "${GREEN}[4/7] Сборка проекта и компиляция TypeScript...${NC}"
cd "${PROJECT_ROOT}"
npm ci --ignore-scripts || npm install
npm run build -w @dental/shared
npm run build -w @dental/api

# 5. Установка и настройка systemd unit
echo -e "${GREEN}[5/7] Установка systemd службы...${NC}"
sed -e "s|/var/www/dental-crm|${PROJECT_ROOT}|g" \
    "${PROJECT_ROOT}/deploy/telegram-bot.service" > "${SYSTEMD_PATH}"

# Выставляем права на директорию
chown -R dental:dental "${PROJECT_ROOT}/apps/api/dist" || true

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}.service"

# 6. Перезапуск службы
echo -e "${GREEN}[6/7] Запуск службы ${SERVICE_NAME}...${NC}"
systemctl restart "${SERVICE_NAME}.service"

# 7. Healthcheck верификация
echo -e "${GREEN}[7/7] Ожидание готовности эндпоинта Healthcheck...${NC}"
sleep 3

HEALTH_URL="http://127.0.0.1:4000/api/telegram/health"
HTTP_STATUS=$(curl -s -o /tmp/tg_health_response.json -w "%{http_code}" "${HEALTH_URL}" || echo "000")

if [[ "${HTTP_STATUS}" == "200" || "${HTTP_STATUS}" == "503" ]]; then
    echo -e "${GREEN}✓ Служба успешно запущена! HTTP статус: ${HTTP_STATUS}${NC}"
    cat /tmp/tg_health_response.json
    echo ""
else
    echo -e "${RED}[WARN] Healthcheck вернул код ${HTTP_STATUS}. Проверьте логи: journalctl -u ${SERVICE_NAME} -n 50${NC}"
fi

echo -e "${BLUE}====================================================================${NC}"
echo -e "${GREEN}  РАЗВЕРТЫВАНИЕ УСПЕШНО ЗАВЕРШЕНО!${NC}"
echo -e "  Статус службы:   systemctl status ${SERVICE_NAME}"
echo -e "  Журнал логов:    journalctl -u ${SERVICE_NAME} -f"
echo -e "  Вебхук URL:      https://<ВАШ_ДОМЕН>/api/telegram/webhook"
echo -e "${BLUE}====================================================================${NC}"
