# 📋 СПРИНТ 5: СПЕЦИФИКАЦИЯ И БЭКЛОГ ИСПРАВЛЕНИЙ

> 🧭 **Навигация:** [🗺️ Главный Индекс (.agents/INDEX.md)](file:///C:/Clinic_MVP/dental-crm/.agents/INDEX.md) | [📚 Портал Документации (docs/README.md)](file:///C:/Clinic_MVP/dental-crm/docs/README.md) | [Высшая Конституция THE HAMMER](file:///C:/Clinic_MVP/dental-crm/.agents/THE_HAMMER_MASTER_PROMPT.md)  
> **Статус:** **ВЫПОЛНЕНО И ЗАКРЫТО (`ПРОВЕРЕНО`)**  
> **Дата реализации:** 2026-08-01 (Актуализировано: 2026-09-04)  
> **Цель:** Устранение уязвимостей базы данных (индексы внешних ключей), гонок конверсии лидов, клинической валидации 1094н и декомпозиция документов (все 4 таска внедрены и проверены в кодовой базе).  
> **Стандарты качества:** Мандаты 8b, 8e, 8g, 8h, 8i, 8k, 8n (Zero Mocks, Doctor Autonomy, Rule != Task, Bounded Context).  

---

## 🗺️ ИЕРАРХИЯ ЗАДАЧ СПРИНТА 5

```
[СПРИНТ 5: ИНФРАСТРУКТУРА, БЕЗОПАСНОСТЬ И ДОКУМЕНТЫ] [ЗАКРЫТО]
   ├── 📌 TASK-5.1: Миграция индексов внешних ключей (28 FKs) [РЕАЛИЗОВАНО]
   ├── 📌 TASK-5.2: Защита от гонок конверсии лидов (CRM Lead Lock) [РЕАЛИЗОВАНО]
   ├── 📌 TASK-5.3: Валидация матрицы лекарств 1094н по реальным данным пациента [РЕАЛИЗОВАНО]
   ├── 📌 TASK-5.4: Декомпозиция форм DocumentsView.tsx [РЕАЛИЗОВАНО]
   └── 🏛️ КОНСТИТУЦИОННЫЙ АУДИТ МАНДАТОВ 8e, 8i, 8k, 8n [ЗАКРЫТО]
```

---

## 📌 ТАСКИ СПРИНТА 5

### 📌 TASK-5.1: Миграция индексов внешних ключей (28 FKs) [РЕАЛИЗОВАНО И ЗАКРЫТО]
- **Файлы:** [apps/api/drizzle/0173_missing_fk_indexes.sql:1-91](file:///C:/Clinic_MVP/dental-crm/apps/api/drizzle/0173_missing_fk_indexes.sql#L1-L91), `apps/api/src/db/schema/`
- **Проблема:** PostgreSQL не индексирует Foreign Keys автоматически. При каскадных операциях `CASCADE` и соединениях `JOIN` в клинике, бухгалтерии и бонусах возникали полнотабличные `Seq Scan`.
- **Решение:** Создана идемпотентная миграция с проверками `IF EXISTS` и созданием индексов `CREATE INDEX IF NOT EXISTS` для 28 внешних ключей:
  * `idx_clinical_tasks_assigned_doctor`
  * `idx_electronic_prescriptions_visit`
  * `idx_patient_implant_installations_surgeon_doctor`
  * `idx_anesthesia_protocols_patient`
  * `idx_lab_order_status_history_order` и др.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

### 📌 TASK-5.2: Защита от гонок конверсии лидов (CRM Lead Lock) [РЕАЛИЗОВАНО И ЗАКРЫТО]
- **Файл:** [apps/api/src/routes/leads.ts:193-201](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/leads.ts#L193-L201)
- **Проблема:** Метод `/api/leads/:id/convert` читал лид без блокировки. При одновременном клике двух администраторов создавались дубликаты карточек пациентов и параллельные слоты в расписании.
- **Решение:** Конверсия изолирована в ACID-транзакцию `db.transaction(async (tx) => { ... })` с пессимистической блокировкой строки лида через `.for("update")`:
  ```typescript
  const [lead] = await tx
      .select()
      .from(crmLeads)
      .where(and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)))
      .for("update")
      .limit(1);
  if (lead.status === "consult_booked") {
      return { alreadyConverted: true as const };
  }
  ```
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

### 📌 TASK-5.3: Валидация матрицы лекарств 1094н по реальным данным пациента [РЕАЛИЗОВАНО И ЗАКРЫТО]
- **Файл:** [apps/api/src/routes/pharmacology.ts:172-182](file:///C:/Clinic_MVP/dental-crm/apps/api/src/routes/pharmacology.ts#L172-L182)
- **Проблема:** В алгоритме проверки совместимости препаратов по Приказу Минздрава 1094н возраст был захардкожен константой 35 лет.
- **Решение:** Внедрен динамический расчет возраста пациента в годах по дате рождения из ЭМК:
  ```typescript
  let patientAgeYears = 35;
  if (patient.birthDate) {
      const bDate = new Date(patient.birthDate);
      if (!Number.isNaN(bDate.getTime())) {
          const ageDiffMs = Date.now() - bDate.getTime();
          patientAgeYears = Math.max(0, Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000)));
      }
  }
  ```
  Параметры передаются в клинический движок `DentalInteractionMatrixEngine.evaluatePrescriptionSafety()`.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

### 📌 TASK-5.4: Декомпозиция форм `DocumentsView.tsx` [РЕАЛИЗОВАНО И ЗАКРЫТО]
- **Файлы:**
  * [apps/web/src/components/documents/forms/PatientIntakeQuestionnaireForm.tsx:1-240](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/forms/PatientIntakeQuestionnaireForm.tsx#L1-L240)
  * [apps/web/src/components/documents/forms/TreatmentPlanDocumentForm.tsx:1-342](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/forms/TreatmentPlanDocumentForm.tsx#L1-L342)
  * Всего в [apps/web/src/components/documents/forms/](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/forms/) выделено **20 модульных бланков** (043/у, ИДС, 037/у, 039/у, отказ от вмешательства, договор платных услуг, налоговый вычет).
- **Проблема:** Монолит `DocumentsView.tsx` содержал тысячи строк разметки форм.
- **Решение:** Формы вынесены в чистые изолированные TSX-компоненты с типизированными пропсами и поддержкой автосохранения через `useDocumentStore`.
- **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

---

## 🏛️ КОНСТИТУЦИОННЫЙ АУДИТ КЛИНИЧЕСКИХ ИНВАРИАНТОВ (МАНДАТЫ 8e, 8g, 8i, 8n)

1. **1-клик норма в анамнезе и анкете пациента (Мандат 8e):**
   - [apps/web/src/components/documents/PrimaryIntakePackageModal.tsx:251](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/documents/PrimaryIntakePackageModal.tsx#L251) — заполнение анкеты физиологической нормой («Соматически здоров / норма») в 1 клик.
   - [apps/web/src/components/patient/PatientAnamnesisModal.tsx:135](file:///C:/Clinic_MVP/dental-crm/apps/web/src/components/patient/PatientAnamnesisModal.tsx#L135) — шаблон соматической нормы без отягощенности.
   - **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

2. **Печать бланков договоров и согласий без блокировок (Мандаты 8e, 8n):**
   - Бланки договоров распечатываются со строками `_______` для ручного заполнения до приёма врача без 403-ошибок.
   - Незавершённые визиты печатаются со штампом «ЧЕРНОВИК», не блокируя работу регистратуры.
   - **Статус:** `[РЕАЛИЗОВАНО] / [ЗАКРЫТО]`.

3. **Отклонение стационарного опросника госпитализации:**
   - ❌ Внедрение 50-пунктных общебольничных соматических анкет стационара (Форма 025/у).
   - **Вердикт:** `[ОТКЛОНЕНО ПО КОНСТИТУЦИИ: МАНДАТ 8i]`.
   - **Обоснование:** DENTE — частная амбулаторная стоматология. Соматический статус собирается строго в объёме стоматологической безопасности (аллергии, гемостаз, соматические риски анестезии).
