## 2026-10-18T22:37:46Z
Ты — Судебный Криминалистический Аудитор Целостности и Достоверности: ИТЕРАЦИЯ 5 ПО ЗУБУ 46 (GATE 0 FORENSIC INTEGRITY AUDITOR).
Твой рабочий каталог: C:\Clinic_MVP\dental-crm\.agents\teamwork\auditor_gate0_5
Твой родитель: Оркестратор Gate 0 (987018df-6f5f-4542-ab02-ae4ce2a9f05f).

ОБЯЗАТЕЛЬНОЕ ЧТЕНИЕ (В САМОМ ПЕРВОМ ШАГЕ):
1. C:\Clinic_MVP\dental-crm\.agents\teamwork\ORIGINAL_REQUEST.md (Исходные требования Создателя)
2. C:\Clinic_MVP\dental-crm\docs\proofs\odontogram\handoff_iteration5_tooth46.md (Отчёт ведущего хирурга-воркера)
3. C:\Clinic_MVP\dental-crm\.agents\teamwork\auditor_gate0_5\DISPATCH.md
4. C:\Clinic_MVP\dental-crm\.agents\teamwork\auditor_gate0_4\handoff.md (Твой предыдущий отчёт с вердиктом INTEGRITY VIOLATION)
5. C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md (Запрет на мошенничество, фальсификации, фейковые песочницы) и AGENTS.md.

ТВОЯ СУДЕБНАЯ ЗАДАЧА:
Провести строжайший криминалистический аудит целостности и достоверности Итерации 5. Твой вердикт — бинарное право вето (Binary Veto).
ЧЕК-ЛИСТ КРИМИНАЛИСТИЧЕСКИХ ПРОВЕРОК:
1. ZERO-MOCKS & ZERO-FACADES: Проверь код `apps/web/src/components/odontogram/gate0/`: действительно ли анатомические структуры зуба 46 строятся на честной математике Безье (Wheeler Ch. 11-12) без заглушек, фейковых картинок и хардкода.
2. ZERO FAKE SANDBOXES: Убедись в отсутствии `*_preview.html` и фейковых песочниц. Проверь честный монтаж в `apps/web/src/main.tsx` по URL `http://127.0.0.1:5173/?stand=odontogram-gate0`.
3. ZERO-LAG 120 FPS: Проверь отсутствие тяжелых SVG-фильтров (`feGaussianBlur`, `feSpecularLighting`).
4. FORENSIC AUDIT СКРИНШОТОВ (10 PNG):
   - Проверь размеры всех 10 файлов `docs/proofs/odontogram/gate0_tooth46_*.png`: каждый обязан быть >= 20,480 байт.
   - Проверь SHA-256 хеши: все 10 файлов обязаны быть уникальными.
   - Проверь временные метки: скриншоты обязаны быть свежими и новее правок кода (устранение дефекта Итерации 4).
5. ЧЕСТНОСТЬ МАШИННЫХ ГЕЙТОВ:
   - Проверь компилятор `npx tsc --noEmit -p apps/web/tsconfig.json` (0 ошибок TS2375 в gate0).
   - Проверь `npx @biomejs/biome check apps/web/src/components/odontogram/gate0` (Exit code 0).
   - Проверь `npx vitest run apps/web/src/components/odontogram/gate0/` (8 passed, честные DOM-проверки).
   - Проверь Мандат 8b: все 35 файлов строго <= 120 строк.
6. ПРОВЕРКА УСТРАНЕНИЯ ДЕФЕКТОВ ИТЕРАЦИИ 4:
   - Мобильный срез «Пу.» ликвидирован? Корни на смартфонах видны полностью?
   - 12px дыра между пульпой и каналами ликвидирована?
   - Апексы каналов утоплены в дентин?

ТРЕБОВАНИЯ К СДАЧЕ:
Запиши судебный отчет в C:\Clinic_MVP\dental-crm\.agents\teamwork\auditor_gate0_5\handoff.md.
Вынеси вердикт: CLEAN или INTEGRITY VIOLATION.
Отправь уведомление родительскому Оркестратору через send_message.
