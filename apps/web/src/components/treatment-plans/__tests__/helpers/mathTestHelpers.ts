import type { Kopecks } from "@dental/shared";
import { calculateChairsideInstallments, calculateChairsideTaxDeduction } from "../../treatmentPlanMath";
import type { TreatmentPlanTier } from "../../types";

export const sampleBaseTier: TreatmentPlanTier = {
	tierId: "optimum",
	title: "Оптимальный",
	subtitle: "Надежный баланс",
	badge: "Рекомендация врача",
	badgeClass: "badge-optimum",
	borderClass: "border-optimum",
	isRecommended: true,
	totalRub: 0,
	totalKopecks: 0 as Kopecks,
	durationWeeks: 0,
	durationVisits: 0,
	warrantyYears: 3,
	materialsHeadline: "Керамика и титан",
	materialsList: ["Керамика E.max", "Импланты Osstem"],
	keyAdvantages: ["Долговечность 15+ лет"],
	stages: [],
	itemsCount: 0,
	ndflRefundRub: 0,
	priceWithNdflRefundRub: 0,
	monthlyInstallment12Rub: 0,
	installments: calculateChairsideInstallments(0 as Kopecks),
	ndflDetails: calculateChairsideTaxDeduction(0 as Kopecks, false),
};
