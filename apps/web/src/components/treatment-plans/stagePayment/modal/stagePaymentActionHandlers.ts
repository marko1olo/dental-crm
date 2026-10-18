import { rublesToKopecks, formatKopecksRu } from "@dental/shared";
import type {
	MilestoneStage,
	PatientDepositWallet,
	TerminationExpenseItem,
} from "../stagePaymentEngine.js";
import {
	allocatePatientDepositToStages,
	closeStageWithCompletedAct,
	generate54FzStageFiscalReceipt,
	exportStageScheduleToCsv,
} from "../stagePaymentEngine.js";

export function executeTopUpDeposit(
	topUpAmountRub: string,
	depositWallet: PatientDepositWallet,
): { updatedDeposit: PatientDepositWallet; message: string } | null {
	const parsedRub = parseFloat(topUpAmountRub);
	if (isNaN(parsedRub) || parsedRub <= 0) return null;
	const addKopecks = rublesToKopecks(Math.round(parsedRub));
	return {
		updatedDeposit: {
			...depositWallet,
			availableDepositKopecks: depositWallet.availableDepositKopecks + addKopecks,
			totalBalanceKopecks: depositWallet.totalBalanceKopecks + addKopecks,
		},
		message: `Депозит пациента успешно пополнен на ${formatKopecksRu(addKopecks)}.`,
	};
}

export function executeAutoAllocate(
	stages: readonly MilestoneStage[],
	depositWallet: PatientDepositWallet,
) {
	if (depositWallet.availableDepositKopecks <= 0) return null;
	const result = allocatePatientDepositToStages(stages, depositWallet);
	const message =
		result.allocatedLog.length > 0
			? `Депозит успешно распределен! Операций: ${result.allocatedLog.length}. Зарезервировано в эскроу: ${formatKopecksRu(result.allocatedLog.reduce((a, b) => a + b.amountKopecks, 0))}`
			: "Нет этапов, требующих распределения депозита, либо недостаточно средств.";
	return { result, message };
}

export function executeSignStageAct(
	stage: MilestoneStage,
	actNumber: string,
	signDate: string,
	depositWallet: PatientDepositWallet,
) {
	const result = closeStageWithCompletedAct(stage, actNumber, signDate);
	const updatedDeposit: PatientDepositWallet = {
		...depositWallet,
		lockedEscrowKopecks: Math.max(0, depositWallet.lockedEscrowKopecks - result.releasedEscrowKopecks),
		totalBalanceKopecks: Math.max(0, depositWallet.totalBalanceKopecks - result.releasedEscrowKopecks),
	};
	const message = `Акт №${result.updatedStage.actNumber} успешно подписан! Выручка клиники признана: ${formatKopecksRu(result.recognizedRevenueKopecks)}.`;
	return { result, updatedDeposit, message };
}

export function downloadStageScheduleCsv(
	stages: readonly MilestoneStage[],
	planTitle: string,
	patientName: string,
	patientId: string,
) {
	const csvData = exportStageScheduleToCsv(stages, planTitle, patientName);
	const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.setAttribute("download", `График_оплаты_${patientId}_${Date.now()}.csv`);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
