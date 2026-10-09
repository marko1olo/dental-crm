import type { DomainStateHydrationReport } from "./types.js";

/**
 * Срезы, молчаливая деградация которых недопустима.
 *
 * ПОЧЕМУ ИМЕННО ЭТИ. По ним пользователь принимает денежное или клиническое
 * решение: остаток по плану лечения и платежи — это касса, правила и приёмы —
 * это лечение. Пустой список здесь неотличим от «долгов нет» и «противопоказаний
 * нет», и цена ошибки — деньги пациента или его здоровье. Поэтому сорвавшийся
 * срез из этого набора обязан дать отказ (5xx), а не тихую нулевую сводку.
 *
 * Остальные срезы деградируют мягко: их отказ виден в `unavailable` и в журнале,
 * но не гасит рабочий день клиники целиком. Уронить всю сводку из-за одного
 * отвалившегося среза значит превратить частичный отказ в полный, а отказ,
 * срабатывающий на любом сетевом таймауте, быстро перестают читать.
 */
export const CRITICAL_SLICES = new Set([
	"treatmentItems",
	"payments",
	"visits",
	"patients",
]);

/** Отказ чтения среза, по которому принимают денежное или клиническое решение. */
export class DomainStateSliceUnavailableError extends Error {
	readonly slices: Array<{ slice: string; message: string }>;

	constructor(slices: Array<{ slice: string; message: string }>) {
		super(
			`Не удалось прочитать данные клиники: ${slices.map((entry) => `${entry.slice} - ${entry.message}`).join(", ")}.`,
		);
		this.name = "DomainStateSliceUnavailableError";
		this.slices = slices;
	}
}

/**
 * Отказать, если сорвался срез, по которому принимают денежное или клиническое
 * решение. Остальные отказы остаются в отчёте и в журнале.
 */
export function assertCriticalSlicesAvailable(
	report: DomainStateHydrationReport,
): void {
	const critical = report.unavailable.filter((entry) =>
		CRITICAL_SLICES.has(entry.slice),
	);
	if (critical.length > 0) throw new DomainStateSliceUnavailableError(critical);
}
