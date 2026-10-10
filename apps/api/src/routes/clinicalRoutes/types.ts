import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { unguardedBypassAllowed } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { CLINICAL_PHASE_CODES } from "../../services/clinical/ClinicalRouter.js";

export type ClinicalPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};

/*
 * ТЕКСТ ОТКАЗА НАЗЫВАЕТ, ЧТО ИСПРАВИТЬ. Это не украшение: врач читает его на
 * экране и по нему чинит ввод.
 *
 * ВОССТАНОВЛЕНО 2026-08-09 после доказанной регрессии. Коммит 31e77afcd
 * («chore: resolve all remaining TypeScript errors in api after imaging
 * migration», 2026-07-04) заменил обе формулировки на общие: «Ошибка
 * валидации: запрос не соответствует формату» и «Ошибка валидации: данные
 * правила некорректны». По ним нельзя понять, чего не хватает, — врач упирается
 * в отказ и не может его снять. Коммит заявлен как починка типов, порчу текста
 * он не упоминал.
 *
 * ПОЧЕМУ ПЯТЬ НЕДЕЛЬ НИКТО НЕ ЗАМЕТИЛ. Регрессию ловит гейт
 * scripts/smoke-core-route-validation.mjs; он входит в smoke:all и в CI
 * выполнялся — но шаг стоял под четырьмя независимыми глушителями
 * (continue-on-error, set +e, конвейер, exit 0), поэтому его краснота ни на что
 * не влияла. Вдобавок гейт умирал на ПЕРВОЙ находке и прятал три остальные из
 * четырёх. Оба дефекта устранены тем же ходом.
 */
export const clinicalRuleEvaluationValidationMessage =
	"Клинические правила не проверены: передайте пациента, визит и факты приема.";
export const clinicalRuleMutationValidationMessage =
	"Клиническое правило не сохранено: заполните название, условие и действие правила.";

export function parseClinicalPayload<T>(
	schema: ClinicalPayloadSchema<T>,
	value: unknown,
): T | null {
	const parsed = schema.safeParse(value);
	if (!parsed.success) return null;
	return parsed.data;
}

/**
 * Колонки clinical_tasks имеют тип uuid: строка неверного формата доходит до
 * PostgreSQL и возвращается пятисоткой «invalid input syntax for type uuid».
 * Проверяем формат заранее, чтобы клиент получил внятные 400, а не 500.
 */
export const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function optionalUuid(value: unknown): string | null | undefined {
	if (value === undefined || value === null || value === "") return null;
	if (typeof value !== "string" || !UUID_PATTERN.test(value)) return undefined;
	return value;
}

export const clinicalPhaseCompletionValidationMessage = `Ошибка валидации: нужен patientId в формате UUID и completedPhaseCode из списка: ${CLINICAL_PHASE_CODES.join(", ")}.`;

/**
 * POST /api/hr/recent-patients: тело раньше — bare cast
 * `request.body as { patientId?: unknown } | undefined`.
 * Zod safeParse после requireStaffIdentity → 400 с прежним PatientIdRequired.
 */
export const recentPatientViewBodySchema = z.object({
	patientId: z.unknown().optional(),
});

export function resolveClinicalStaffRole(request: FastifyRequest): string | null {
	const identity = getRequestIdentity(request);
	return (
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		(unguardedBypassAllowed("DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS")
			? "doctor"
			: null)
	);
}
