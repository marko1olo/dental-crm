/**
 * FinanceAccountingExportModalSubhost.tsx — Subhost for Accounting & 1C Export Modal.
 * Wave 130 & Mandate 8b (<= 120 lines).
 */
import React, { lazy, Suspense } from "react";

const Billing1CExportModal = lazy(() =>
	import("../../../components/finance/Billing1CExportModal").then((m) => ({ default: m.Billing1CExportModal })),
);

export interface FinanceAccountingExportModalSubhostProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly clinicInn?: string | undefined;
	readonly clinicKpp?: string | undefined;
}

export function FinanceAccountingExportModalSubhost(
	props: FinanceAccountingExportModalSubhostProps,
): React.JSX.Element | null {
	if (!props.isOpen) return null;

	return (
		<Suspense fallback={null}>
			<Billing1CExportModal
				isOpen={props.isOpen}
				onClose={props.onClose}
				patientName={props.patientName || "Иванов Иван Иванович"}
				patientId={props.patientId || "00000000-0000-0000-0000-000000000001"}
				clinicName={props.clinicName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
				clinicInn={props.clinicInn || "7707083893"}
				clinicKpp={props.clinicKpp || "770701001"}
				contractNumber="Д-2026/01"
				doctorName="Смирнов А.В."
				items={[
					{ id: "1", code804n: "A16.07.002", name: "Восстановление зуба пломбой (светоотверждаемый композит)", priceRub: 4500, quantity: 1, toothNumber: 16 },
					{ id: "2", code804n: "A11.07.012", name: "Проводниковая анестезия (Артикаин 1:100 000)", priceRub: 800, quantity: 1, toothNumber: 16 },
					{ id: "3", code804n: "A16.07.051", name: "Профессиональная гигиена полости рта", priceRub: 5500, quantity: 1 },
				]}
				totalRub={10800}
			/>
		</Suspense>
	);
}
