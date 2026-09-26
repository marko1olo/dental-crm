# DENTE Dental CRM — Windows Local Deployment & Windows Service Architecture

## 📋 Обзор дистрибутива Windows

Данный пакет предназначен для автономного локального развертывания **DENTE Dental CRM** в стоматологической клинике (соло-врач, кабинет на 1-2 кресла, клиника на 1-3 кресла).

Комплект обеспечивает:
1. **Автономность в Session 0**: Fastify API и PostgreSQL 18 работают как единая системная служба Windows Service под учетной записью `LocalSystem`. Служба запускается **до входа пользователя в Windows** и не падает при выходе из учетной записи пользователя или блокировке экрана (`Win+L`).
2. **Аварийное восстановление (Blackout Crash Recovery)**: При внезапном отключении электричества, скачке напряжения или BSOD скрипт `db-preflight.ps1` проверяет наличие `postmaster.pid`. Если процесса с этим PID нет или это не `postgres.exe` (recycled PID) — мертвый lock-файл безопасно удаляется до старта сервера.
3. **Разрешение конфликта портов (1C:Enterprise / 1С:Предприятие)**: Если порт 5432 занят сторонней службой (например, сервером баз данных 1С), скрипт автоматически переключает конфигурацию DENTE на порт **5438** (`D-E-N-T-E`) и обновляет `dente.env` и `postgresql.conf`.
4. **Сетевая адаптация и брандмауэр**: Скрипт `Setup-DenteLanNetwork.ps1` переключает профиль активного адаптера клиники из `Public` в `Private` и открывает правила Windows Defender Firewall для портов **TCP 4000** (Web / API), **TCP 4100** (WebSocket Broker), **UDP 5353** (mDNS discovery) и **UDP 4101** (LAN beacon).

---

## 🗂️ Структура пакета `installer/windows/`

| Файл | Описание |
| :--- | :--- |
| `DenteSetup.iss` | Полный сценарий сборщика **Inno Setup 6** для сборки `DenteSetup.exe`. Создает папки, настраивает сеть, выполняет preflight, регистрирует и запускает службу. |
| `DenteService.xml` | Дескриптор службы **WinSW v3.0 x64**: Session 0, запуск Fastify API под `LocalSystem`, авто-рестарт при сбоях (progressive backoff 5s / 15s / 30s), ротация журналов по 10 МБ. |
| `db-preflight.ps1` | Скрипт предстартовой проверки PostgreSQL 18: очистка мертвого `postmaster.pid` после блэкаутов, обнаружение конфликта порта 5432 и переключение на 5438, инициализация кластера `initdb`. |
| `Setup-DenteLanNetwork.ps1` | Конфигурация локальной сети клиники: перевод сетевого профиля из Public в Private, создание правил Windows Defender Firewall (4000, 4100, 5353, 4101). |
| `service-bootstrap.mjs` | Node.js оркестратор службы: выполняет preflight, загружает `dente.env`, запускает Fastify API и отдает собранный SPA веб-клиент. |
| `service-runner.cmd` | Пакетный файл прямого запуска службы для отладки и ручного запуска. |
| `open-dente.cmd` | Ярлык быстрого открытия веб-интерфейса `http://localhost:4000` в браузере по умолчанию. |
| `manage-service.cmd` | Интерактивная консоль администратора клиники (статус службы, старт, стоп, рестарт, просмотр логов). |
| `DenteTray.ps1` | Фоновый индикатор системного трея Windows: периодический опрос здоровья сервера, всплывающие уведомления, контекстное меню быстрого доступа. |
| `DenteTray.vbs` | Невидимый лаунчер трея без всплывающего окна командной строки при входе в Windows. |
| `build-installer.ps1` | Скрипт автоматизированной компиляции инсталлятора через Inno Setup 6 (`ISCC.exe`). |

---

## 🏛️ Размещение данных в ОС Windows

- **Программные бинарники**: `C:\Program Files\DenteCRM` (или `C:\Program Files (x86)\DenteCRM`)
  - `bin\node\` — портативный Node.js LTS
  - `bin\postgres\` — портативный PostgreSQL 18
  - `bin\winsw\` — `DenteService.exe` + `DenteService.xml`
  - `server\` — скомпилированный бэкенд Fastify API (`dist/`)
  - `web\` — собранный SPA интерфейс React 19 (`dist/`)
  - `scripts\` — служебные сценарии управления и восстановления
- **Медицинские и финансовые данные (Persistent Data)**: `C:\ProgramData\DenteCRM`
  - `data\pg18\` — кластер базы данных PostgreSQL 18
  - `data\storage\documents\` — сформированные PDF медкарты 043/у, согласия ИДС, акты
  - `data\storage\attachments\` — рентгеновские снимки визиографа, фотографии, КТ DICOM
  - `data\backups\` — автоматические ежедневные резервные копии БД
  - `logs\` — журналы службы WinSW, сервера Fastify и базы данных
  - `dente.env` — файл переменных окружения клиники

> **Безопасность медицинских данных при деинсталляции**: При удалении программы через панель управления деинсталлятор Inno Setup в явном виде запрашивает подтверждение сохранения данных (`ProgramData\DenteCRM\data`), предотвращая случайную потерю медицинских карт пациентов.

---

## 🚀 Сборка дистрибутива `DenteSetup.exe`

1. Соберите артефакты проекта:
   ```powershell
   npm run build
   ```
2. Запустите скрипт сборки инсталлятора:
   ```powershell
   powershell -ExecutionPolicy Bypass -File installer\windows\build-installer.ps1
   ```
3. Готовый установщик сохраняется в:
   `dist\installer\DenteSetup.exe`
