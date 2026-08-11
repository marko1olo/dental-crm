# Локальная инфраструктура базы данных (PostgreSQL)

В этом документе задокументированы решения и архитектура локального окружения базы данных для Clinic MVP (DENTE). 

## 1. Портативный бинарник PostgreSQL
Локальная база данных работает из изолированной папки `C:\Clinic_MVP\dental-crm\.postgres`. 
- Это портативная сборка PostgreSQL 14.13 (от EnterpriseDB).
- **Пароль суперпользователя:** `dental`
- **Порт:** `5432`
- **Механизм аутентификации:** `scram-sha-256`

### Проблема загрузки бинарников
Изначально при скачивании `pg.zip` скриптом `Launcher.ps1` архив был повреждён (вероятно, из-за внезапной перезагрузки сервера). В результате не хватало директории `share`, и `initdb` падал с ошибками об отсутствующих файлах `timezone` и `postgres.bki`. 
**Решение:** Мы принудительно удалили битый `.postgres`, скачали архив размером 335 МБ заново и успешно выполнили `initdb`.

### Запуск демона
Windows убивает дочерние процессы при закрытии сессии терминала. Поэтому, если запустить `pg_ctl start` вручную и закрыть окно, процесс `postgres.exe` умрёт.
Для корректной работы в фоне базы запуск производился напрямую:
```powershell
.\.postgres\bin\postgres.exe -D .\.postgres\data
```

---

## 2. Проблема миграции (0040_exotic_monster_badoon.sql)
Оригинальная история миграций Drizzle оказалась сломана на шаге `0040`.

### Причины падения `npm run db:migrate`:
1. **Дублирование DDL-операций:** 
   Файл `0040` содержал `ALTER TYPE ADD VALUE` (например, `vk`, `max`, `transactional_reply`) и `CREATE TABLE` (например, `clinic_workflows`), которые **уже были добавлены** в более ранних ручных миграциях. Drizzle сгенерировал авто-миграцию так, как будто этих объектов не существовало в снапшотах.
2. **Отсутствие функции `uuidv7()`:**
   В `schema.ts` был прописан дефолт генерации ID через `uuidv7()`. В результате `0040` содержал `ALTER TABLE "..." ALTER COLUMN "id" SET DEFAULT uuidv7()`. Однако в PostgreSQL 14 нет встроенной функции `uuidv7()`, а её PL/pgSQL полифилл разработчики забыли добавить в ранние миграции.

### Внедрённое Решение (Drizzle-kit push bypass)
Попытки вырезать конфликты из `0040` были признаны нецелесообразными из-за гигантского объема дублирующего DDL (более 68 `CREATE TABLE`, что говорит о полной потере синхронизации снапшотов). 

Было принято следующее рабочее решение для инициализации пустой БД:
1. База `dental_crm` дропается и создаётся с нуля.
2. В чистую базу инжектится PL/pgSQL функция-полифилл для `uuidv7()` (см. ниже).
3. Используется команда `npx drizzle-kit push`, которая читает `schema.ts` и напрямую синхронизирует базу, игнорируя поломанную историю миграций.

---

## 3. Скрипт восстановления базы (Pollyfill uuidv7 + Push)
Для быстрого развёртывания базы данных на новом месте с обходом ошибки `0040` следует применять следующий SQL и скрипт:

**1. Подготовка `uuidv7()` (выполняется через psql перед Drizzle push):**
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
DECLARE
  v_time timestamp with time zone := clock_timestamp();
  v_unix_t bigint;
  v_bytes bytea;
BEGIN
  v_unix_t := extract(epoch FROM v_time) * 1000;
  v_bytes := decode(lpad(to_hex(v_unix_t), 12, '0'), 'hex') || gen_random_bytes(10);
  v_bytes := set_byte(v_bytes, 6, (get_byte(v_bytes, 6) & 15) | 112);
  v_bytes := set_byte(v_bytes, 8, (get_byte(v_bytes, 8) & 63) | 128);
  RETURN encode(v_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;
```

**2. Автоматизация развёртывания (PowerShell):**
```powershell
$env:PGPASSWORD="dental"

# Пересоздаем базу начисто
.\.postgres\bin\psql.exe -U dental -d postgres -c "DROP DATABASE IF EXISTS dental_crm;"
.\.postgres\bin\psql.exe -U dental -d postgres -c "CREATE DATABASE dental_crm;"

# Сохраняем полифилл uuidv7
$uuidv7 = @"
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS `$`$
DECLARE
  v_time timestamp with time zone := clock_timestamp();
  v_unix_t bigint;
  v_bytes bytea;
BEGIN
  v_unix_t := extract(epoch FROM v_time) * 1000;
  v_bytes := decode(lpad(to_hex(v_unix_t), 12, '0'), 'hex') || gen_random_bytes(10);
  v_bytes := set_byte(v_bytes, 6, (get_byte(v_bytes, 6) & 15) | 112);
  v_bytes := set_byte(v_bytes, 8, (get_byte(v_bytes, 8) & 63) | 128);
  RETURN encode(v_bytes, 'hex')::uuid;
END;
`$`$ LANGUAGE plpgsql VOLATILE;
"@
$uuidv7 | Out-File -FilePath uuidv7.sql -Encoding utf8

# Инжектим полифилл
.\.postgres\bin\psql.exe -U dental -d dental_crm -f uuidv7.sql

# Пушим актуальную схему
cd apps\api
npx drizzle-kit push
```
После этих шагов `npm run dev -w @dental/api` стартует без проблем.
