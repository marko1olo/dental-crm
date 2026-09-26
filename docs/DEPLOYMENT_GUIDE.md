# Руководство по производственному развертыванию DENTE Dental CRM

Настоящее руководство определяет порядок производственной инсталляции, сетевой настройки, организации резервного копирования и аварийного восстановления системы DENTE Dental CRM в стоматологической практике.

---

## 1. Выбор топологии развертывания

Система поддерживает две основные модели развертывания в зависимости от масштаба организации, количества кресел и требований к суверенитету данных:

| Критерий | Автономный сервер в клинике (On-Premises) | Облачный VPS (Cloud Multi-Branch) |
| :--- | :--- | :--- |
| **Целевой сегмент** | Соло-врачи, кабинеты и клиники от 1 до 5 кресел | Сетевые стоматологические холдинги от 2+ филиалов |
| **Рекомендуемое аппаратное обеспечение** | Apple Mac mini (M2/M4) либо безвентиляторный мини-ПК Windows | Выделенный облачный VPS (4 vCPU, 8 GB RAM, NVMe) |
| **Автономия при обрыве интернета** | 100% функциональность (БД и Web работают локально) | Доступен только офлайн-буфер черновиков PWA |
| **Защита персональных данных (152-ФЗ)** | Данные физически не покидают периметр клиники | Требуется аттестация хостинга по требованиям УЗ-1 / УЗ-2 |
| **Подключение касс и датчиков RVG** | Прямое по USB и локальной сети (LAN TCP) | Через локальные агент-прокси в клинике |
| **Управление и сопровождение** | Автономная служба (LaunchAgent / Windows Service) | Контейнеризация Docker Compose + Caddy reverse proxy |

---

## 2. Локальный сервер клиники (On-Premises Edge)

Локальный сервер размещается в защищенном техническом помещении клиники либо непосредственно в зоне ресепшн.

### 2.1. Рекомендации к аппаратному обеспечению
- **Вариант Apple macOS (Рекомендуемый)**: Apple Mac mini (M2 / M4, 8–16 GB Unified Memory, 256–512 GB SSD). Обеспечивает бесшумную круглосуточную работу, минимальное энергопотребление (до 15–20 Вт) и максимальную надежность подсистемы ввода-вывода.
- **Вариант Windows**: Рабочая станция или мини-ПК (Intel Core i3/i5 12+ gen, AMD Ryzen 5, 8–16 GB RAM, SSD NVMe от 256 GB).
- **Источник бесперебойного питания (ИБП / UPS)**: Наличие линейно-интерактивного ИБП мощностью от 650 VA с USB-кабелем управления питанием является обязательным для предотвращения внезапных блэкаутов.

### 2.2. Сетевая инфраструктура клиники
1. **Маршрутизатор**: Клинический роутер (Keenetic, MikroTik) с поддержкой гигабитных портов Ethernet и двухдиапазонного Wi-Fi (5 GHz / 2.4 GHz).
2. **Сегментация сети**:
   - Рабочая подсеть (`VLAN 10` / `192.168.1.0/24`): сервер клиники, рабочие места врачей, планшеты у кресел, кассовые регистраторы, рентген-аппараты.
   - Гостевая подсеть (`Guest Wi-Fi` / `192.168.100.0/24`): изолированная сеть для пациентов без доступа к портам сервера DENTE.
3. **Статический IP сервера**: Закрепите постоянный IP-адрес сервера (например, `192.168.1.100`) через DHCP Reservation по MAC-адресу сетевой карты.
4. **mDNS / Локальный домен**: Включите на роутере поддержку multicast DNS (mDNS) для разрешения доменного имени `http://dente-clinic.local:4000`.

### 2.3. Пошаговая установка на macOS
```bash
# 1. Загрузка исходных текстов или дистрибутива
git clone https://github.com/marko1olo/dental-crm.git
cd dental-crm

# 2. Запуск автоматизированного установщика
bash installer/macos/install-macos.sh

# 3. Проверка состояния системной службы
./installer/macos/manage-macos.sh status

# 4. Проверка готовности сети и вывод QR-кода
npm run dente:info
```
Служба регистрируется в системе под манифестом `~/Library/LaunchAgents/com.dente.crm.plist` и запускается в фоне при старте macOS.

### 2.4. Пошаговая установка на Windows
1. Откройте консоль PowerShell от имени Администратора и настройте сетевой профиль:
   ```powershell
   powershell -ExecutionPolicy Bypass -File installer\windows\Setup-DenteLanNetwork.ps1
   ```
2. Запустите инсталлятор `DenteSetup.exe`.
3. После завершения мастера установки убедитесь, что системная служба запущена:
   ```cmd
   sc query DenteService
   ```
4. В системном трее рядом с часами появится значок DENTE Tray, отображающий зеленый статус доступности сервиса.

---

## 3. Облачный сервер (Docker Compose + Caddy Reverse Proxy)

Для сетевых клиник или удаленного доступа врачей развертывание выполняется на выделенном виртуальном сервере под управлением Ubuntu 22.04 / 24.04 LTS.

### 3.1. Структура `docker-compose.production.yml`
```yaml
version: "3.8"

services:
  postgres:
    image: postgres:18-alpine
    container_name: dente-postgres
    restart: always
    environment:
      POSTGRES_DB: dental_crm
      POSTGRES_USER: dental
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - dente_pgdata:/var/lib/postgresql/data
    networks:
      - dente_backend
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dental -d dental_crm"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: dente-api
    restart: always
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgres://dental:${POSTGRES_PASSWORD}@postgres:5432/dental_crm
      JWT_SECRET: ${JWT_SECRET}
      COOKIE_SECRET: ${COOKIE_SECRET}
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - dente_documents:/app/storage/documents
      - dente_attachments:/app/storage/attachments
    networks:
      - dente_backend
      - dente_frontend

  caddy:
    image: caddy:2-alpine
    container_name: dente-caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - dente_frontend

networks:
  dente_backend:
    internal: true
  dente_frontend:

volumes:
  dente_pgdata:
  dente_documents:
  dente_attachments:
  caddy_data:
  caddy_config:
```

### 3.2. Конфигурация Caddyfile с авто-SSL
```caddy
crm.yourclinic.ru {
    encode gzip zstd

    # Статический кэш для собранных бандлов
    @static {
        file
        path *.js *.css *.png *.svg *.ico *.woff2
    }
    header @static Cache-Control "public, max-age=31536000, immutable"

    # Защитные HTTP-заголовки
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Проксирование REST API и WebSocket
    reverse_proxy api:4000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

---

## 4. Подключение планшетов и мобильных устройств по Wi-Fi

DENTE поддерживает работу на мобильных планшетах врачей (iPad, Samsung Galaxy Tab) непосредственно у стоматологической установки.

### 4.1. Мгновенное подключение по QR-коду
1. Системный администратор или врач выполняет команду на сервере:
   ```bash
   npm run dente:info
   ```
2. В терминале отображается контрастный псевдографический QR-код.
3. Врач открывает приложение «Камера» на планшете, подключенном к клиническому Wi-Fi, и сканирует код.
4. Браузер моментально открывает рабочий терминал DENTE без ручного ввода цифр IP-адреса.

### 4.2. Настройка Safari на iPad (PWA Режим)
1. Откройте адрес `http://dente-clinic.local:4000` в браузере Safari.
2. Нажмите кнопку «Поделиться» (иконка со стрелкой вверх) в панели управления Safari.
3. Выберите пункт **«На экран "Домой"» (Add to Home Screen)**.
4. Нажмите «Добавить».
5. Приложение запустится в полноэкранном автономном режиме без адресной строки браузера.

### 4.3. Особенности мобильного WebKit и экранной клавиатуры
- Метатег `interactive-widget=resizes-content` в `index.html` гарантирует, что при вызове виртуальной клавиатуры iPadOS тулбар дневника приёма 043/у и кнопки быстрых клинических статусов не перекрываются клавиатурой.
- Для сенсорных экранов (`@media (pointer: coarse)`) все интерактивные элементы автоматически получают невидимый оверлей с минимальным размером хитбокса $\ge 44\times 44\text{ px}$, что обеспечивает надежное нажатие в медицинских перчатках.

---

## 5. Политика резервного копирования (Zero-Knowledge)

Медицинские и финансовые данные клиники должны быть защищены как от технического выхода накопителей из строя, так и от физической кражи оборудования.

### 5.1. Регламент создания снимков БД
1. **Периодичность**: Ежедневно в 23:00 после завершения клинической смены.
2. **Глубина архива (Retention Policy)**:
   - 7 ежедневных инкрементальных копий;
   - 4 еженедельных полных архива;
   - 12 ежемесячных архивных снимков (хранение 5 лет по закону об архивном хранении медицинских документов).

### 5.2. Скрипт создания зашифрованного резервного архива (`scripts/backup-encrypted.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${HOME}/Library/Application Support/DenteCRM/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_DUMP="/tmp/dente_dump_${TIMESTAMP}.sql.gz"
TARGET_ENC="${BACKUP_DIR}/dente_backup_${TIMESTAMP}.enc"
PASSPHRASE_FILE="/etc/dente_backup.key"

mkdir -p "${BACKUP_DIR}"

# 1. Дамп базы данных с компрессией gzip
pg_dump -h 127.0.0.1 -p 5432 -U dental -d dental_crm | gzip -9 > "${TEMP_DUMP}"

# 2. Асимметричное шифрование AES-256-CBC с солью
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${TEMP_DUMP}" -out "${TARGET_ENC}" \
  -pass file:"${PASSPHRASE_FILE}"

rm -f "${TEMP_DUMP}"

echo "[OK] Резервный зашифрованный архив успешно создан: ${TARGET_ENC}"

# 3. Синхронизация на подключенный внешний USB-накопитель (при наличии)
if [ -d "/Volumes/DENTE_BACKUP" ]; then
    rsync -avz "${TARGET_ENC}" "/Volumes/DENTE_BACKUP/"
    echo "[OK] Архив успешно продублирован на внешний USB-диск"
fi
```

### 5.3. Восстановление базы данных из резервной копии
```bash
# 1. Расшифровка архива
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "/path/to/dente_backup.enc" -out "/tmp/restore_dump.sql.gz" \
  -pass file:"/etc/dente_backup.key"

# 2. Развертывание в чистую базу данных
gunzip < "/tmp/restore_dump.sql.gz" | psql -h 127.0.0.1 -p 5432 -U dental -d dental_crm

rm -f "/tmp/restore_dump.sql.gz"
```

---

## 6. Протокол восстановления после блэкаутов (Blackout Recovery)

Внезапное отключение электроэнергии или аварийный перезапуск операционной системы не должны приводить к остановке клиники в начале рабочего дня.

### 6.1. Автоматический аудит `postmaster.pid`
При старте системы сценарии предварительной проверки (`db-preflight.sh` на macOS и `db-preflight.ps1` на Windows) выполняют следующий регламент:
1. Поиск файла блокировки в каталоге данных кластера PostgreSQL (`data/pg18/postmaster.pid`).
2. Чтение PID процесса из первой строки файла.
3. Проверка жизненного цикла процесса через таблицу процессов операционной системы:
   - Если процесс жив и является активным экземпляром PostgreSQL — запуск продолжается штатно.
   - Если процесса не существует (процесс погиб вместе с отключением питания) — lock-файл удаляется автоматически.
   - Если идентификатор PID был повторно выдан операционной системой другому процессу (Recycled PID) — скрипт сопоставляет имя исполняемого файла (`comm` / `ProcessName`). Если процесс не является `postgres`, lock-файл удаляется.

### 6.2. Целостность транзакций и WAL Replay
1. PostgreSQL 18 производит автоматический накат журналов упреждающей записи (Write-Ahead Logging / WAL Replay) при первом запуске после сбоя.
2. Неподтвержденные транзакции откатываются в безопасное состояние.
3. Врачебные черновики дневников приёма 043/у не теряются благодаря клиентскому debounced-хранилищу в LocalStorage браузера: при повторном открытии вкладки врач видит предложение восстановить несохраненный текст приёма.
4. При сбоях на этапе фискализации кассового чека 54-ФЗ система сверяет статус транзакции с очередью кассового шлюза (`fiscalReceiptQueueManager.ts`), исключая повторное фискальное списание или рассинхронизацию с ОФД.
