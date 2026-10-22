import type { Kopecks } from "@dental/shared";
import type { ToothData } from "../../../odontogram/ToothChart.js";
import type { TreatmentPlanStage, TreatmentPlanTier } from "../../types.js";

export class MockLocalStorage {
	private store: Record<string, string> = {};
	getItem(key: string): string | null { return this.store[key] ?? null; }
	setItem(key: string, value: string): void { this.store[key] = String(value); }
	removeItem(key: string): void { delete this.store[key]; }
	clear(): void { this.store = {}; }
}

export const mockSampleTeeth: ToothData[] = [
	{ id: 16, toothNumber: 16, state: "Caries", systemicNotes: "Глубокий кариес" } as ToothData,
	{ id: 36, toothNumber: 36, state: "Missing", systemicNotes: "Адентия" } as ToothData,
];

export const mockCashierAppContext = {
	dashboard: {
		serviceCatalog: [
			{ id: "srv-caries", code: "A16.07.002", title: "Лечение глубокого кариеса", category: "Терапия", basePriceRub: 4500, active: true },
			{ id: "srv-implant", code: "A16.07.054", title: "Установка дентального имплантата", category: "Хирургия", basePriceRub: 35000, active: true },
		],
		patients: [
			{ id: "PAT-WAVE62", fullName: "Волков Дмитрий Андреевич", name: "Волков Дмитрий Андреевич", phone: "+7 (999) 111-22-33", balanceRub: 15000, administrativeProfile: { curatorFullName: "Семенова Ирина Павловна" } },
		],
	},
	auth: {
		currentUser: { id: "DOC-WAVE62", name: "Д-р Кузнецов М. С.", role: "doctor" },
	},
};

export function buildMockTier(stages: TreatmentPlanStage[], totalRub = 8000, totalKopecks = 800000 as Kopecks): TreatmentPlanTier {
	return {
		tierId: "optimum",
		title: "Оптимальный",
		subtitle: "Надежный баланс",
		badge: "Рекомендация врача",
		badgeClass: "badge-optimum",
		borderClass: "border-optimum",
		isRecommended: true,
		totalRub,
		totalKopecks,
		durationWeeks: 1,
		durationVisits: 1,
		warrantyYears: 2,
		materialsHeadline: "Композит",
		materialsList: ["Filtek"],
		keyAdvantages: ["Гарантия 2 года"],
		stages,
		itemsCount: stages.reduce((acc, s) => acc + s.items.length, 0),
		ndflRefundRub: 1040,
		priceWithNdflRefundRub: 6960,
		monthlyInstallment12Rub: 667,
		installments: {} as any,
		ndflDetails: {} as any,
	};
}
