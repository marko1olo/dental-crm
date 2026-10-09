import type {
	ClinicMode,
	ClinicProfile,
	ClinicScheduleDefaults,
	ClinicSettings,
	DentalSpecialty,
	SovereignScalePresetId,
	StaffMember,
	StaffWorkingHours,
	UiPreferences,
	UpdateClinicProfileInput,
} from "@dental/shared";
import {
	clinicModeSchema,
	clinicScheduleDefaultsSchema,
	staffRoleSchema,
	staffWorkingHoursSchema,
} from "@dental/shared";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
	applyClinicScalePreset as applyClinicScalePresetInMemory,
	buildClinicSettings as getClinicSettingsInMemory,
	updateClinicMode as updateClinicModeInMemory,
	updateClinicProfile as updateClinicProfileInMemory,
} from "../../sampleData.js";
import { staffAuthorityFlags } from "../../security/permissions.js";
import { db } from "../client.js";
import * as schema from "../schema.js";
import {
	UiPreferencesConcurrentSaveError,
	type UiPreferencesSaveOutcome,
	useInMemory,
} from "./types.js";

// The DB columns are looser than the DTO: clinic_mode is free `text` (legacy rows
// hold "demo"/"single"/"network"), and clinic_schedule / working_hours are untyped
// jsonb. Validate at the read boundary through the shared Zod schemas so an invalid
// stored value falls back to a well-formed default instead of an `as any` lie.
const DEFAULT_SCHEDULE_DEFAULTS: ClinicScheduleDefaults = {
	workdayStart: "08:00",
	workdayEnd: "20:00",
	workingDays: [1, 2, 3, 4, 5],
	appointmentBufferMinutes: 15,
};

function narrowClinicMode(value: unknown): ClinicMode {
	const parsed = clinicModeSchema.safeParse(value);
	return parsed.success ? parsed.data : "solo_doctor";
}

function narrowScheduleDefaults(value: unknown): ClinicScheduleDefaults {
	const parsed = clinicScheduleDefaultsSchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_SCHEDULE_DEFAULTS;
}

function narrowWorkingHours(value: unknown): StaffWorkingHours | null {
	if (value == null) return null;
	const parsed = staffWorkingHoursSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
}

function narrowStaffRole(value: unknown): StaffMember["role"] {
	const parsed = staffRoleSchema.safeParse(value);
	return parsed.success ? parsed.data : "assistant";
}

const memoryUiPreferences = new Map<string, UiPreferences>();

/**
 * НАСТРОЙКИ РАБОЧЕГО МЕСТА: УСТАРЕВШАЯ КОПИЯ НЕ ИМЕЕТ ПРАВА ЗАТИРАТЬ СВЕЖУЮ.
 *
 * ЧТО БЫЛО. `saveUiPreferencesInDb` писала присланное тело в `users.ui_preferences`
 * одним `db.update` БЕЗ единого сравнения времени, а маршрут
 * `PUT /api/settings/preferences` брал `savedAt` от клиента как есть. Ветка без
 * базы писала в `memoryUiPreferences` тоже без сравнения. Замерено запросом в
 * процессе (`app.inject`, не дев-сервер): второе сохранение с `savedAt`
 * 2026-05-20T10:59 поверх сохранённого 11:00 отвечало 200, и роль рабочего места
 * возвращалась с «владелец» на «ассистент».
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Администратор открывает настройки в двух вкладках, в
 * первой меняет роль рабочего места и фильтры расписания, вторая всё это время
 * держит копию, снятую ДО правки. Клиент досылает свою копию сам, отложенной
 * синхронизацией (`apps/web/src/useAppLogic.tsx`,
 * `flushPendingUiPreferencesServerSync`), — и правка первой вкладки исчезала без
 * следа и без отказа. Ролью рабочего места решается, какой набор разделов человек
 * видит; фильтрами расписания — кого администратор видит в сетке приёмов.
 *
 * ЗАЩИТА СУЩЕСТВОВАЛА, НО НЕ НА ПУТИ ЗАПРОСА. `sampleData.ts`
 * (`saveUiPreferences`) сравнивает время с 5150-й строки, и правило там верное.
 * Только вызывает его ровно один файл во всём дереве — тест
 * `tests/mutableStateFlushCoalescing.test.ts`. Ни один маршрут в него не заходит:
 * ветка «без базы» этого модуля держит СВОЙ `Map`. То есть обе достижимые ветки
 * были одинаково слепы, а написанная защита охраняла хранилище, которого продукт
 * не использует.
 *
 * ПРАВИЛО ЗДЕСЬ — ДОСЛОВНОЕ ПОВТОРЕНИЕ ТОГО, ЧТО НАПИСАНО В ПАМЯТИ, и второго
 * правила не заводится: расхождение путей с базой и без — отдельный класс
 * дефекта, в этом дереве его ловили дважды. Обе ветки ниже спрашивают ОДНИ И ТЕ ЖЕ
 * две функции, поэтому разойтись им нечем.
 */

/**
 * Время сохранения в том виде, в котором его записывает сервер.
 *
 * Неразбираемое значение заменяется штампом сервера, а не отвергается: клиент,
 * который поля не присылает, обязан сохранять настройки как раньше. Важнее
 * другое — мусорная строка НЕ ЛОЖИТСЯ в хранилище. До этой правки маршрут писал
 * `input.savedAt ?? new Date().toISOString()`, то есть любую непустую строку
 * клиента; замерено, что строка «позавчера вечером» доезжала до колонки. Пролежав
 * там, она сломала бы сравнение для ВСЕХ последующих сохранений этой клиники.
 */
export function stampedUiPreferencesSavedAt(
	savedAt: string | null | undefined,
): string {
	return savedAt && Number.isFinite(Date.parse(savedAt))
		? savedAt
		: new Date().toISOString();
}

/**
 * Перебито ли присланное сохранение тем, что уже лежит в хранилище.
 *
 * Сравнение СТРОГОЕ (`<`), поэтому ОДИНАКОВОЕ время проходит: обещание оператору
 * — «оба сохранения прошли, победил последний». Это не мелочь и не вкус. Живой
 * клиент повторяет неудавшуюся синхронизацию ТЕМ ЖЕ телом с тем же `savedAt`
 * (`useAppLogic.tsx`: `delayMs: pending.savedAt === preferences.savedAt ? 5000 : 0`).
 * Отвергай равенство — и повтор сохранения, чей ответ потерялся в сети, отвергался
 * бы навсегда, показывая «не синхронизировано» на уже сохранённом.
 *
 * Неразбираемое время НА ЛЮБОЙ из сторон снимает проверку, а не роняет её: сервер
 * не знает, что старше, и поэтому ничего не утверждает. Ровно так же поступает
 * правило в памяти.
 */
export function uiPreferencesSaveIsSuperseded(
	storedSavedAt: string | null | undefined,
	incomingSavedAt: string | null | undefined,
): boolean {
	if (!storedSavedAt || !incomingSavedAt) return false;
	if (!Number.isFinite(Date.parse(storedSavedAt))) return false;
	return (
		Date.parse(stampedUiPreferencesSavedAt(incomingSavedAt)) <
		Date.parse(storedSavedAt)
	);
}

/**
 * Одновременную правку из двух окон закрывает условная запись, а не порядок
 * вызовов, поэтому попытка может проиграть сверку и повториться. Пять попыток —
 * это пять писателей, успевших вклиниться подряд между чтением и записью одной
 * строки настроек; исчерпание такого запаса означает не гонку, а что-то другое, и
 * тогда честнее отказать, чем записать вслепую.
 */
const UI_PREFERENCES_SAVE_ATTEMPTS = 5;

/**
 * Строка, в которой лежат настройки рабочего места этой клиники.
 *
 * ПОРЯДОК ЗДЕСЬ ОБЯЗАТЕЛЕН, А НЕ ЖЕЛАТЕЛЕН. Раньше и чтение, и запись брали
 * `.limit(1)` БЕЗ `order by`. Порядок строк без него не определён, то есть
 * сравнение могло прочитать копию одного сотрудника, а записать поверх копии
 * другого — и защита от устаревшей записи разваливалась бы молча. На живой базе
 * это не гипотеза: в одной организации четыре сотрудника, у всех четырёх своя
 * копия настроек, и время сохранения у них РАЗНОЕ (две строки 10:59, две 11:00).
 *
 * Первой берётся строка, в которой копия уже есть: именно она и есть действующие
 * настройки клиники. Дальше — самый ранний сотрудник, при равенстве — по
 * идентификатору, чтобы выбор был воспроизводимым.
 *
 * ДОЛГ, который здесь не лечится: настройки рабочего места клиники хранятся в
 * колонке СОТРУДНИКА, поэтому копий у организации столько, сколько строк успели
 * записать. Единственное хранилище — это правка схемы, а схема правится не здесь.
 */
async function uiPreferencesRow(
	organizationId: string,
): Promise<{ id: string; uiPreferences: unknown } | null> {
	const [row] = await db
		.select({ id: schema.users.id, uiPreferences: schema.users.uiPreferences })
		.from(schema.users)
		.where(eq(schema.users.organizationId, organizationId))
		.orderBy(
			sql`${schema.users.uiPreferences} is null`,
			asc(schema.users.createdAt),
			asc(schema.users.id),
		)
		.limit(1);
	return row ?? null;
}

export async function getUiPreferencesFromDb(
	organizationId: string,
): Promise<UiPreferences | null> {
	if (useInMemory()) return memoryUiPreferences.get(organizationId) ?? null;
	const row = await uiPreferencesRow(organizationId);
	if (!row?.uiPreferences) return null;
	return row.uiPreferences as UiPreferences;
}

export async function saveUiPreferencesInDb(
	organizationId: string,
	prefs: UiPreferences,
): Promise<UiPreferencesSaveOutcome> {
	if (useInMemory()) {
		const stored = memoryUiPreferences.get(organizationId) ?? null;
		if (
			stored &&
			uiPreferencesSaveIsSuperseded(stored.savedAt, prefs.savedAt)
		) {
			return { applied: false, stored };
		}
		memoryUiPreferences.set(organizationId, prefs);
		return { applied: true, stored: prefs };
	}

	for (let attempt = 1; attempt <= UI_PREFERENCES_SAVE_ATTEMPTS; attempt += 1) {
		const row = await uiPreferencesRow(organizationId);
		if (!row) throw new Error("Не найден пользователь для сохранения настроек интерфейса.");
		const stored = (row.uiPreferences ?? null) as UiPreferences | null;
		if (
			stored &&
			uiPreferencesSaveIsSuperseded(stored.savedAt, prefs.savedAt)
		) {
			return { applied: false, stored };
		}

		/*
		 * Прежнее значение стоит в условии записи, и без него защиты нет вовсе.
		 * «Прочитал, сравнил, записал» тремя отдельными действиями не закрывает
		 * исходный сценарий двух вкладок: оба запроса читают одно и то же старое
		 * значение, оба считают себя свежими, и побеждает тот, чья запись доехала
		 * последней, — то есть ровно устаревшая копия, если она пришла позже.
		 * Сравнение идёт по jsonb, а не по времени: `=` для jsonb определён на
		 * канонической форме, поэтому порядок ключей и пробелы на него не влияют.
		 * Приведение времени в SQL здесь недопустимо — в колонке может лежать строка,
		 * которую `::timestamptz` отвергнет исключением, а порядок вычисления ветвей
		 * `or` Postgres не обещает.
		 */
		const written = await db
			.update(schema.users)
			.set({ uiPreferences: prefs })
			.where(
				and(
					eq(schema.users.id, row.id),
					stored === null
						? isNull(schema.users.uiPreferences)
						: sql`${schema.users.uiPreferences} = ${JSON.stringify(stored)}::jsonb`,
				),
			)
			.returning({ id: schema.users.id });
		if (written.length === 0) continue;
		return { applied: true, stored: prefs };
	}

	throw new UiPreferencesConcurrentSaveError();
}

export async function getClinicSettingsFromDb(
	organizationId: string,
): Promise<ClinicSettings> {
	if (useInMemory()) return getClinicSettingsInMemory();
	const [org] = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	if (!org) throw new Error("Организация не найдена в базе данных");

	const [clinic] = await db
		.select()
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);

	const staff = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.organizationId, organizationId));
	const chairs = await db
		.select()
		.from(schema.chairs)
		.where(eq(schema.chairs.organizationId, organizationId));

	const orgFlags = (org.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};
	const logoUrl = typeof orgFlags.logoUrl === "string" ? orgFlags.logoUrl : null;
	const stampUrl = typeof orgFlags.stampUrl === "string" ? orgFlags.stampUrl : null;

	const profile: ClinicProfile = {
		organizationId: org.id,
		clinicName: clinic?.name || org.name,
		legalName: org.name,
		inn: org.inn || null,
		kpp: org.kpp || null,
		ogrn: org.ogrn || null,
		address: org.legalAddress || null,
		phone: clinic?.phone || null,
		email: org.email || null,
		website: org.website || null,
		medicalLicenseNumber: org.medicalLicenseNumber || null,
		medicalLicenseIssuedAt: org.medicalLicenseIssuedAt || null,
		medicalLicenseIssuer: org.medicalLicenseIssuer || null,
		bankDetails: org.bankDetails || null,
		signatoryName: org.signatoryName || null,
		signatoryTitle: org.signatoryTitle || null,
		mode: narrowClinicMode(org.clinicMode),
		timezone: clinic?.timezone || "Europe/Samara",
		defaultVisitMinutes: 60,
		scheduleDefaults: narrowScheduleDefaults(org.clinicSchedule),
		networkEnabled: false,
		egiszEnabled: false,
		logoUrl,
		stampUrl,
		updatedAt: org.updatedAt.toISOString(),
	};

	const mode = narrowClinicMode(org.clinicMode);
	const activeDoctors = staff.filter(
		(s) => s.isActive && (s.role === "doctor" || narrowStaffRole(s.role) === "doctor"),
	);
	const activeChairs = chairs.filter((c) => c.isActive);
	const isSoloDoctor =
		mode === "solo_doctor" ||
		mode === "one_chair" ||
		activeChairs.length <= 1 ||
		activeDoctors.length <= 1;

	return {
		profile,
		staff: staff.map((s) => ({
			id: s.id,
			organizationId: s.organizationId,
			fullName: s.fullName,
			role: narrowStaffRole(s.role),
			specialties: ["universal"],
			active: s.isActive,
			/*
			 * БЫЛО: `true`, `true`, `true` — жёстко, каждому сотруднику, независимо от
			 * роли. Ассистент уходил на клиент с правом подписи ЭМК, с доступом к
			 * кассе и к импорту, и это не оставалось внутри сервера: ответ POST
			 * /api/settings/clinic/mode и PUT /api/settings/clinic/profile клиент
			 * кладёт целиком в dashboard.clinicSettings
			 * (apps/web/src/useAppLogic.tsx), затирая значения, посчитанные по роли на
			 * пути сводки. То есть после смены режима клиники или сохранения её
			 * реквизитов права на экране становились «всё разрешено всем».
			 *
			 * Полномочия выводятся из той же матрицы ROLE_PERMISSIONS, по которой
			 * requirePermission отказывает на маршруте, поэтому флаг в карточке и
			 * решение сервера совпадают по построению. Разбор соответствия
			 * флаг → право и причина отказа от чтения одноимённых колонок —
			 * security/permissions.ts, staffAuthorityFlags.
			 *
			 * Роль передаётся сырой (s.role), а не через narrowStaffRole: матрица сама
			 * не выдаёт ничего роли, которой в ней нет, а narrowStaffRole сводит
			 * неизвестное значение к «assistant» и тем скрыл бы испорченную запись за
			 * правами настоящей должности.
			 *
			 * Мандат 8e / 8n: При режиме solo_doctor или <= 1 кресле/враче,
			 * врач получает полный суверенитет без блокировок интерфейса.
			 */
			...staffAuthorityFlags(s.role, isSoloDoctor),
			color: "#000000",
			phone: s.phone || null,
			email: s.email || null,
			workingHours: narrowWorkingHours(s.workingHours),
			createdAt: s.createdAt.toISOString(),
			updatedAt: s.createdAt.toISOString(),
		})),
		chairs: chairs.map((c) => {
			const eq = c.equipment || "";
			const roomMatch = eq.match(/Кабинет:\s*([^,]+)/);
			return {
				id: c.id,
				organizationId: c.organizationId,
				name: c.name,
				room: roomMatch ? roomMatch[1]!.trim() : null,
				specialization: (c.specializations as DentalSpecialty) || null,
				active: c.isActive,
				hasXraySensor: eq.toLowerCase().includes("рентген") || eq.toLowerCase().includes("xray"),
				hasMicroscope: eq.toLowerCase().includes("микроскоп") || eq.toLowerCase().includes("microscope"),
				hasSurgeryKit: eq.toLowerCase().includes("хирург") || eq.toLowerCase().includes("surgery"),
				notes: eq || null,
				workingHours: narrowWorkingHours(c.workingHours),
			};
		}),
		integrationPresets: [],
		workspaceProfiles: [],
		roleAccessPolicies: [],
		modeHints: [],
		soloDoctorMode: isSoloDoctor,
	};
}

export async function updateClinicModeInDb(
	organizationId: string,
	mode: ClinicMode,
) {
	if (useInMemory()) return updateClinicModeInMemory(mode);
	await db
		.update(schema.organizations)
		.set({ clinicMode: mode })
		.where(eq(schema.organizations.id, organizationId));
}

/**
 * Атомарное применение суверенного пресета масштаба в базе данных (PostgreSQL 18).
 * Адаптирует clinicMode, workspaceFeatureFlags, clinicSchedule и активные кресла
 * под масштаб без потёмкинских деревень и полумер.
 */
export async function applyClinicScalePresetInDb(
	organizationId: string,
	preset: SovereignScalePresetId,
	_confirmResetExtraChairs?: boolean,
): Promise<ClinicSettings> {
	if (useInMemory()) {
		return applyClinicScalePresetInMemory(preset);
	}

	const [org] = await db
		.select()
		.from(schema.organizations)
		.where(eq(schema.organizations.id, organizationId))
		.limit(1);
	if (!org) {
		throw new Error("Организация не найдена в базе данных.");
	}

	const [clinic] = await db
		.select()
		.from(schema.clinics)
		.where(eq(schema.clinics.organizationId, organizationId))
		.limit(1);

	const targetMode: ClinicMode =
		preset === "solo_doctor"
			? "solo_doctor"
			: preset === "standard_clinic"
				? "small_clinic"
				: "network_clinic";

	const existingFlags =
		(org.workspaceFeatureFlags as Record<string, unknown> | null) ?? {};

	let targetFlags: Record<string, unknown>;
	let targetSchedule: Record<string, unknown>;

	if (preset === "solo_doctor") {
		targetFlags = {
			...existingFlags,
			hasAssistants: false,
			hasMultipleChairs: false,
			hasDentalLab: false,
			hasInsuranceCoPay: false,
			hasInstallments: true,
			hasOrthodontics: false,
			hasTasks: false,
			hasReclamations: false,
			hasPediatricMode: false,
			isOmniRole: true,
			workspacePreset: "solo_therapist",
			onboardingCompleted: true,
			hasPayrollModule: false,
			hasMarketingModule: false,
			hasAnalyticsModule: false,
			hasInventoryModule: false,
			hasGnathology: false,
			hasCsoScanner: false,
			hasLeadsKanban: false,
			hasOmnichannel: false,
			hasEngineeringStatus: false,
			hasClinicalRules: false,
			hasReferralModule: false,
			hasBpmWorkflows: false,
			numberOfDoctors: 1,
			aiEnableTreatmentPlan: true,
			aiEnableRecommendations: true,
			aiEnableDocuments: true,
		};
		targetSchedule = {
			workdayStart: "09:00",
			workdayEnd: "18:00",
			workingDays: [1, 2, 3, 4, 5],
			appointmentBufferMinutes: 10,
			defaultVisitMinutes: 30,
		};
	} else if (preset === "standard_clinic") {
		targetFlags = {
			...existingFlags,
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasTasks: true,
			hasReclamations: true,
			hasPediatricMode: true,
			isOmniRole: false,
			workspacePreset: "family_clinic",
			onboardingCompleted: true,
			hasPayrollModule: true,
			hasMarketingModule: true,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			hasGnathology: false,
			hasCsoScanner: false,
			hasLeadsKanban: false,
			hasOmnichannel: true,
			hasEngineeringStatus: false,
			hasClinicalRules: true,
			hasReferralModule: true,
			hasBpmWorkflows: false,
			numberOfDoctors: 4,
			aiEnableTreatmentPlan: true,
			aiEnableRecommendations: true,
			aiEnableDocuments: true,
		};
		targetSchedule = {
			workdayStart: "08:30",
			workdayEnd: "20:30",
			workingDays: [1, 2, 3, 4, 5, 6],
			appointmentBufferMinutes: 15,
			defaultVisitMinutes: 45,
		};
	} else {
		targetFlags = {
			...existingFlags,
			hasAssistants: true,
			hasMultipleChairs: true,
			hasDentalLab: true,
			hasInsuranceCoPay: true,
			hasInstallments: true,
			hasOrthodontics: true,
			hasGnathology: true,
			hasTasks: true,
			hasReclamations: true,
			hasPediatricMode: true,
			isOmniRole: false,
			workspacePreset: "enterprise",
			onboardingCompleted: true,
			hasPayrollModule: true,
			hasMarketingModule: true,
			hasAnalyticsModule: true,
			hasInventoryModule: true,
			hasCsoScanner: true,
			hasLeadsKanban: true,
			hasOmnichannel: true,
			hasEngineeringStatus: true,
			hasClinicalRules: true,
			hasReferralModule: true,
			hasBpmWorkflows: true,
			numberOfDoctors: 10,
			aiEnableTreatmentPlan: true,
			aiEnableRecommendations: true,
			aiEnableDocuments: true,
		};
		targetSchedule = {
			workdayStart: "08:00",
			workdayEnd: "21:00",
			workingDays: [1, 2, 3, 4, 5, 6, 7],
			appointmentBufferMinutes: 15,
			defaultVisitMinutes: 60,
		};
	}

	await db.transaction(async (tx) => {
		await tx
			.update(schema.organizations)
			.set({
				clinicMode: targetMode,
				workspaceFeatureFlags: targetFlags,
				clinicSchedule: targetSchedule,
				updatedAt: new Date(),
			})
			.where(eq(schema.organizations.id, organizationId));

		const currentChairs = await tx
			.select()
			.from(schema.chairs)
			.where(eq(schema.chairs.organizationId, organizationId))
			.orderBy(asc(schema.chairs.name));

		const clinicId = clinic?.id;

		if (preset === "solo_doctor") {
			if (currentChairs.length === 0) {
				if (clinicId) {
					await tx.insert(schema.chairs).values({
						organizationId,
						clinicId,
						name: "Основное кресло",
						specializations: "universal",
						equipment: "Кабинет: Кабинет 1, рентген",
						isActive: true,
					});
				}
			} else {
				await tx
					.update(schema.chairs)
					.set({ isActive: true })
					.where(eq(schema.chairs.id, currentChairs[0]!.id));

				for (let i = 1; i < currentChairs.length; i++) {
					await tx
						.update(schema.chairs)
						.set({ isActive: false })
						.where(eq(schema.chairs.id, currentChairs[i]!.id));
				}
			}
		} else if (preset === "standard_clinic") {
			const standardConfigs = [
				{
					name: "Кабинет терапии (Кресло 1)",
					spec: "therapist",
					eq: "Кабинет: 1, рентген",
				},
				{
					name: "Кабинет хирургии (Кресло 2)",
					spec: "surgeon",
					eq: "Кабинет: 2, хирургия, рентген",
				},
				{
					name: "Кабинет ортопедии (Кресло 3)",
					spec: "orthopedist",
					eq: "Кабинет: 3, микроскоп",
				},
			];

			for (let i = 0; i < Math.min(currentChairs.length, 3); i++) {
				await tx
					.update(schema.chairs)
					.set({ isActive: true })
					.where(eq(schema.chairs.id, currentChairs[i]!.id));
			}

			if (clinicId) {
				for (let i = currentChairs.length; i < 3; i++) {
					const cfg = standardConfigs[i] ?? {
						name: `Кресло ${i + 1}`,
						spec: "universal",
						eq: `Кабинет: ${i + 1}`,
					};
					await tx.insert(schema.chairs).values({
						organizationId,
						clinicId,
						name: cfg.name,
						specializations: cfg.spec,
						equipment: cfg.eq,
						isActive: true,
					});
				}
			}
		} else {
			const networkConfigs = [
				{
					name: "Кабинет терапии №1",
					spec: "therapist",
					eq: "Кабинет: 101, рентген",
				},
				{
					name: "Кабинет терапии №2",
					spec: "therapist",
					eq: "Кабинет: 102, микроскоп",
				},
				{
					name: "Хирургия и имплантация",
					spec: "surgeon",
					eq: "Кабинет: 103, хирургия, рентген",
				},
				{
					name: "Ортопедия и гнатология",
					spec: "orthopedist",
					eq: "Кабинет: 104, микроскоп",
				},
				{
					name: "Детское отделение",
					spec: "pediatric",
					eq: "Кабинет: 105, детство",
				},
			];

			for (let i = 0; i < Math.min(currentChairs.length, 5); i++) {
				await tx
					.update(schema.chairs)
					.set({ isActive: true })
					.where(eq(schema.chairs.id, currentChairs[i]!.id));
			}

			if (clinicId) {
				for (let i = currentChairs.length; i < 5; i++) {
					const cfg = networkConfigs[i] ?? {
						name: `Кресло ${i + 1}`,
						spec: "universal",
						eq: `Кабинет: ${i + 1}`,
					};
					await tx.insert(schema.chairs).values({
						organizationId,
						clinicId,
						name: cfg.name,
						specializations: cfg.spec,
						equipment: cfg.eq,
						isActive: true,
					});
				}
			}
		}
	});

	return getClinicSettingsFromDb(organizationId);
}

export async function updateClinicProfileInDb(
	organizationId: string,
	input: UpdateClinicProfileInput,
) {
	if (useInMemory()) return updateClinicProfileInMemory(input);
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const updateData: any = { updatedAt: new Date() };
	if (input.legalName !== undefined) updateData.name = input.legalName;
	if (input.inn !== undefined) updateData.inn = input.inn;
	if (input.kpp !== undefined) updateData.kpp = input.kpp;
	if (input.ogrn !== undefined) updateData.ogrn = input.ogrn;
	if (input.address !== undefined) updateData.legalAddress = input.address;
	if (input.email !== undefined) updateData.email = input.email;
	if (input.website !== undefined) updateData.website = input.website;
	if (input.medicalLicenseNumber !== undefined)
		updateData.medicalLicenseNumber = input.medicalLicenseNumber;
	if (input.medicalLicenseIssuedAt !== undefined)
		updateData.medicalLicenseIssuedAt = input.medicalLicenseIssuedAt;
	if (input.medicalLicenseIssuer !== undefined)
		updateData.medicalLicenseIssuer = input.medicalLicenseIssuer;
	if (input.bankDetails !== undefined)
		updateData.bankDetails = input.bankDetails;
	if (input.signatoryName !== undefined)
		updateData.signatoryName = input.signatoryName;
	if (input.signatoryTitle !== undefined)
		updateData.signatoryTitle = input.signatoryTitle;
	if (input.scheduleDefaults !== undefined)
		updateData.clinicSchedule = input.scheduleDefaults;

	if (input.logoUrl !== undefined || input.stampUrl !== undefined) {
		const [currentOrg] = await db
			.select({ flags: schema.organizations.workspaceFeatureFlags })
			.from(schema.organizations)
			.where(eq(schema.organizations.id, organizationId))
			.limit(1);
		const existingFlags =
			(currentOrg?.flags as Record<string, unknown> | null) ?? {};
		const updatedFlags = { ...existingFlags };
		if (input.logoUrl !== undefined) updatedFlags.logoUrl = input.logoUrl;
		if (input.stampUrl !== undefined) updatedFlags.stampUrl = input.stampUrl;
		updateData.workspaceFeatureFlags = updatedFlags;
	}

	await db
		.update(schema.organizations)
		.set(updateData)
		.where(eq(schema.organizations.id, organizationId));

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const clinicUpdateData: any = {};
	if (input.clinicName !== undefined) clinicUpdateData.name = input.clinicName;
	if (input.phone !== undefined) clinicUpdateData.phone = input.phone;
	if (input.timezone !== undefined) clinicUpdateData.timezone = input.timezone;

	if (Object.keys(clinicUpdateData).length > 0) {
		const existingClinic = await db
			.select({ id: schema.clinics.id })
			.from(schema.clinics)
			.where(eq(schema.clinics.organizationId, organizationId))
			.limit(1);

		if (existingClinic.length > 0) {
			await db
				.update(schema.clinics)
				.set(clinicUpdateData)
				.where(eq(schema.clinics.organizationId, organizationId));
		} else {
			await db.insert(schema.clinics).values({
				organizationId,
				name: input.clinicName ?? "Клиника",
				phone: input.phone ?? null,
				timezone: input.timezone ?? "Europe/Samara",
			});
		}
	}
}
