import { useMemo, useEffect } from "react";
import { useDocumentStore } from "../../store/documentStore";
import type { Dashboard } from "@dental/shared";
import { parseKopecks, sumKopecks, multiplyKopecks, percentageOfKopecks } from "@dental/shared";
import { completedActContractReferenceForUi } from "../../workspaceUiLabels";

export interface BillingDocumentLogicProps {
    dashboard: any;
    documentPatient: any;
    activeTreatmentPlanItems: any[];
    activeUsableDocuments: any[];
    activePayments: any[];
    activeDocuments: any[];
}

export function useBillingDocumentLogic(props: BillingDocumentLogicProps) {
    const { dashboard, documentPatient, activeTreatmentPlanItems, activeUsableDocuments, activePayments, activeDocuments } = props;
    
    const documentState = useDocumentStore();
    const {
        selectedDocumentKind,
        completedActContractNumber,
        setCompletedActContractNumber,
        completedActLinkedContractDocumentId
    } = documentState;

    const activeIssuedPaidContracts = useMemo(() => {
		return activeDocuments
			.filter(
				(document) =>
					document.kind === "paid_medical_services_contract" &&
					document.status === "issued" &&
					document.visitId !== null,
			)
			.sort((left, right) =>
				(right.issuedAt ?? "").localeCompare(left.issuedAt ?? ""),
			);
	}, [activeDocuments]);

    const selectedCompletedActContractDocumentId = useMemo(() => {
		if (
			activeIssuedPaidContracts.some(
				(document) => document.id === completedActLinkedContractDocumentId,
			)
		) {
			return completedActLinkedContractDocumentId;
		}
		return activeIssuedPaidContracts.length === 1
			? (activeIssuedPaidContracts[0]?.id ?? "")
			: "";
	}, [activeIssuedPaidContracts, completedActLinkedContractDocumentId]);

    useEffect(() => {
		if (
			completedActContractNumber.trim() ||
			!selectedCompletedActContractDocumentId
		)
			return;
		const contract = activeIssuedPaidContracts?.find(
			(document) => document.id === selectedCompletedActContractDocumentId,
		);
		if (contract)
			setCompletedActContractNumber(
				completedActContractReferenceForUi(contract),
			);
	}, [
		activeIssuedPaidContracts,
		completedActContractNumber,
		selectedCompletedActContractDocumentId,
		setCompletedActContractNumber,
	]);

    const patientBillingSummary = useMemo<Dashboard["billingSummary"] | null>(() => {
		if (!dashboard || !documentPatient) return null;
		const activePlanItems = activeTreatmentPlanItems.filter(
			(item) => item.status !== "cancelled",
		);
		/*
		 * Округление до копейки, а не до рубля.
		 *
		 * Умножение и сложение денег в плавающей точке оставляет хвост
		 * (1500.10 * 3 = 4500.299999999999), и без этого шага он доезжает до
		 * экрана и до тела запроса. Тот же приём — Math.round(x * 100) / 100 —
		 * уже применяется на сервере в apps/api/src/documents/guards.ts, где
		 * строки сметы сверяются с итогом, поэтому веб и сервер считают строку
		 * одинаково. Целочисленная алгебра копеек живёт в
		 * packages/shared/src/utils/money.ts, но её parseKopecks по замыслу
		 * БРОСАЕТ на неожидаемом значении, а данные дашборда на клиенте схемой не
		 * проверяются: исключение внутри useMemo погасило бы экран целиком.
		 */
		const treatmentLineTotalKopecks = (
			item: (typeof activePlanItems)[number],
		) => {
			const unitKopecks = parseKopecks(item.unitPriceRub);
			const quantity = Math.max(0, Math.round(item.quantity));
			const subtotalKopecks = multiplyKopecks(unitKopecks, quantity);
			const discountKopecks = parseKopecks(item.discountRub);
			return Math.max(0, subtotalKopecks - discountKopecks);
		};
		const totalPlannedKopecks = sumKopecks(
			activePlanItems.map((item) => treatmentLineTotalKopecks(item)),
		);
		const totalDiscountKopecks = sumKopecks(
			activePlanItems.map((item) => parseKopecks(item.discountRub)),
		);
		const totalPaidKopecks = sumKopecks(
			activePayments
				.filter((payment) => payment.status === "paid")
				.map((payment) => parseKopecks(payment.amountRub)),
		);
		const taxDeductionEligibleKopecks = sumKopecks(
			activePlanItems.map((item) => {
				const service = dashboard.serviceCatalog?.find(
					(candidate) => candidate.id === item.serviceId,
				);
				return service?.taxDeductible ? treatmentLineTotalKopecks(item) : 0;
			}),
		);
		const draftDocumentAmountKopecks = sumKopecks(
			activeUsableDocuments
				.filter((document) => document.status === "draft")
				.map((document) => parseKopecks(document.totalAmountRub ?? 0)),
		);
		const unpaidDocuments = activeUsableDocuments.filter(
			(document) =>
				document.status === "draft" &&
				(document.totalAmountRub ?? 0) > 0 &&
				!activePayments.some(
					(payment) =>
						payment.status === "paid" && payment.documentId === document.id,
				),
		).length;
		let insuranceCoverageKopecks = 0;
		// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		const patientAny = documentPatient as any;
		if (
			patientAny?.insuranceContractId ||
			patientAny?.administrativeProfile?.insuranceContractId
		) {
			const contractId =
				patientAny.insuranceContractId ||
				patientAny.administrativeProfile?.insuranceContractId;
			const contract = dashboard?.insuranceContracts?.find(
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				(c: any) => c.id === contractId,
			);
			if (contract?.isActive) {
				let accumulatedKopecks = 0;
				for (const item of activePlanItems) {
					const service = dashboard.serviceCatalog?.find(
						// biome-ignore lint/suspicious/noExplicitAny: automated suppression
						(s: any) => s.id === item.serviceId,
					);
					const category = service?.category || "other";
					let pct = 0;
					if (
						category === "therapy" ||
						category === "consultation" ||
						category === "periodontology"
					)
						pct = contract.coverageTherapyPct || 0;
					else if (category === "surgery")
						pct = contract.coverageSurgeryPct || 0;
					else if (category === "orthodontics" || category === "prosthetics")
						pct = contract.coverageOrthoPct || 0;
					else if (category === "hygiene")
						pct = contract.coverageHygienePct || 0;

					const lineKopecks = treatmentLineTotalKopecks(item);
					const basisPoints = Math.round(pct * 100);
					accumulatedKopecks += percentageOfKopecks(lineKopecks, basisPoints);
				}

				const annualLimitKopecks = parseKopecks(contract.annualLimitRub ?? 0);
				insuranceCoverageKopecks =
					annualLimitKopecks > 0
						? Math.min(accumulatedKopecks, annualLimitKopecks)
						: accumulatedKopecks;
			}
		}

		const totalPlannedRub = totalPlannedKopecks / 100;
		const totalDiscountRub = totalDiscountKopecks / 100;
		const totalPaidRub = totalPaidKopecks / 100;
		const insuranceCoverageRub = insuranceCoverageKopecks / 100;
		const taxDeductionEligibleRub = taxDeductionEligibleKopecks / 100;
		const draftDocumentAmountRub = draftDocumentAmountKopecks / 100;
		const totalDueKopecks = Math.max(
			0,
			totalPlannedKopecks - insuranceCoverageKopecks - totalPaidKopecks,
		);
		const totalDueRub = totalDueKopecks / 100;

		return {
			totalPlannedRub,
			totalDiscountRub,
			totalPaidRub,
			totalDueRub,
			taxDeductionEligibleRub,
			draftDocumentAmountRub,
			openTreatmentItems: activePlanItems.filter(
				(item) => item.status !== "completed",
			).length,
			unpaidDocuments,
			insuranceCoverageRub,
		};
	}, [
		activePayments,
		activeTreatmentPlanItems,
		activeUsableDocuments,
		dashboard,
		documentPatient?.id,
		documentPatient,
	]);


    return {
        activeIssuedPaidContracts,
        selectedCompletedActContractDocumentId,
        patientBillingSummary
    };
}
