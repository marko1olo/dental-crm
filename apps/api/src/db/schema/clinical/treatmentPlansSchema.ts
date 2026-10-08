import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import {
	dentalSpecialty,
	serviceCategory,
	treatmentPlanItemStatus,
	treatmentPlanScenarioPriority,
	treatmentPlanScenarioStrategy,
	treatmentPlanStatus,
} from "../_common.js";
import { organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { chairs } from "../schedule.js";
import { visits } from "./visitsSchema.js";

export const serviceCatalogItems = pgTable(
	"service_catalog_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		code: text("code").notNull(),
		title: text("title").notNull(),
		category: serviceCategory("category").notNull().default("other"),
		specialty: dentalSpecialty("specialty").notNull().default("universal"),
		/*
		 * Прайс клиники хранит копейки.
		 *
		 * Было integer: услугу за 1 500,50 ₽ занести было нельзя вовсе — не
		 * округлялось при выводе, а отвергалось базой на записи. Обязателен
		 * mode: "number": без него drizzle отдаёт numeric строкой независимо от
		 * настроек драйвера, цена приходит как "1500.50", и сложение цен становится
		 * склейкой строк.
		 */
		basePriceRub: numeric("base_price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		priceRub: numeric("price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		durationMinutes: integer("duration_minutes").notNull().default(30),
		taxDeductible: boolean("tax_deductible").notNull().default(true),
		taxDeductionCode: text("tax_deduction_code"),
		order804nCode: text("order_804n_code"),
		uetAdult: numeric("uet_adult", { precision: 6, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		uetChild: numeric("uet_child", { precision: 6, scale: 2, mode: "number" })
			.notNull()
			.default(0),
		isDecree458Expensive: boolean("is_decree_458_expensive")
			.notNull()
			.default(false),
		nsiServiceId: text("nsi_service_id"),
		isActive: boolean("is_active").notNull().default(true),
	},
	(t) => ({
		organizationIdIdx: index("service_catalog_items_organization_id_idx").on(
			t.organizationId,
		),
	}),
);

// services (clinic price list / service catalog)
export const services = pgTable(
	"services",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		title: text("title").notNull(),
		code: text("code"),
		category: serviceCategory("category").notNull().default("therapy"),
		specialty: dentalSpecialty("specialty").notNull().default("universal"),
		/*
		 * mode: "number" обязателен.
		 *
		 * Без него drizzle отдаёт numeric строкой вида "1500.50" независимо от
		 * настроек драйвера — это его собственное преобразование, а не поведение
		 * postgres. Строка дальше молча складывается с другими строками вместо
		 * сложения чисел, и это не ловится типами, потому что склейка строк
		 * допустима.
		 */
		basePriceRub: numeric("base_price_rub", {
			precision: 10,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		durationMinutes: integer("duration_minutes").notNull().default(30),
		taxDeductible: boolean("tax_deductible").notNull().default(true),
		/**
		 * Признак дорогостоящего лечения (Код 2 vs Код 1 для справки ФНС 1151156)
		 * false (0) = Код 1 (обычное лечение, лимит 150 000 ₽)
		 * true (1) = Код 2 (дорогостоящее лечение: имплантация, костная пластика — без лимита)
		 */
		isExpensive: boolean("is_expensive").notNull().default(false),
		/** Фиксированная оплата врачу за данную процедуру (salary_price в StomX procedures.json) */
		salaryPriceRub: numeric("salary_price_rub", {
			precision: 10,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		/** Себестоимость списания материалов по умолчанию */
		materialsCostRub: numeric("materials_cost_rub", {
			precision: 10,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		/** Идентификатор внешнего контрагента / лаборатории */
		contractorId: text("contractor_id"),
		/** Доза облучения в миллизивертах (мЗв) для рентген-процедур */
		doseMsv: numeric("dose_msv", {
			precision: 8,
			scale: 4,
			mode: "number",
		})
			.notNull()
			.default(0),
		active: boolean("active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("services_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

export const treatmentItems = pgTable(
	"treatment_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		serviceId: uuid("service_id").references(() => serviceCatalogItems.id, {
			onDelete: "restrict",
		}),
		toothCode: text("tooth_code"),
		title: text("title").notNull(),
		quantity: numeric("quantity", { precision: 10, scale: 2 })
			.notNull()
			.default("1"),
		/*
		 * Рубли с копейками (миграция 0135). `mode: "number"` обязателен: без него
		 * drizzle отдаёт numeric строкой независимо от разбора типов в драйвере, и
		 * арифметика над суммой склеит строки вместо сложения. Подробнее — у
		 * payments.amountRub и в apps/api/src/db/moneyTypeParsers.ts.
		 */
		priceRub: numeric("price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		unitPriceRub: numeric("unit_price_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		discountRub: numeric("discount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		status: treatmentPlanItemStatus("status").notNull().default("proposed"),
		plannedDoctorUserId: uuid("planned_doctor_user_id").references(
			() => users.id,
		),
		plannedChairId: uuid("planned_chair_id").references(() => chairs.id),
		notes: text("notes"),
		/**
		 * УЧЁТ ОФЛАЙН-ОБМЕНА ПО КНИГЕ ЛЕЧЕНИЯ. Обе колонки созданы миграцией 0000 и
		 * здесь не объявлялись: в базе таблица имеет 17 колонок, в модели их было 15
		 * (замерено `pg_attribute` живой базы, 2026-07-29 —
		 * `is_synced boolean NOT NULL DEFAULT false`, `version integer NOT NULL
		 * DEFAULT 1`).
		 *
		 * Незаявленная колонка через drizzle НЕДОСТИЖИМА: ключ, которого нет в форме
		 * таблицы, он в запрос не переносит — ни на запись, ни на чтение. Поэтому
		 * `services/syncDaemon.ts` не мог ни узнать, что позиция книги лечения ещё не
		 * ушла на сервер, ни поднять счётчик версии при правке: обмен с офлайн-клиентом
		 * по деньгам пациента был слеп. Ровно этот класс правили у `visit_diaries` и
		 * `tooth_states` — комментарии ниже в этом файле.
		 *
		 * `.default(...)` повторяет базу дословно и обязателен по второй причине: без
		 * него drizzle потребовал бы оба поля в КАЖДОЙ вставке в `treatment_items`, а
		 * их пишет проводка сметы в книгу лечения (`routes/odontogram.ts`).
		 */
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
	},
	(t) => ({
		organizationIdIdx: index("treatment_items_organization_id_idx").on(
			t.organizationId,
		),
		idxTreatmentItemsOrgPatient: index("idx_treatment_items_org_patient").on(
			t.organizationId,
			t.patientId,
		),
		idxTreatmentItemsOrgStatus: index("idx_treatment_items_org_status").on(
			t.organizationId,
			t.status,
		),
		patientIdIdx: index("treatment_items_patient_id_idx").on(t.patientId),
		visitIdIdx: index("treatment_items_visit_id_idx").on(t.visitId),
		serviceIdIdx: index("treatment_items_service_id_idx").on(t.serviceId),
		plannedDoctorUserIdIdx: index(
			"treatment_items_planned_doctor_user_id_idx",
		).on(t.plannedDoctorUserId),
		plannedChairIdIdx: index("treatment_items_planned_chair_id_idx").on(
			t.plannedChairId,
		),
	}),
);

export const treatmentScenarios = pgTable(
	"treatment_scenarios",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		title: text("title").notNull(),
		strategy: treatmentPlanScenarioStrategy("strategy")
			.notNull()
			.default("standard"),
		priority: treatmentPlanScenarioPriority("priority")
			.notNull()
			.default("balanced"),
		totalRub: numeric("total_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		durationMonths: integer("duration_months").notNull().default(0),
		visitCount: integer("visit_count").notNull().default(1),
		includedServiceIdsJson: text("included_service_ids_json")
			.notNull()
			.default("[]"),
		phasesJson: text("phases_json").notNull().default("[]"),
		prosJson: text("pros_json").notNull().default("[]"),
		tradeoffsJson: text("tradeoffs_json").notNull().default("[]"),
		clinicalWarningsJson: text("clinical_warnings_json")
			.notNull()
			.default("[]"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_scenarios_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("treatment_scenarios_patient_id_idx").on(t.patientId),
	}),
);

// #52 — план_лечения::конструктор_планов_лечения_2_0
export const treatmentPlanLockTokens = pgTable(
	"treatment_plan_lock_tokens",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		treatmentPlanId: uuid("treatment_plan_id").notNull(),
		lockedByDoctorName: text("locked_by_doctor_name").notNull(),
		lockToken: text("lock_token").notNull(),
		autoSaveDraftJson: text("auto_save_draft_json").notNull(),
		isActiveLock: boolean("is_active_lock").default(true).notNull(),
		lockedAt: timestamp("locked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"treatment_plan_lock_tokens_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #43 — план_лечения::альтернативные_планы_лечения
export const alternativeTreatmentPlans = pgTable(
	"alternative_treatment_plans",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		variantName: text("variant_name").notNull(),
		totalCostRub: numeric("total_cost_rub", {
			precision: 12,
			scale: 2,
		}).notNull(),
		isSelectedVariant: boolean("is_selected_variant").default(false).notNull(),
		autoArchived: boolean("auto_archived").default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"alternative_treatment_plans_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #41 — документы::печать_одонтограммы_в_плане_лечения
export const treatmentPlanPrintOdontograms = pgTable(
	"treatment_plan_print_odontograms",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		planTitle: text("plan_title").notNull(),
		odontogramIncluded: boolean("odontogram_included").default(true).notNull(),
		toothFormulaSnippet: text("tooth_formula_snippet").notNull(),
		printLayoutReady: boolean("print_layout_ready").default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"treatment_plan_print_odontograms_organizationId_idx",
		).on(t.organizationId),
	}),
);

// #34 — план_лечения::управление_этапами_и_автоархивация
export const treatmentPlanStages = pgTable(
	"treatment_plan_stages",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		planTitle: text("plan_title").notNull(),
		stageOrder: integer("stage_order").default(1).notNull(),
		stageName: text("stage_name").notNull(),
		completionPercentage: integer("completion_percentage").default(0).notNull(),
		autoArchived: boolean("auto_archived").default(false).notNull(),
		archivedAt: timestamp("archived_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_plan_stages_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// treatment plans (multi-stage treatment planning)
export const treatmentPlans = pgTable(
	"treatment_plans",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		/**
		 * Изоляция по клинике. `NOT NULL` в базе — с миграции 0146; до неё колонка
		 * допускала NULL, то есть план лечения с суммой мог оказаться бесхозным и
		 * достаться любому арендатору базы. Прецедент дословный:
		 * `family_groups.organization_id` закрывали миграцией 0119 после того, как
		 * бесхозная группа вместе с балансом семейного кошелька досталась первой
		 * обратившейся клинике. Ограничение поставлено на пустую таблицу (0 строк на
		 * 2026-07-29), поэтому backfill не потребовался ни на одну строку.
		 */
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		doctorId: uuid("doctor_id"),
		title: text("title").notNull().default(""),
		/**
		 * ЗДЕСЬ БЫЛО `.default("План лечения")`, И ЭТО УМОЛЧАНИЕ ДО БАЗЫ НЕ ДОХОДИЛО
		 * НИКОГДА.
		 *
		 * Для колонки со статическим умолчанием, значение которой не передано, drizzle
		 * пишет в SQL ключевое слово `default` — не значение из этого файла. У колонки
		 * `name` в базе умолчания НЕТ (проверено `pg_attrdef`, 2026-07-29), а `NOT
		 * NULL` есть: вставка без имени плана давала бы `null value in column "name"
		 * violates not-null constraint`. Объявление обещало, что поле необязательно,
		 * база это обещание отвергала.
		 *
		 * ПОЧЕМУ УМОЛЧАНИЕ НЕ ЗАВЕДЕНО В БАЗЕ, А СНЯТО ИЗ ОБЪЯВЛЕНИЯ. План лечения,
		 * тихо сохранённый под общим именем «План лечения», врач не найдёт в списке из
		 * десяти таких же, а подпись пациента будет стоять под безымянной сметой.
		 * Требовать имя правильнее, и требовать его надо на этапе компиляции: без
		 * `.default(...)` `name` обязателен в типе вставки, и пропуск поля становится
		 * ошибкой компилятора вместо отказа базы на живом сохранении.
		 */
		name: text("name").notNull(),
		/**
		 * Перечисление, а не `text`: набор значений принадлежит базе. Умолчание `Draft`
		 * повторяет `DEFAULT 'Draft'::treatment_plan_status` дословно — см. докстринг
		 * `treatmentPlanStatus` выше о том, чем строчный `"draft"` стоил отчётам.
		 */
		status: treatmentPlanStatus("status").notNull().default("Draft"),
		totalPriceRub: numeric("total_price_rub", { precision: 12, scale: 2 }),
		/**
		 * Итог сметы. `NOT NULL DEFAULT '0'` в базе с миграции 0000, а объявление
		 * разрешало NULL: тип обещал `string | null` там, где база гарантирует
		 * значение, и каждый читатель суммы обязан был проверять её на пустоту.
		 * Смета без итога — это ноль, а не «неизвестно».
		 */
		totalPrice: numeric("total_price", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		patientSignature: text("patient_signature"),
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		approvedAt: timestamp("approved_at", { withTimezone: true }),
		// Альтернативные планы лечения (ПП РФ №659 и ст. 20 323-ФЗ)
		planGroupId: uuid("plan_group_id"),
		groupName: text("group_name"),
		isAlternative: boolean("is_alternative").notNull().default(false),
		alternativeTier: text("alternative_tier"),
		alternativeStatus: text("alternative_status").notNull().default("proposed"),
		declinedReason: text("declined_reason"),
		// Закрепление цен и токены заморозки (Price Freeze Tokens / GAP_REPORT строка 164)
		activePriceFreezeTokenId: uuid("active_price_freeze_token_id"),
		priceFreezePolicy: text("price_freeze_policy").default("standard_30_days"),
		priceFrozenUntil: timestamp("price_frozen_until", { withTimezone: true }),
		// Режимы скидок плана лечения (GAP_REPORT строка 165: none | plan_fixed | on_selection)
		discountMode: text("discount_mode").notNull().default("plan_fixed"),
		planDiscountPercent: numeric("plan_discount_percent", {
			precision: 5,
			scale: 2,
			mode: "number",
		}).default(0),
		planDiscountRub: numeric("plan_discount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).default(0),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_plans_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("treatment_plans_patientId_idx").on(t.patientId),
		doctorIdIdx: index("treatment_plans_doctor_id_idx").on(t.doctorId),
		planGroupIdIdx: index("treatment_plans_plan_group_id_idx").on(
			t.planGroupId,
		),
		priceFreezeTokenIdx: index("treatment_plans_price_freeze_token_idx").on(
			t.activePriceFreezeTokenId,
		),
	}),
);

// Токены закрепления цен плана лечения (Price Freeze Tokens / GAP_REPORT строка 164)
export const treatmentPlanPriceFreezeTokens = pgTable(
	"treatment_plan_price_freeze_tokens",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		planId: uuid("plan_id")
			.notNull()
			.references(() => treatmentPlans.id),
		token: text("token").notNull(),
		policyKind: text("policy_kind").notNull().default("standard_30_days"),
		lockedAt: timestamp("locked_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
		isExpired: boolean("is_expired").notNull().default(false),
		inflationThresholdPercent: integer("inflation_threshold_percent")
			.notNull()
			.default(10),
		frozenPricesJson: jsonb("frozen_prices_json").notNull(),
		status: text("status").notNull().default("active"), // "active" | "exhausted" | "expired" | "revoked"
		issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("price_freeze_tokens_org_idx").on(t.organizationId),
		patientIdIdx: index("price_freeze_tokens_patient_idx").on(t.patientId),
		planIdIdx: index("price_freeze_tokens_plan_idx").on(t.planId),
		tokenIdx: index("price_freeze_tokens_token_idx").on(t.token),
	}),
);

// treatment plan items new (items inside treatment plan)
export const treatmentPlanItemsNew = pgTable(
	"treatment_plan_items_new",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		/**
		 * `NOT NULL` в базе — с миграции 0147.
		 *
		 * ДОЛГ БЫЛ НЕ РАСХОЖДЕНИЕМ: колонка допускала NULL И в базе, И здесь, поэтому
		 * сторож схемы молчал — сравнивать было нечего. Молчание сторожа и есть худшая
		 * часть такого долга: он не всплывает сам.
		 *
		 * Позиция сметы без принадлежности клинике не принадлежит НИКОМУ: запрос с
		 * отбором по клинике её не видит, а запрос без отбора видит её у всех. Смета —
		 * документ, под которым пациент ставит подпись. Прецедент дословный и уже
		 * оплаченный: так бесхозная семейная группа вместе с балансом кошелька
		 * досталась чужой клинике (закрывала миграция 0119), и так же `POST
		 * /api/appointments` принимал пациента, врача и кресло другой клиники
		 * (закрывал `f18a261bb`).
		 *
		 * Закрыто с двух сторон одной волной: писатель заполняет колонку (`1abbed2c3`),
		 * миграция 0147 запрещает пустоту. Цена посчитана ДО применения: таблица пуста,
		 * `SET NOT NULL` нечего отвергать. Разбор:
		 * `.agents/lead/recon-schema-vs-live-database.md`.
		 */
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		planId: uuid("plan_id").notNull(),
		toothNumber: integer("tooth_number"),
		/** `NOT NULL` в базе — с миграции 0146: позицию без ссылки на прайс нечем сопоставить с услугой. */
		priceId: text("price_id").notNull(),
		quantity: integer("quantity").notNull().default(1),
		/*
		 * Точность повторяет базу: колонки созданы `numeric(12,2)`, а объявлены были
		 * `numeric(10, 2)`. Объявление ОБЕЩАЛО МЕНЬШЕ, чем база принимает, — то есть
		 * занижало предел суммы позиции на два разряда. Расхождение не ловил
		 * `scripts/check-schema-type-drift.mjs`: он сверяет `data_type`, а он у обоих
		 * `numeric`, без точности.
		 *
		 * Без `mode: "number"` — намеренно, как у `crm_leads.expected_revenue`:
		 * `routes/odontogram.ts` пишет сюда `item.price.toString()`, то есть строковый
		 * тип drizzle совпадает с контрактом единственного писателя.
		 */
		price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
		discount: numeric("discount", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		phase: integer("phase").notNull().default(1),
		isBundle: boolean("is_bundle").notNull().default(false),
		/**
		 * НАЧИСЛЕНИЕ ВРАЧУ ПО ПОЗИЦИИ СМЕТЫ — колонка есть в базе, читать её было нечем.
		 *
		 * Создана как `numeric(12,2) NOT NULL DEFAULT '0'` (проверено `pg_attribute`
		 * живой базы, 2026-07-29) и здесь не объявлялась, поэтому через drizzle была
		 * недостижима: ни прочитать, ни записать. Это деньги врача за оказанную
		 * услугу — тот же класс, которым `patient_invoices.total_amount_rub` обнулял
		 * выручку в отчётах руководителю.
		 *
		 * Точность и умолчание повторяют базу дословно; `mode: "number"` не ставится по
		 * той же причине, что у `price` и `discount` рядом — иначе одна таблица
		 * отдавала бы деньги двумя разными типами.
		 */
		commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 })
			.notNull()
			.default("0"),
		doctorId: uuid("doctor_id").references(() => users.id),
		/** `NOT NULL` в базе — с миграции 0146; умолчание `now()` там было и раньше. */
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("treatment_plan_items_new_organizationId_idx").on(
			t.organizationId,
		),
		planIdIdx: index("treatment_plan_items_new_plan_id_idx").on(t.planId),
		doctorIdIdx: index("treatment_plan_items_new_doctor_id_idx").on(t.doctorId),
	}),
);
