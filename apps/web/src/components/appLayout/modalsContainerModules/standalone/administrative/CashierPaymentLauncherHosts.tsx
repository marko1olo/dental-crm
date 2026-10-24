/**
 * CashierPaymentLauncherHosts — честные хосты быстрой кассы и СБП-оплаты (Мандат 8b, <= 120 строк).
 *
 * Сумма и пациент приходят ТОЛЬКО из базы: ?patientId → GET /api/patients/:id +
 * неоплаченный долг из GET /api/billing/invoices?patientId. Без patientId — гид,
 * без долга — честное уведомление. Никаких вымышленных пациентов и сумм.
 */

import type React from "react";
import { useEffect, useMemo } from "react";
import { AppLoadingState } from "../../../../../AppBootState";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { showToast } from "../../../../GlobalToast";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { readPatientIdFromUrl, useLauncherPatientDebt } from "../useLauncherPatientDebt";

const FastCheckoutModal = lazyWithRetry(() =>
	import("../../../../finance/FastCheckoutModal").then((m) => ({ default: m.FastCheckoutModal })),
);
const PaymentModal = lazyWithRetry(() =>
	import("../../../../billing/PaymentModal").then((m) => ({ default: m.PaymentModal })),
);

function useHonestDebtGuard(
	state: string,
	onClose: () => void,
): void {
	useEffect(() => {
		if (state === "nodebt") {
			showToast("У пациента нет неоплаченных счетов.", "info");
			onClose();
		} else if (state === "notfound") {
			showToast("Пациент не найден в базе клиники.", "warning");
			onClose();
		}
	}, [state, onClose]);
}

export const StandaloneFastCheckoutHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const { state, patient, debtRub, family } = useLauncherPatientDebt(patientId);
	useHonestDebtGuard(state, onClose);

	if (state === "missing") {
		return (
			<StandaloneDeepLinkMissingState
				title="Пациент не указан"
				message="Быстрая касса проводится по конкретному пациенту. Откройте её из карточки пациента или добавьте ?patientId= в ссылку."
				testId="standalone-checkout-missing-state"
				onClose={onClose}
			/>
		);
	}
	if (state !== "ready" || !patient) {
		return <AppLoadingState message="Загрузка данных кассы из базы..." />;
	}
	return (
		<FastCheckoutModal
			isOpen={true}
			totalBillRub={debtRub}
			patientId={patient.id}
			patientName={patient.fullName}
			patientPhone={patient.phone}
			patientFamilyBalanceRub={family?.balanceRub ?? 0}
			onClose={onClose}
		/>
	);
};

export const StandaloneSbpPaymentHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const { state, patient, debtRub, family } = useLauncherPatientDebt(patientId);
	useHonestDebtGuard(state, onClose);
	const isSplit = typeof window !== "undefined" && /split/i.test(window.location.search || "");

	if (state === "missing") {
		return (
			<StandaloneDeepLinkMissingState
				title="Пациент не указан"
				message="Оплата проводится по конкретному пациенту. Откройте её из карточки пациента или добавьте ?patientId= в ссылку."
				testId="standalone-sbp-missing-state"
				onClose={onClose}
			/>
		);
	}
	if (state !== "ready" || !patient) {
		return <AppLoadingState message="Загрузка данных оплаты из базы..." />;
	}
	return (
		<PaymentModal
			isOpen={true}
			amountRub={debtRub}
			amountKopecks={Math.round(debtRub * 100)}
			defaultMethod={isSplit ? "split" : "sbp_qr"}
			patientId={patient.id}
			patientName={patient.fullName}
			patientPhone={patient.phone}
			patientFamilyBalanceRub={family?.balanceRub ?? 0}
			onClose={onClose}
		/>
	);
};
