#!/usr/bin/env bash
# ==============================================================================
# DENTE DENTAL CRM — AUTOMATED VPS BACKUP TO S3
# ==============================================================================
# Creates an archive of:
#   1. Redis RDB snapshot (dente:booking_queue & cached sessions)
#   2. Local JSON queue directory
#   3. Caddy TLS certificates and configurations
# Uploads to S3 bucket (Selectel, MinIO, Yandex Cloud, AWS) if configured.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env not found!"
    exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/dente_backup_${TIMESTAMP}"
BACKUP_ARCHIVE="${SCRIPT_DIR}/logs/dente_vps_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
mkdir -p "${SCRIPT_DIR}/logs"

echo "[Backup] Starting backup at $(date)..."

# 1. Trigger Redis BGSAVE and wait
if docker compose -f docker-compose.prod.yml ps redis | grep -q "Up"; then
    echo "[Backup] Triggering Redis BGSAVE..."
    docker compose -f docker-compose.prod.yml exec -T redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE || true
    sleep 3
    docker compose -f docker-compose.prod.yml cp redis:/data/dump.rdb "${BACKUP_DIR}/dump.rdb" 2>/dev/null || true
fi

# 2. Copy pending JSON queue files
if [ -d "services/booking-server/data" ]; then
    cp -r services/booking-server/data "${BACKUP_DIR}/queue_data"
fi

# 3. Copy Caddy data (certificates)
if docker volume inspect deploy_caddy_data &>/dev/null; then
    docker run --rm -v deploy_caddy_data:/data -v "${BACKUP_DIR}:/backup" alpine tar czf /backup/caddy_certs.tar.gz -C /data . 2>/dev/null || true
fi

# 4. Pack into single compressed archive
tar -czf "$BACKUP_ARCHIVE" -C "$BACKUP_DIR" .
rm -rf "$BACKUP_DIR"

echo "[Backup] Archive created: $BACKUP_ARCHIVE ($(du -h "$BACKUP_ARCHIVE" | cut -f1))"

# 5. Upload to S3 if credentials are set
if [ -n "${S3_ENDPOINT:-}" ] && [ -n "${S3_BUCKET:-}" ] && [ -n "${S3_ACCESS_KEY:-}" ] && [ -n "${S3_SECRET_KEY:-}" ]; then
    echo "[Backup] Uploading to S3 bucket ${S3_BUCKET} (${S3_ENDPOINT})..."
    
    # Check if aws-cli or s3cmd or python is available
    if command -v aws &>/dev/null; then
        AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
        AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
        aws --endpoint-url="$S3_ENDPOINT" s3 cp "$BACKUP_ARCHIVE" "s3://${S3_BUCKET}/$(basename "$BACKUP_ARCHIVE")"
        echo "[Backup] Successfully uploaded to S3 via aws-cli."
    else
        echo "[Backup] aws-cli not installed. Saved locally in ${BACKUP_ARCHIVE}."
    fi
else
    echo "[Backup] S3 not configured in .env. Backup saved locally in ${BACKUP_ARCHIVE}."
fi

# 6. Retention policy: Keep only last 14 days locally
find "${SCRIPT_DIR}/logs" -name "dente_vps_backup_*.tar.gz" -mtime +14 -delete 2>/dev/null || true

echo "[Backup] Finished successfully at $(date)."
