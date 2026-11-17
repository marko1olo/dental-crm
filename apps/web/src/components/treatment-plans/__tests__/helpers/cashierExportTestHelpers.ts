import type { Kopecks } from "@dental/shared";
import type { ToothData } from "../../../odontogram/ToothChart.js";
import type { TreatmentPlanStage, TreatmentPlanTier } from "../../types/index.js";
import type { AppLogicContextType } from "../../../../contexts/AppLogicContext.js";

export class MockLocalStorage implements Storage {
	private store: Record<string, string> = {};
	get length(): number { return Object.keys(this.store).length; }
	key(index: number): string | null { return Object.keys(this.store)[index] ?? null; }
	getItem(key: string): string | null { return this.store[key] ?? null; }
	setItem(key: string, value: string): void { this.store[key] = String(value); }
	removeItem(key: string): void { delete this.store[key]; }
	clear(): void { this.store = {}; }
	[name: string]: unknown;
}

export const mockSampleTeeth: ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес" },
	{ toothNumber: 36, state: "Missing", notes: "Адентия" },
];

export const mockCashierAppContext: Partial<AppLogicContextType> = {
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
	};
}
