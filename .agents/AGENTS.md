# AGENTS.md — Clinic MVP / DENTE Dental CRM

## КРИТИЧЕСКОЕ ПРАВИЛО: КОДИРОВКА ФАЙЛОВ (UTF-8)

### Проблема
В проекте была обнаружена эпидемия мождибаке — русский текст хранился в файлах в многократно перекодированном виде (UTF-8 байты прочитанные как CP1252, затем снова закодированные как UTF-8). Это давало мусор вроде `РљР°СЂРёРµСЃ` вместо `Кариес`.

### Правила для агента

1. **НИКОГДА не использовать PowerShell here-strings (`@'...'@`) для записи файлов с русским текстом.** PowerShell here-strings ломают кодировку. Исключение: только ASCII-контент.

2. **Для создания/перезаписи любого файла с русским текстом — использовать ТОЛЬКО `write_to_file` инструмент.** Он гарантированно пишет UTF-8 без BOM.

3. **НИКОГДА не использовать `node -e "..."` в командной строке для передачи русских строк.** Командная строка Windows ломает кодировку. Если нужен Node-скрипт с русским текстом — писать его через `write_to_file`, затем запускать через `node path/to/script.cjs`.

4. **Scratch-скрипты с русским текстом** писать в `<appDataDir>/brain/<conversation-id>/scratch/` через `write_to_file`.

5. **Проверка на мождибаке** — после любого массового изменения файлов запускать:
   ```js
   node -e "
   const fs=require('fs');
   const c=fs.readFileSync('path/to/file','utf8');
   const broken=c.split('\n').filter(l=>/[\u0420\u0421][\u0080-\u00FF]/.test(l));
   console.log('Broken:', broken.length);
   "
   ```
   Ноль — чисто. Больше нуля — файл нужно переписать через `write_to_file`.

6. **При обнаружении мождибаке** — не пытаться починить алгоритмически через PowerShell или `node -e`. Сразу переписывать файл целиком через `write_to_file` с правильными русскими строками.

### Признаки мождибаке
- `РљР°СЂРёРµСЃ` вместо `Кариес`
- `Р"РЅРµРІРЅРёРє` вместо `Дневник`  
- `2"`, `вЂ"`, `вЂ¦` вместо типографики
- `В«`, `В»` вместо `«`, `»`
- `РЎС‚РѕРјР°С‚РѕР»РѕРіРёСЏ` вместо `Стоматология`

## Структура проекта

- `apps/api/` — Fastify backend (TypeScript)
- `apps/web/` — React frontend (Vite + TypeScript)
- `apps/web/src/components/` — UI компоненты
- `apps/web/src/App.tsx` — главный компонент (монолит, ~2400 строк)
- `apps/api/src/db/schema.ts` — Drizzle ORM схема БД
- `apps/api/src/routes/` — API роуты

## Стек

- Frontend: React 18, TypeScript, Vite, Tailwind CSS
- Backend: Fastify, TypeScript, Drizzle ORM, PostgreSQL
- Auth: JWT + staff PIN
- Тесты: Playwright (headless Chromium)
