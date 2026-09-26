# DENTE Dental CRM — macOS Local Deployment & LaunchAgent Architecture

## 📋 Обзор дистрибутива macOS

Данный пакет предназначен для автономного развертывания **DENTE Dental CRM** на компьютерах **Apple Mac** (MacBook Air/Pro, Mac mini в роли сервера клиники, iMac на ресепшн или у кресла врача).

Пакет полностью поддерживает:
- **Apple Silicon (M1, M2, M3, M4)** нативно через `arm64` и Homebrew в `/opt/homebrew`
- **Intel x86_64** через `/usr/local`
- **macOS 12+** (Monterey, Ventura, Sonoma, Sequoia)

---

## 🏛️ Ключевые архитектурные решения

### 1. Фоновая служба `launchd` (LaunchAgent `com.dente.crm`)
В отличие от самодельных скриптов в фоне, DENTE регистрируется как нативный LaunchAgent macOS:
- Автоматический старт при входе пользователя (`RunAtLoad = true`).
- Самовосстановление при сбоях (`KeepAlive` с защитой от циклического перезапуска `ThrottleInterval = 5`).
- Корректная выгрузка и управление через `launchctl bootstrap` / `launchctl bootout`.
- Раздельные журналы в `~/Library/Logs/DenteCRM/service.log` и `service-error.log`.

### 2. Аварийное восстановление после блэкаутов (Blackout Crash Recovery)
При внезапном отключении электричества, разрядке аккумулятора MacBook или перезагрузке Mac скрипт `db-preflight.sh`:
- Находит оставшийся `postmaster.pid`.
- Проверяет по таблице процессов macOS (`ps -p`), жив ли процесс с этим PID.
- Если процесса нет или PID переиспользован посторонним приложением (recycled PID) — мертвый lock-файл безопасно удаляется, исключая ошибку `lock file "postmaster.pid" already exists`.

### 3. Автоматическое разрешение конфликта портов (Port Collision Switch)
Если порт **5432** занят другим приложением (например, запущен `Postgres.app`, Docker, системный PostgreSQL или сервер 1С):
- Preflight обнаруживает занятость порта внешним процессом.
- Автоматически переключает PostgreSQL DENTE на выделенный порт **5438** (`D-E-N-T-E`).
- Обновляет `postgresql.conf` и файл переменных окружения `dente.env` (`DATABASE_URL=postgres://dental:dental@127.0.0.1:5438/dental_crm`).

### 4. Автономия врача и защита данных (Мандат 8e / Doctor Autonomy)
При удалении через `uninstall-macos.sh` система **автоматически создает резервную копию** всех медицинских карт 043/у, счетов и базы данных в архив на Рабочем столе (`~/Desktop/DenteCRM_Backup_<timestamp>.tar.gz`) перед любыми операциями очистки.

---

## 🗂️ Структура пакета `installer/macos/`

| Файл | Описание |
| :--- | :--- |
| `install-macos.sh` | 1-клик POSIX/bash установщик: аудит Mac, проверка Node.js LTS (>=20) и PostgreSQL (16-18), инициализация БД, регистрация LaunchAgent. |
| `com.dente.crm.plist` | Нативный launchd манифест LaunchAgent для macOS. |
| `db-preflight.sh` | Предстартовый аудит PostgreSQL: очистка мертвого `postmaster.pid`, переключение 5432 -> 5438 при конфликтах, `initdb` и создание роли/БД. |
| `service-runner.sh` | Загрузчик службы под launchd: установка путей Homebrew, вызов preflight и запуск Node.js. |
| `service-bootstrap.mjs` | Node.js оркестратор: запуск Fastify API и раздача собранного React 19 SPA на порту 4000. |
| `manage-macos.sh` | Интерактивная консоль управления: `status`, `start`, `stop`, `restart`, `logs`, `doctor`. |
| `Dente.command` | Исполняемый ярлык для двойного клика из Finder/Desktop: запускает сервер при необходимости и открывает браузер Safari/Chrome. |
| `uninstall-macos.sh` | Безопасная деинсталляция: остановка службы, выгрузка из launchctl, автоматический бэкап данных на Desktop. |

---

## 📂 Размещение файлов в macOS

Следуя стандартам Apple macOS Filesystem Hierarchy:
- **Пользовательские данные и база**: `~/Library/Application Support/DenteCRM/`
  - `data/pg18/` — кластер базы данных PostgreSQL
  - `data/storage/documents/` — сохраненные карты 043/у, согласия ИДС, акты
  - `data/storage/attachments/` — рентгеновские снимки, визиограф, фотопротоколы
  - `backups/` — автоматические резервные копии
  - `dente.env` — конфигурация окружения
- **Журналы**: `~/Library/Logs/DenteCRM/`
  - `service.log` — стандартный вывод сервера
  - `service-error.log` — ошибки службы
  - `db-preflight.log` — журнал предстартового аудита БД
  - `postgres.log` — журнал СУБД PostgreSQL
- **Автозапуск launchd**: `~/Library/LaunchAgents/com.dente.crm.plist`

---

## 🚀 Установка и запуск

### Быстрая установка (1 клик):
```bash
bash installer/macos/install-macos.sh
```

### Запуск интерфейса:
- Двойной клик на **`Dente CRM.command`** на Рабочем столе (или `installer/macos/Dente.command`).
- Либо откройте в браузере: **`http://localhost:4000`**

### Управление службой через терминал:
```bash
./installer/macos/manage-macos.sh status    # Проверить статус БД, Web и launchd
./installer/macos/manage-macos.sh start     # Запустить сервисы
./installer/macos/manage-macos.sh stop      # Остановить сервисы
./installer/macos/manage-macos.sh restart   # Перезапустить
./installer/macos/manage-macos.sh logs      # Смотреть логи в реальном времени
./installer/macos/manage-macos.sh doctor    # Диагностика окружения Mac
```

### Безопасное удаление:
```bash
bash installer/macos/uninstall-macos.sh
```
Архив с базой данных пациентов будет сохранен на вашем Рабочем столе.
