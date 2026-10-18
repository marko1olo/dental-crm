export type CohortTreatmentCategory =
	| "sanitation"
	| "implantation"
	| "orthodontics"
	| "general_therapy";

export interface RecallCohortData {
	readonly cohortKey: string;
	readonly cohortLabel: string;
	readonly cohortMonth?: string | undefined;
	readonly category: CohortTreatmentCategory;
	readonly categoryLabel: string;
	readonly totalPatients: number;
	readonly returned6m: number;
	readonly rate6m: number;
	readonly returned12m: number;
	readonly rate12m: number;
	readonly recallRevenueKopecks: number;
	readonly healthTone: "ok" | "warn" | "bad";
}

export function calculateRecallRates(
	totalOrCohort: number | { totalPatients: number; returned6m: number; returned12m: number },
	returned6m?: number,
	returned12m?: number,
): { rate6m: number; rate12m: number; healthTone: "ok" | "warn" | "bad" } {
	if (typeof totalOrCohort === "object" && totalOrCohort !== null) {
		return calculateRecallRates(
			totalOrCohort.totalPatients,
			totalOrCohort.returned6m,
			totalOrCohort.returned12m,
		);
	}
	const totalPatients = totalOrCohort;
	if (!Number.isFinite(totalPatients) || totalPatients <= 0) {
		return { rate6m: 0, rate12m: 0, healthTone: "bad" };
	}
	const safe6m = Math.max(
		0,
		Math.min(totalPatients, Number.isFinite(returned6m) ? (returned6m as number) : 0),
	);
	const safe12m = Math.max(
		0,
		Math.min(totalPatients, Number.isFinite(returned12m) ? (returned12m as number) : 0),
	);

	const rate6m = Math.round((safe6m / totalPatients) * 1000) / 10;
	const rate12m = Math.round((safe12m / totalPatients) * 1000) / 10;

	const healthTone: "ok" | "warn" | "bad" =
		rate6m >= 65 || rate12m >= 65
			? "ok"
			: rate6m >= 45 || rate12m >= 45
				? "warn"
				: "bad";

	return { rate6m, rate12m, healthTone };
}
