/**
 * FiscalReceiptLaunchers — Автономная печать кассовых чеков 54-ФЗ (Мандат 8b, <= 120 строк).
 */

import React, { Suspense } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { useAppStore } from "../../../../../store/appStore";

const CashReceiptPrintModal = lazyWithRetry(() =>
	import("../../../../finance/CashReceiptPrintModal").then((m) => ({ default: m.CashReceiptPrintModal })),
);

export function renderFiscalReceiptLauncher({
	isReceiptDirectModalOpen,
	setIsReceiptDirectModalOpen,
}: {
	isReceiptDirectModalOpen?: boolean | undefined;
	setIsReceiptDirectModalOpen?: ((open: boolean) => void) | undefined;
}): React.ReactElement | null {
	if (!isReceiptDirectModalOpen) return null;
	const profile = useAppStore.getState().clinicProfileDraft;

	return (
		<Suspense fallback={<AppLoadingState message="Загрузка кассового чека..." />}>
			<CashReceiptPrintModal
				isOpen={true}
				invoice={{
					id: "inv-2026-089",
					number: "ЧЕК-089-2026",
					patientId: "pat_mikhailov",
					patientName: "Михайлов Артем Евгеньевич",
					patientPhone: "+7 (926) 345-67-89",
					doctorName: "Д-р Воронов А. В.",
					date: "2026-10-12",
					status: "paid" as const,
					totalAmountRub: 15400,
					paidAmountRub: 15400,
					items: [
						{ id: "item-1", code: "A16.07.002.001", name: "Восстановление зуба пломбой Filtek", quantity: 1, priceRub: 7500, totalRub: 7500 },
						{ id: "item-2", code: "A16.07.051", name: "Профгигиена AirFlow", quantity: 1, priceRub: 7900, totalRub: 7900 },
					],
					createdAt: new Date().toISOString(),
				}}
				clinicName={profile?.legalName || "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»"}
				clinicInn={profile?.inn || ""}
				clinicAddress={profile?.address || "г. Москва, ул. Профсоюзная, д. 42"}
				cashierFullName="Воронова А. В."
				attendingDoctorName="Д-р Воронов Алексей Владимирович"
				defaultFormat="80mm"
				onClose={() => {
					setIsReceiptDirectModalOpen?.(false);
					const u = new URL(window.location.href);
					u.searchParams.delete("receipt");
					window.history.replaceState({}, "", u.pathname + (u.search || "") + (u.hash.includes("receipt") ? "" : u.hash));
				}}
			/>
		</Suspense>
	);
}
