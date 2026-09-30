/**
 * visitDiaryTypes.ts
 * ============================================================================
 * Базовые типы, интерфейсы и константы дневника приёма Формы 043/у.
 * Приказы Минздрава РФ № 804н, 1051н.
 * ============================================================================
 */

export const COMPLAINT_QUICK_CHIPS = [
	"Острая боль от сладкого/холодного",
	"Ноющие ночные боли",
	"Выпала пломба",
	"Плановый осмотр / Жалоб нет",
	"Кровоточивость десен",
] as const;

export interface VisitDiarySectionProps {
	visitId: string;
	patientId: string;
	teethData?: readonly {
		toothNumber: number;
		state: string;
		surfaces?: readonly string[] | null;
	}[];
}

export function formatPersonName(
	p:
		| {
				lastName?: string | null;
				firstName?: string | null;
				middleName?: string | null;
				fullName?: string | null;
		  }
		| null
		| undefined,
): string {
	if (!p) return "—";
	if (typeof p.fullName === "string" && p.fullName.trim())
		return p.fullName.trim();
	const parts = [p.lastName, p.firstName, p.middleName]
		.map((x) => (typeof x === "string" ? x.trim() : ""))
		.filter(Boolean);
	return parts.length ? parts.join(" ") : "—";
}
