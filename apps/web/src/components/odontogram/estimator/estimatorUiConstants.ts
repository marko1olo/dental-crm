import { PLAN_SUBJECT } from "../treatmentEstimatorTypes";

export { PLAN_SUBJECT };

export const ESTIMATOR_PHASES = [1, 2, 3] as const;

export const PAPER_SIGNATURE_DATA_URL =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='60'><rect width='100%' height='100%' fill='%23f0fdf4' stroke='%2316a34a' rx='6'/><text x='120' y='25' text-anchor='middle' font-family='sans-serif' font-size='11' font-weight='bold' fill='%2315803d'>ПОДПИСАНО НА БУМАГЕ</text><text x='120' y='45' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%23166534'>Смета согласована</text></svg>";

export function getPhaseTitle(phase: number): string {
	switch (phase) {
		case 1:
			return "I. Терапия (Санация)";
		case 2:
			return "II. Хирургия и Имплантация";
		case 3:
			return "III. Ортопедия (Протезирование)";
		default:
			return `Этап ${phase}`;
	}
}
