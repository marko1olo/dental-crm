import { useMemo } from "react";
import {
	type Dashboard,
	type GeneratedDocument,
	type Patient,
	type Payment,
	type TreatmentPlanItem,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	sumKopecks,
} from "@dental/shared";

export interface UseDocumentPatientBillingSummaryProps {
	dashboard: Dashboard | null;
	documentPatient: Patient | null;
	activeTreatmentPlanItems: TreatmentPlanItem[];
	activePayments: Payment[];
	activeUsableDocuments: GeneratedDocument[];
}

export function useDocumentPatientBillingSummary({
	dashboard,
	documentPatient,
	activeTreatmentPlanItems,
	activePayments,
	activeUsableDocuments,
}: UseDocumentPatientBillingSummaryProps) {
	return useMemo<Dashboard["billingSummary"] | null>(() => {
		if (!dashboard || !documentPatient) return null;
		const activePlanItems = activeTreatmentPlanItems.filter(
			(item) => item.status !== "cancelled",
		);

		const treatmentLineTotalKopecks = (item: (typeof activePlanItems)[number]) => {
			const raw = item as unknown as { unitPriceRub?: number; priceRub?: number };
			const unitKopecks = parseKopecks(raw.unitPriceRub ?? raw.priceRub ?? 0);
			const quantity = Math.max(0, Math.round(Number(item.quantity) || 1));
			const subtotalKopecks = multiplyKopecks(unitKopecks, quantity);
			const discountKopecks = parseKopecks(item.discountRub ?? 0);
			return Math.max(0, subtotalKopecks - discountKopecks);
		};

		const totalPlannedKopecks = sumKopecks(activePlanItems.map((item) => treatmentLineTotalKopecks(item)));
		const totalDiscountKopecks = sumKopecks(activePlanItems.map((item) => parseKopecks(item.discountRub)));
		const totalPaidKopecks = sumKopecks(
			activePayments.filter((p) => p.status === "paid").map((p) => parseKopecks(p.amountRub)),
		);
		const taxDeductionEligibleKopecks = sumKopecks(
			activePlanItems.map((item) => {
				const service = dashboard.serviceCatalog?.find((s) => s.id === item.serviceId);
				return service?.taxDeductible ? treatmentLineTotalKopecks(item) : 0;
			}),
		);
		const draftDocumentAmountKopecks = sumKopecks(
			activeUsableDocuments
				.filter((doc) => doc.status === "draft")
				.map((doc) => parseKopecks(doc.totalAmountRub ?? 0)),
		);
		const unpaidDocuments = activeUsableDocuments.filter(
			(doc) =>
				doc.status === "draft" &&
				(doc.totalAmountRub ?? 0) > 0 &&
				!activePayments.some((p) => p.status === "paid" && p.documentId === doc.id),
		).length;

		let insuranceCoverageKopecks = 0;
		const contractId = (documentPatient?.administrativeProfile as any)?.insuranceContractId;
		if (contractId) {
			const contract = dashboard?.insuranceContracts?.find((c) => c.id === contractId);
			if (contract?.isActive) {
				let accumulatedKopecks = 0;
				for (const item of activePlanItems) {
					const service = dashboard.serviceCatalog?.find((s) => s.id === item.serviceId);
					const category = service?.category || "other";
					let pct = 0;
					if (category === "therapy" || category === "consultation" || category === "periodontology") {
						pct = contract.coverageTherapyPct || 0;
					} else if (category === "surgery") {
						pct = contract.coverageSurgeryPct || 0;
					} else if (category === "orthodontics" || category === "prosthetics") {
						pct = contract.coverageOrthoPct || 0;
					} else if (category === "hygiene") {
						pct = contract.coverageHygienePct || 0;
					}
					const basisPoints = Math.round(pct * 100);
					accumulatedKopecks += percentageOfKopecks(treatmentLineTotalKopecks(item), basisPoints);
				}
				const annualLimitKopecks = parseKopecks(contract.annualLimitRub ?? 0);
				insuranceCoverageKopecks = annualLimitKopecks > 0 ? Math.min(accumulatedKopecks, annualLimitKopecks) : accumulatedKopecks;
			}
		}

		return {
			totalPlannedRub: totalPlannedKopecks / 100,
			totalDiscountRub: totalDiscountKopecks / 100,
			totalPaidRub: totalPaidKopecks / 100,
			totalDueRub: Math.max(0, totalPlannedKopecks - insuranceCoverageKopecks - totalPaidKopecks) / 100,
			taxDeductionEligibleRub: taxDeductionEligibleKopecks / 100,
			draftDocumentAmountRub: draftDocumentAmountKopecks / 100,
			openTreatmentItems: activePlanItems.filter((i) => i.status !== "completed").length,
			unpaidDocuments,
			insuranceCoverageRub: insuranceCoverageKopecks / 100,
		};
	}, [activePayments, activeTreatmentPlanItems, activeUsableDocuments, dashboard, documentPatient]);
}
