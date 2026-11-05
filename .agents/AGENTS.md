# AGENTS.md — Clinic MVP / DENTE Dental CRM (.agents Router)

> 🏛️ **SSOT & CANONICAL ARCHITECTURE ROUTER:**  
> Все 33 мандата, Definition of Done и операционные стандарты зафиксированы в корневом [`GEMINI.md`](file:///C:/Clinic_MVP/dental-crm/GEMINI.md).  
> Высшая Конституция проекта (CTO Supremacy): [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md).  
> Полная навигация по доменным спецификациям: [`.agents/INDEX.md`](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md).

---

## 🚨 ПРОТОКОЛ ЗАЗЕМЛЕНИЯ (ЗАКОН №0):
1. **Холодный старт и Шаг 1 нового субагента:** Обязательный вызов `read_file` на [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) и профильный доменный стандарт (`read_file` чанками по 800 строк от начала до конца). Запрещено писать код вслепую или по 20-строчным обрывкам!
2. **Рабочий ход внутри активной сессии (In-Flight):** Правила уже в памяти. Читаем JIT целевые файлы и спецификации.
3. **Модификация файлов проекта:** Целевой файл перед редактированием читается **ПОЛНОСТЬЮ** через `read_file`. Запрещены слепые патчи вслепую.
4. `git status` и `git diff --stat` — обязательная проверка физического состояния диска перед любой мутацией.
5. **Динамическое со-развитие спецификаций и кода (Мандат 8az):** Нашел проблему $\to$ зафиксировал в реестре $\to$ изучил через `read_file` $\to$ исправил в коде $\to$ проверил тестом и скриншотом $\to$ обновил статус документа.
