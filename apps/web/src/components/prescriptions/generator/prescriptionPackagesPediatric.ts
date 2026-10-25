/**
 * prescriptionPackagesPediatric.ts — Pediatric Dose Calculation for Packages
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

export function calculatePediatricIbuprofenDose(weightKg: number): {
	readonly singleDoseMg: number;
	readonly singleDoseMl: number;
	readonly maxDailyDoseMg: number;
	readonly signaRu: string;
} {
	const validWeight = Math.max(5, Math.min(60, Number(weightKg) || 10));
	const singleDoseMg = Math.round(validWeight * 10);
	const singleDoseMl = Number((validWeight / 2).toFixed(1));
	const maxDailyDoseMg = singleDoseMg * 3;
	return {
		singleDoseMg,
		singleDoseMl,
		maxDailyDoseMg,
		signaRu: `S. Внутрь с помощью мерного шприца по ${singleDoseMl} мл (${singleDoseMg} мг) до 3 раз в сутки при боли или температуре с интервалом не менее 6 часов (расчет на вес ребенка ${validWeight} кг).`,
	};
}
