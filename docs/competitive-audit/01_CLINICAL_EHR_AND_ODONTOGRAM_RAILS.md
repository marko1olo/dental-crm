# РЕЛЬСЫ МИГРАЦИИ: КЛИНИЧЕСКИЙ КОНТУР, ОДОНТОГРАММА, МКБ-10 И 448 ШАБЛОНОВ 043/У
## Из StomX (full_dump22) в Clinic MVP / DENTE

> **Статус документа:** Производственная спецификация внедрения (Zero-Mock Blueprint)  
> **Домен:** Клиническая карта (043/у), одонтограмма, реестр дефектов, МКБ-10, визирование начмедом  
> **Дата:** 2026-09-03  

---

### 1. АНАТОМИЯ ДОМЕНА В СТОМ-ИКС (ПЕРВОИСТОЧНИК)

#### 1.1. Зубной ряд и челюсти (55 сущностей)
В отличие от стандартной формулы 11–48, одонтограмма StomX поддерживает:
- **Постоянные зубы (32 шт):** 11–18, 21–28, 31–38, 41–48 (`is_child: 0`, `type: "T"`).
- **Молочные зубы (20 шт):** 51–55, 61–65, 71–75, 81–85 (`is_child: 1`, `type: "T"`).
- **Челюсти и прикус (3 сущности):**
  * `JU` (`id: 54`, `type: "J"`) — Верхняя челюсть (Maxilla).
  * `JL` (`id: 55`, `type: "J"`) — Нижняя челюсть (Mandibula).
  * `C` (`id: 53`, `type: "J"`) — Центральное соотношение / прикус.

#### 1.2. Каталог дефектов зубов (91 элемент: 89 патологий + норма + служебные)
Дефекты разделены на 3 группы:
1. **`outpatient` (37 элементов):**
   - **Требующие лечения (`require_treatment`, цвет `red`):** Кариес (`С`), Пульпит (`Р`), Периодонтит (`Pt`), Корень (`R`), Кариес корня (`CR`), Отсутствует (`О`), Пигментация (`Пг`), Дефект пломбы (`Дп`), Дефект коронки (`Дк`), Клиновидный дефект (`Кд`), Гипоплазия (`Г`), Флюороз (`Фл`), Рецессия десны I–IV класс (`Рд1`–`Рд4`), Гингивит (`Гн`), Зубной камень (`Зк`), Пародонтит легкий, средний, тяжелый (`AI`, `AII`, `AIII`).
   - **Вылеченные зубы (`cured_teeth`, цвет `yellow`):** Пломба (`П`), Каналы лечены (`Кл`), Коронка (`К`), Искусственный зуб (`И`), Имплантат (`ИМ`), Винир (`В`), Вкладка (`ВК`), Накладка (`НК`), Герметизация фиссур (`Гф`), Фасетка (`Ф`).
   - **Рентгенологические находки (`rg_klkt`, прозрачный слой):** Дистопия (`Д`), Ретенция (`Rt`), Периодонтит рентгенологический (`Pt`), Кариес рентгенологический (`С`), Отсутствует на снимке (`О`).
   - **Норма (`ok`, цвет `green`):** Здоровый интактный зуб.
2. **`anomaly` (20 элементов):**
   - Положение (`position`): Вестибулярное (`В`), Оральное (`О`), Дистальное (`Д`), Мезиальное (`М`), Супраположение (`С`), Инфраположение (`И`), Тортоаномалия (`Т`), Транспозиция (`Тр`), Протрузия (`Пр`), Ретрузия (`Рт`).
   - Сроки прорезывания (`time_cut`): Ретенция (`Rt`), Персистентный молочный зуб (`П`), Ранее удаленный (`РУ`).
   - Количество (`amount`): Первичная адентия (`АД`), Вторичная адентия (`АВ`), Сверхкомплектный (`СК`).
   - Аномалии структуры, цвета и формы (`tvtk`, `colors`, `forms`, `md` - макро/микродентия).
3. **`orthodontic` (34 элемента):** Ортодонтические параметры прикуса и окклюзии.

#### 1.3. Классификатор МКБ-10 (1 841 категория)
- Класс XI: Болезни органов пищеварения (`K00-K93`).
- Стоматологический блок: **`K00-K14`** (77 категорий):
  * `K00` — Нарушения развития и прорезывания зубов.
  * `K01` — Ретинированные и импактные зубы.
  * `K02` — Кариес зубов (эмали, дентина, цемента, приостановившийся).
  * `K03` — Другие болезни твердых тканей (сошлифовывание, эрозия, клиндефекты).
  * `K04` — Болезни пульпы и периапикальных тканей (пульпит, верхушечный периодонтит, периапикальный абсцесс, корневая киста).
  * `K05` — Гингивит и болезни пародонта (острый/хронический, пародонтит I–III, пародонтоз).
  * `K06` — Другие изменения десны (рецессия, гипертрофия).
  * `K07` — Челюстно-лицевые аномалии (прикус, скученность, дистопия).
  * `K08` — Другие изменения зубов и опорного аппарата (адентия, потеря зубов).
  * `K10` — Другие болезни челюстей (периостит, остеомиелит, альвеолит).

#### 1.4. Шаблоны амбулаторной карты 043/у (448 файлов по 33 рубрикам)
- 17 регламентированных секций осмотра:
  1. Анамнез жизни
  2. Жалобы
  3. Развитие настоящего заболевания
  4. Внешний осмотр (лицо, симметрия, лимфоузлы, ВНЧС)
  5. Состояние слизистой оболочки полости рта (СОПР, уздечки, слюнные железы)
  6. Зубная формула
  7. Предварительный диагноз
  8. План обследования
  9. Клинический диагноз
  10. План лечения
  11. Согласованный план лечения
  12. Протокол лечения (дневник вмешательства)
  13. Рекомендации
  14. Прогноз
  15. Прикус
  16. Рентгенологические данные (доза мЗв, КЛКТ)
  17. Пародонтальный статус

#### 1.5. Контур контроля качества начмедом и 24-часовой замок
- **Машина состояний верификации:** `draft` -> `review` -> `approved` / `rejected` (с обязательным комментарием начмеда).
- **24-часовой замок (`outpatient_edit_time`):** Врач может редактировать карту только в течение 24 часов после приема. По истечении 24 часов запись блокируется для врача и доступна для изменения только директору (`isDirector`).

---

### 2. РЕЕСТР ВЫЯВЛЕННЫХ МОКАПОВ И ДЕФЕКТОВ В DENTE CRM

1. **`tooth_number: integer` в `apps/api/src/db/schema/clinical.ts:1096`**:
   - Не позволяет сохранять челюсти `JU`, `JL` и прикус `C`.
2. **Одиночный строковый статус `state: text` в `tooth_states`**:
   - При попытке добавить пломбу на кариозный зуб старый статус удаляется. В реальной стоматологии на одном зубе могут сосуществовать пломба, вторичный кариес, рецессия десны и аномалия наклона.
3. **Хардкод 11 статусов в UI (`ToothChart.tsx:19`)**:
   - Отсутствуют 78 клинических дефектов (дефекты пломбы/коронки, каналы, рецессии, клиновидные дефекты, импланты с остеоинтеграцией).
4. **Отсутствие в БД 448 шаблонов 043/у**:
   - В DENTE зашито около 12 статических протоколов.
5. **Отсутствие маршрутов верификации начмедом**:
   - Нет очереди согласования ЭМК (`/api/outpatient/verify`) и 24-часового таймера.

---

### 3. РЕЛЬСЫ ВНЕДРЕНИЯ: DRIZZLE ORM ТАБЛИЦЫ (`apps/api/src/db/schema/outpatientCore.ts`)

```typescript
import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { patients } from "./patients.js";
import { visits } from "./clinical.js";

// 1. Каталог зубов и челюстей (55 сущностей: 11-48, 51-85, JU, JL, C)
export const clinicalTeethCatalog = pgTable("clinical_teeth_catalog", {
  id: integer("id").primaryKey(), // 1..55
  code: varchar("code", { length: 8 }).notNull().unique(), // "11", "48", "JU", "JL", "C"
  nameRu: varchar("name_ru", { length: 128 }).notNull(), // "1.1 Верхний правый центральный резец"
  type: varchar("type", { length: 8 }).notNull().default("T"), // "T" = Зуб, "J" = Челюсть/Дуга
  isChild: boolean("is_child").notNull().default(false), // 0 = взрослый, 1 = молочный
  quoter: integer("quoter"), // 1..4 (квадрант)
  order: integer("order").notNull().default(0),
});

// 2. Каталог дефектов зубов (91 элемент)
export const toothDefectsCatalog = pgTable("tooth_defects_catalog", {
  id: integer("id").primaryKey(), // ID из StomX
  name: varchar("name", { length: 255 }).notNull(), // "Кариес", "Пломба", "Имплантат"
  alias: varchar("alias", { length: 32 }).notNull(), // "С", "П", "ИМ", "Pt"
  type: varchar("type", { length: 32 }).notNull(), // "outpatient", "orthodontic", "anomaly"
  key: varchar("key", { length: 32 }).notNull(), // "require_treatment", "cured_teeth", "rg_klkt", "position"
  color: varchar("color", { length: 32 }), // "red", "yellow", "green", "white"
  order: integer("order").notNull().default(100),
  canDelete: boolean("can_delete").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

// 3. Стоматологический классификатор МКБ-10
export const mkbCategories = pgTable("mkb_categories", {
  id: integer("id").primaryKey(),
  parentId: integer("parent_id"),
  code: varchar("code", { length: 16 }).notNull(), // "K02", "K02.1", "K04.0"
  name: text("name").notNull(),
  isDentalSpecialty: boolean("is_dental_specialty").notNull().default(false), // true для K00-K14
  order: integer("order").notNull().default(0),
}, (t) => ({
  codeIdx: index("idx_mkb_code").on(t.code),
  parentIdx: index("idx_mkb_parent").on(t.parentId),
}));

// 4. Множественные дефекты на зубе/челюсти пациента
export const patientToothDefects = pgTable("patient_tooth_defects", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  toothCode: varchar("tooth_code", { length: 8 }).notNull().references(() => clinicalTeethCatalog.code),
  defectId: integer("defect_id").notNull().references(() => toothDefectsCatalog.id),
  visitId: uuid("visit_id").references(() => visits.id),
  diagnosedByDoctorId: uuid("diagnosed_by_doctor_id").references(() => users.id),
  diagnosedAt: timestamp("diagnosed_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }), // Дата излечения (если переведен в статус cured)
  comment: text("comment"),
}, (t) => ({
  patientToothIdx: index("idx_patient_tooth_defects").on(t.organizationId, t.patientId, t.toothCode),
}));

// 5. Шаблоны 043/у (448 шт) и рубрики (33 шт)
export const outpatientTemplateCategories = pgTable("outpatient_template_categories", {
  id: integer("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // "Кариес", "Пульпит", "Удаление", "Виниры"
  specialty: varchar("specialty", { length: 64 }).notNull(), // "therapy", "surgery", "orthopedics"
  order: integer("order").notNull().default(0),
});

export const outpatientTemplates = pgTable("outpatient_templates", {
  id: integer("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => outpatientTemplateCategories.id),
  name: varchar("name", { length: 255 }).notNull(), // "0134_Кариес дентина средний.json"
  contentJson: jsonb("content_json").notNull(), // Структурированный протокол (жалобы, объективно, статус)
  mkbCode: varchar("mkb_code", { length: 16 }), // "K02.1"
  order: integer("order").notNull().default(0),
});

// 6. Верификация амбулаторных карт начмедом
export const outpatientVerifications = pgTable("outpatient_verifications", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  visitId: uuid("visit_id").notNull().references(() => visits.id, { onDelete: "cascade" }),
  patientId: uuid("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  doctorId: uuid("doctor_id").notNull().references(() => users.id),
  cmoUserId: uuid("cmo_user_id").references(() => users.id), // Начмед / Главврач
  status: varchar("status", { length: 32 }).notNull().default("draft"), // "draft", "review", "approved", "rejected"
  rejectionReason: text("rejection_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  editableDeadline: timestamp("editable_deadline", { withTimezone: true }).notNull(), // 24 часа от даты приема
}, (t) => ({
  orgStatusIdx: index("idx_outpatient_verif_org_status").on(t.organizationId, t.status),
  visitIdx: unique("uniq_outpatient_verif_visit").on(t.visitId),
}));
```

---

### 4. API ЭНДПОИНТЫ FASTIFY (`apps/api/src/routes/outpatient_v2.ts`)

1. `GET /api/catalogs/teeth` — Получение всех 55 сущностей зубного ряда (взрослые, детские, челюсти `JU`/`JL`, прикус `C`).
2. `GET /api/catalogs/tooth-defects` — Список всех 91 дефектов с фильтрацией по `type` и `key`.
3. `GET /api/catalogs/tooth-defects/tree` — Иерархическое дерево дефектов для радиального меню одонтограммы.
4. `GET /api/catalogs/mkb/categories/tree` — Стоматологическое дерево МКБ-10 (`K00-K14`).
5. `GET /api/outpatient/templates` — Поиск и фильтрация 448 клинических шаблонов 043/у по нозологии.
6. `GET /api/patients/:patientId/tooth-defects` — Текущее клиническое состояние одонтограммы пациента со всеми активными дефектами.
7. `POST /api/patients/:patientId/tooth-defects` — Добавление дефекта на зуб/челюсть.
8. `DELETE /api/patients/:patientId/tooth-defects/:id` — Снятие/излечение дефекта.
9. `GET /api/outpatient/verify` — Очередь амбулаторных карт на согласовании у начмеда/главврача.
10. `PUT /api/outpatient/verify/:id/status` — Утверждение (`approved`) или возврат на доработку (`rejected`) карты начмедом с замечанием.
