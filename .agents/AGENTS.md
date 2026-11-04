# AGENTS.md — Clinic MVP / DENTE Dental CRM (.agents Router)

> 🏛️ **SSOT & CANONICAL ARCHITECTURE ROUTER:**  
> Все 32 мандата, протокол Memento и машинные гейты Definition of Done зафиксированы в корневом [`GEMINI.md`](file:///C:/Clinic_MVP/dental-crm/GEMINI.md).  
> 
> 🛑 **АРХИТЕКТУРНЫЙ ИНВАРИАНТ ЧТЕНИЯ ПО ТРЕБОВАНИЮ (JIT READING LAW):**  
> Глубокие спецификации подсистем читаются через `read_file` строго Just-In-Time перед началом работы над соответствующей задачей:  
> - [`.agents/THE_HAMMER_MASTER_PROMPT.md`](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md) — Высшая Конституция проекта (CTO Supremacy, 1763 строки).  
> - [`.agents/CANONICAL_ARCHITECTURE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/CANONICAL_ARCHITECTURE.md) — Полный канонический свод законов (Мандаты 8d..8aq, 1432 строки).  
> - [`.agents/DATABASE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DATABASE.md) — Схема PostgreSQL 18 на `127.0.0.1:5432`, Drizzle ORM, миграции.  
> - [`.agents/ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/ODONTOGRAM_CLINICAL_ARTISTRY_BIBLE.md) — Одонтограмма Wheeler 2.5D, viewBox 100x218.  
> - [`.agents/BILLING_AND_FINANCE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/BILLING_AND_FINANCE.md) — Финансы, касса 54-ФЗ, `amountKopecks` (BIGINT).  
> - [`.agents/WAREHOUSE_AND_SUPPLY.md`](file:///C:/Clinic_MVP/dental-crm/.agents/WAREHOUSE_AND_SUPPLY.md) — Склад, пакетное списание расходников (Soft Negative Stock).  
> - [`.agents/DOCUMENTS_LIFECYCLE.md`](file:///C:/Clinic_MVP/dental-crm/.agents/DOCUMENTS_LIFECYCLE.md) — Форма 043/у, ИДС 1051н, справки ФНС.  
> - [`.agents/AI_ASSISTANT_RULES.md`](file:///C:/Clinic_MVP/dental-crm/.agents/AI_ASSISTANT_RULES.md) — 15 законов EBM и клиническая матрица ассистента.  
> - [`.agents/MOBILE_DESIGN_APPLE_HIG.md`](file:///C:/Clinic_MVP/dental-crm/.agents/MOBILE_DESIGN_APPLE_HIG.md) — Мобильная эргономика (тач $\ge 44\times 44$px, Bottom Sheets, 0px скролла).  
> - [`config/references/`](file:///C:/Users/Admin/.gemini/config/references/) — Глобальные справочники по фронтенду, инженерии, ревью и VCS.  
> 
> 🎬 **MEMENTO PROTOCOL (POST-COMPACTION):** При сжатии контекста категорически запрещены слепые правки! Обязательное заземление: `git status` + `git diff --stat` $\to$ чтение плана в `scratch/` $\to$ `read_file` целевого кода $\to$ JIT-чтение доменных спецификаций.
