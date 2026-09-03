/**
 * 152-ФЗ / 323-ФЗ ст. 13: ВРАЧЕБНАЯ ТАЙНА И АППАРАТНОЕ УСЕЧЕНИЕ ПОЛЕЗНОЙ НАГРУЗКИ (PAYLOAD STRIPPING)
 *
 * ЗАКОНОДАТЕЛЬНОЕ ОСНОВАНИЕ:
 * Статья 13 Федерального закона № 323-ФЗ «Об основах охраны здоровья граждан в РФ»:
 * Сведения о факте обращения гражданина за оказанием медицинской помощи, состоянии его
 * здоровья и диагнозе, иные сведения, полученные при его медицинском обследовании и
 * лечении, составляют врачебную тайну.
 *
 * Федеральный закон № 152-ФЗ «О персональных данных» (специальные категории персональных данных, ст. 10):
 * Обработка специальных категорий персональных данных, касающихся состояния здоровья,
 * допускается исключительно медицинскими работниками, обязанными сохранять врачебную тайну.
 *
 * АРХИТЕКТУРНЫЙ ИНВАРИАНТ:
 * Если токен пользователя принадлежит роли маркетолога ("marketer") или администратора/
 * регистратора ресепшена ("receptionist", "administrator"), либо системного администратора ("admin")
 * БЕЗ подтвержденной клинической квалификации лечащего врача или ассистента:
 * Поля диагнозов (diagnosis, emr_records, odontogram, clinicalNotes, mkb10 и их производные)
 * ФИЗИЧЕСКИ вырезаются из JSON-ответов сервера ДО отправки на клиент.
 * Никаких скрытий на клиенте (CSS/JS) — данные не должны покидать защищенный периметр API!
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import { getRequestIdentity } from "./identity.js";

/**
 * Запрещенные поля медицинской тайны (в нижнем регистре для регистронезависимого сопоставления).
 */
export const FORBIDDEN_CLINICAL_FIELD_NAMES: ReadonlySet<string> = new Set([
	// Диагнозы и МКБ-10
	"diagnosis",
	"diagnoses",
	"diagnosisicd10",
	"diagnosis_icd10",
	"diagnosis_icd_10",
	"diagnosistooth",
	"diagnosis_tooth",
	"diagnosiscode",
	"diagnosisname",
	"maindiagnosismkb",
	"maindiagnosisname",
	"diagnosismkb",
	"clinicaldiagnosismkb10",
	"clinicaldiagnosisdescription",
	"previousdiagnosisicd10",
	"previousdiagnosistooth",
	"approveddiagnosiscodes",
	"diagnosishints",
	"mkb10",
	"mkb_10",
	"mkb",
	"icd10",
	"icd_10",

	// Электронная медицинская карта (ЭМК / EMR)
	"emr_records",
	"emrrecords",
	"emr_record",
	"emrrecord",
	"emr",
	"emk",
	"emkrecords",
	"emk_records",

	// Зубная формула, номера зубов и одонтограмма
	"odontogram",
	"odontogramdata",
	"tooth_states",
	"toothstates",
	"teethstates",
	"teethstate",
	"toothformula",
	"tooth_formula",
	"tooth_number",
	"toothnumber",
	"toothnumbers",
	"teeth",
	"surfaces",
	"toothsurfaces",
	"tooth_surfaces",
	"clinicalformula",
	"clinical_formula",
	"dentalformula",
	"dental_formula",

	// Клинические заметки, дневники и данные
	"clinicalnotes",
	"clinical_notes",
	"clinicalnote",
	"clinical_note",
	"clinicaldata",
	"clinical_data",
	"clinicalsummary",
	"clinical_summary",
	"medicalnotes",
	"medical_notes",
	"doctorsummary",
	"doctor_summary",
	"transcript",
	"draftautosave",
	"draft_autosave",

	// Клинический анамнез, жалобы, объективный статус, статус локалис и план лечения (323-ФЗ ст. 13)
	"anamnesis",
	"complaint",
	"complaints",
	"objectivestatus",
	"objective_status",
	"treatmentplan",
	"treatment_plan",
	"treatmentdescription",
	"treatment_description",
	"statuslocalis",
	"status_localis",
]);

/**
 * Роли, обладающие законным правом доступа к врачебной тайне (клинический персонал).
 */
export const CLINICAL_STAFF_ROLES: ReadonlySet<string> = new Set([
	"doctor",
	"chief_doctor",
	"chiefdoctor",
	"head_doctor",
	"assistant",
	"nurse",
	"hygienist",
	"surgeon",
	"therapist",
	"orthopedist",
	"orthodontist",
	"periodontist",
	"implantologist",
	"radiologist",
]);

/**
 * Роли, которым категорически запрещен доступ к врачебной тайне без клинической роли врача/ассистента.
 */
export const EXPLICIT_NON_CLINICAL_ROLES: ReadonlySet<string> = new Set([
	"marketer",
	"marketing",
	"receptionist",
	"administrator",
	"admin",
	"manager",
	"accountant",
	"finance",
	"bookkeeper",
	"call_center",
	"curator",
]);

export interface ClinicalAccessEvaluation {
	readonly hasClinicalAccess: boolean;
	readonly normalizedRole: string | null;
	readonly reason: string;
}

/**
 * Проверяет наличие клинического права доступа к врачебной тайне.
 */
export function evaluateClinicalAccess(
	rawRole: string | null | undefined,
	extra?: {
		clinicalRole?: string | null;
		canSignMedicalRecords?: boolean;
		specialties?: string[] | null;
	},
): ClinicalAccessEvaluation {
	if (!rawRole || typeof rawRole !== "string") {
		return {
			hasClinicalAccess: false,
			normalizedRole: null,
			reason: "Не указана роль сотрудника (отказ по умолчанию согласно 152-ФЗ)",
		};
	}

	const role = rawRole.trim().toLowerCase();

	// Владелец клиники
	if (role === "owner") {
		return {
			hasClinicalAccess: true,
			normalizedRole: "owner",
			reason: "Владелец клиники с полным доступом к документации",
		};
	}

	// Клинические роли (врачи, ассистенты, медсестры)
	if (CLINICAL_STAFF_ROLES.has(role)) {
		return {
			hasClinicalAccess: true,
			normalizedRole: role,
			reason: `Медицинский работник: роль «${role}»`,
		};
	}

	// Системный администратор (admin)
	if (role === "admin") {
		const clinicalRole = extra?.clinicalRole?.trim().toLowerCase();
		const isClinicalAdmin =
			(clinicalRole && CLINICAL_STAFF_ROLES.has(clinicalRole)) ||
			extra?.canSignMedicalRecords === true ||
			(Array.isArray(extra?.specialties) && extra.specialties.length > 0);

		if (isClinicalAdmin) {
			return {
				hasClinicalAccess: true,
				normalizedRole: "admin_clinical",
				reason: "Администратор с подтвержденной квалификацией врача/ассистента",
			};
		}

		return {
			hasClinicalAccess: false,
			normalizedRole: "admin",
			reason: "Системный администратор без клинической роли (аппаратная блокировка врачебной тайны)",
		};
	}

	// Маркетолог
	if (role === "marketer" || role === "marketing") {
		return {
			hasClinicalAccess: false,
			normalizedRole: "marketer",
			reason: "Маркетолог не является медработником (152-ФЗ / 323-ФЗ)",
		};
	}

	// Администратор / Ресепшен
	if (role === "receptionist" || role === "administrator") {
		return {
			hasClinicalAccess: false,
			normalizedRole: role,
			reason: "Сотрудник регистратуры не является лечащим врачом (152-ФЗ / 323-ФЗ)",
		};
	}

	// Любая иная неклиническая роль
	return {
		hasClinicalAccess: false,
		normalizedRole: role,
		reason: `Роль «${role}» не имеет доступа к врачебной тайне (152-ФЗ)`,
	};
}

/**
 * Определяет, требуется ли усечение медицинской тайны для текущего HTTP-запроса.
 */
export function shouldStripMedicalData(request: FastifyRequest): boolean {
	const identity = getRequestIdentity(request);
	const reqAny = request as unknown as {
		user?: {
			role?: string | null;
			id?: string | null;
			canSignMedicalRecords?: boolean;
			clinicalRole?: string | null;
		};
	};

	// Роль сотрудника определяется ИСКЛЮЧИТЕЛЬНО из проверенного токена identity.role или request.user.
	// Чтение недоверенных заголовков x-user-role / x-staff-role / x-forwarded-role категорически ЗАПРЕЩЕНО!
	const rawRole = identity.role ?? reqAny.user?.role ?? null;

	// Fail-closed защита врачебной тайны (152-ФЗ / 323-ФЗ ст. 13):
	// Если токен сотрудника отсутствует вовсе (например, голая сессия клиники без врача),
	// доступ к диагнозам категорически ЗАПРЕЩЕН -> усекаем полезную нагрузку (fail-closed = true)!
	if (!rawRole) {
		return true;
	}

	// Полномочия и клиническая роль берутся ТОЛЬКО из проверенного токена или БД.
	// Чтение недоверенных заголовков x-clinical-role и x-can-sign-medical-records УДАЛЕНО ПОЛНОСТЬЮ!
	const clinicalRoleClaim =
		(identity as unknown as { clinicalRole?: string | null }).clinicalRole ??
		reqAny.user?.clinicalRole ??
		null;

	const canSignMedicalRecords =
		(identity as unknown as { canSignMedicalRecords?: boolean })
			.canSignMedicalRecords ??
		reqAny.user?.canSignMedicalRecords ??
		false;

	const evalResult = evaluateClinicalAccess(rawRole, {
		clinicalRole: clinicalRoleClaim,
		canSignMedicalRecords,
	});

	// Если нет клинического доступа — требуется аппаратное усечение
	return !evalResult.hasClinicalAccess;
}

/**
 * Паттерны клинических диагнозов и врачебных терминов (152-ФЗ / 323-ФЗ ст. 13),
 * подлежащие аппаратной санитизации в строковых значениях для неклинических ролей.
 */
export const CLINICAL_DIAGNOSTIC_PATTERNS: readonly RegExp[] = [
	/K0[0-9](?:\.\d+)?/gi,
	/(?:зуб[а-я]*|tooth)\s*#?\s*([1-4][1-8]|[5-8][1-5]|\d{1,2})/gi,
	/пульпит\S*/gi,
	/кариес\S*/gi,
	/экстирпаци\S*/gi,
	/препарировани\S*/gi,
	/депульпаци\S*/gi,
	/периодонтит\S*/gi,
	/пародонтит\S*/gi,
	/гингивит\S*/gi,
	/периостит\S*/gi,
	/альвеолит\S*/gi,
	/стоматит\S*/gi,
	/кист[аеыу]\S*/gi,
	/гранул[её]м\S*/gi,
	/резекци\S*/gi,
	/анестези\S*/gi,
	/ультракаин\S*/gi,
	/артикаин\S*/gi,
	/лидокаин\S*/gi,
	/имплантат\S*/gi,
	/имплантаци\S*/gi,
	/синус[_\-]?лифтинг\S*/gi,
	/остеомиелит\S*/gi,
	/флегмон\S*/gi,
	/абсцесс\S*/gi,
	/\b(?:ВИЧ|СПИД|HIV|AIDS)\b/gi,
	/гепатит\S*/gi,
	/сифилис\S*/gi,
	/туберкулез\S*/gi,
	/онкологи\S*/gi,
	/новообразовани\S*/gi,
	/карцином\S*/gi,
	/острая\s+боль\S*/gi,
	/ночные\s+боли\S*/gi,
];

export function sanitizeClinicalString(str: string): string {
	let result = str;
	for (const pattern of CLINICAL_DIAGNOSTIC_PATTERNS) {
		result = result.replace(pattern, "[Сведения защищены 152-ФЗ]");
	}
	return result;
}

/**
 * Рекурсивно вырезает все поля медицинской тайны из объекта, массива или полезной нагрузки.
 */
export function stripDiagnosisPayload<T>(payload: T): T {
	if (payload === null || payload === undefined) {
		return payload;
	}

	if (Array.isArray(payload)) {
		return payload.map((item) => stripDiagnosisPayload(item)) as unknown as T;
	}

	if (typeof payload === "string") {
		return sanitizeClinicalString(payload) as unknown as T;
	}

	if (typeof payload === "object") {
		// Не трогаем специальные системные объекты
		if (
			payload instanceof Date ||
			payload instanceof RegExp ||
			Buffer.isBuffer(payload)
		) {
			return payload;
		}

		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(
			payload as Record<string, unknown>,
		)) {
			const lowerKey = key.toLowerCase();
			if (FORBIDDEN_CLINICAL_FIELD_NAMES.has(lowerKey)) {
				// ФИЗИЧЕСКОЕ ИСКЛЮЧЕНИЕ: ключ просто не попадает в итоговый объект
				continue;
			}
			result[key] = stripDiagnosisPayload(value);
		}
		return result as T;
	}

	return payload;
}

/**
 * Проверяет, содержит ли сериализованная JSON-строка хотя бы один запрещенный ключ.
 */
export function hasForbiddenClinicalKeyInJson(jsonStr: string): boolean {
	return /"(?:diagnosis|diagnoses|diagnosisicd10|diagnosistooth|mkb10|mkb_10|emr_records|emrrecords|emk|odontogram|clinicalnotes|clinical_notes|clinicaldata|clinical_data|tooth_states|toothstates|toothformula|tooth_formula|tooth_number|toothnumber|toothnumbers|teeth|surfaces|toothsurfaces|clinicalsummary|clinical_summary|medicalnotes|medical_notes|doctorsummary|doctor_summary|transcript|draftautosave|draft_autosave|anamnesis|complaint|complaints|objectivestatus|objective_status|treatmentplan|treatment_plan|treatmentdescription|treatment_description|statuslocalis|status_localis)"\s*:/i.test(
		jsonStr,
	);
}

/**
 * Безопасно усекает поля из JSON-строки.
 */
export function stripDiagnosisJsonString(jsonStr: string): string {
	try {
		const parsed = JSON.parse(jsonStr);
		const stripped = stripDiagnosisPayload(parsed);
		return JSON.stringify(stripped);
	} catch {
		return jsonStr;
	}
}

/**
 * Регистрация глобальных Fastify-хуков для гарантированного усечения данных врачебной тайны (152-ФЗ / 323-ФЗ).
 */
export function registerMedicalSecrecyPayloadStripping(app: FastifyInstance) {
	// Хук 1: preSerialization — перехватывает JS-объект до его сериализации
	app.addHook("preSerialization", async (request, _reply, payload) => {
		if (shouldStripMedicalData(request)) {
			return stripDiagnosisPayload(payload);
		}
		return payload;
	});

	// Хук 2: onSend — аппаратная защита на случай прямого вызова reply.send(rawJsonString)
	app.addHook("onSend", async (request, reply, payload) => {
		if (shouldStripMedicalData(request) && typeof payload === "string") {
			const contentType = reply.getHeader("content-type");
			if (
				typeof contentType === "string" &&
				contentType.includes("application/json")
			) {
				if (hasForbiddenClinicalKeyInJson(payload)) {
					return stripDiagnosisJsonString(payload);
				}
			}
		}
		return payload;
	});
}
