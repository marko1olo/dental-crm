import { useState, useMemo } from "react";
import type { Kopecks } from "@dental/shared";
import { type StagePaymentStatus } from "../stagePaymentPresets.js";
import {
	type MilestoneStage,
	type PatientDepositWallet,
	type StageFiscalReceipt54Fz,
	type TerminationExpenseItem,
	calculateStagePaymentTotals,
	calculateTerminationRefund,
	createDefaultMilestoneStages,
} from "../stagePaymentEngine.js";
import type { StagePaymentModalTab } from "./stagePaymentModalTypes";
import {
	executeTopUpDeposit,
	executeAutoAllocate,
	executeSignStageAct,
	downloadStageScheduleCsv,
} from "./stagePaymentActionHandlers";
import { handleTransitionStageStatus, handlePayAdvance } from "./stagePaymentStatusHandlers";
import { handleAddCustomExpenseHelper, handleGenerateFiscalReceiptHelper } from "./stagePaymentExpenseHandlers";

export interface StagePaymentPlanStateParams {
	readonly initialStages?: readonly MilestoneStage[];
	readonly initialDepositKopecks?: Kopecks;
	readonly initialTab?: StagePaymentModalTab;
	readonly patientId?: string;
	readonly patientName?: string;
	readonly planTitle?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
}

export function useStagePaymentPlanState(params: StagePaymentPlanStateParams) {
	const [activeTab, setActiveTab] = useState<StagePaymentModalTab>(params.initialTab || "schedule");
	const [stages, setStages] = useState<MilestoneStage[]>(() => {
		if (params.initialStages && params.initialStages.length > 0) return [...params.initialStages];
		return createDefaultMilestoneStages();
	});

	const [depositWallet, setDepositWallet] = useState<PatientDepositWallet>(() => {
		const initialLocked = stages.reduce((acc, s) => acc + s.escrowLockedKopecks, 0);
		const initDep = params.initialDepositKopecks || (0 as Kopecks);
		return { patientId: params.patientId || "", availableDepositKopecks: initDep, lockedEscrowKopecks: initialLocked, totalBalanceKopecks: initDep + initialLocked };
	});

	const [topUpAmountRub, setTopUpAmountRub] = useState<string>("30000");
	const [selectedStageForActId, setSelectedStageForActId] = useState<string>(() => stages[0]?.id || "");
	const [actNumberInput, setActNumberInput] = useState<string>(`АКТ-${Date.now().toString().slice(-6)}`);
	const [actSignDate, setActSignDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
	const [customExpenses, setCustomExpenses] = useState<TerminationExpenseItem[]>([]);
	const [newExpenseTitle, setNewExpenseTitle] = useState<string>("");
	const [newExpenseRub, setNewExpenseRub] = useState<string>("");
	const [newExpenseCategory, setNewExpenseCategory] = useState<TerminationExpenseItem["category"]>("lab_cadcam");
	const [selectedStageForFiscalId, setSelectedStageForFiscalId] = useState<string>(() => stages[0]?.id || "");
	const [fiscalPaymentType, setFiscalPaymentType] = useState<"advance" | "completion" | "full">("advance");
	const [fiscalPaymentMethod, setFiscalPaymentMethod] = useState<"CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR">("BANK_CARD");
	const [activeFiscalReceipt, setActiveFiscalReceipt] = useState<StageFiscalReceipt54Fz | null>(null);
	const [selectedStageForInstallment, setSelectedStageForInstallment] = useState<MilestoneStage | null>(null);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState<boolean>(false);
	const [activeStageMenuId, setActiveStageMenuId] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	const totals = useMemo(() => calculateStagePaymentTotals(stages), [stages]);
	const terminationCalc = useMemo(() => calculateTerminationRefund(stages, customExpenses), [stages, customExpenses]);

	const handleStageStatusChange = (stageId: string, newStatus: StagePaymentStatus) => {
		const res = handleTransitionStageStatus(stages, stageId, newStatus);
		setStages(res.updatedStages); setStatusMessage(res.message);
	};

	const handlePayAdvanceForStage = (stageId: string) => {
		const res = handlePayAdvance(stages, stageId);
		if (res) { setStages(res.updatedStages); setStatusMessage(res.message); }
	};

	const handleTopUpDeposit = () => {
		const res = executeTopUpDeposit(topUpAmountRub, depositWallet);
		if (!res) { setStatusMessage("Укажите корректную сумму пополнения."); return; }
		setDepositWallet(res.updatedDeposit); setStatusMessage(res.message); setTopUpAmountRub("");
	};

	const handleAutoAllocateDeposit = () => {
		const res = executeAutoAllocate(stages, depositWallet);
		if (!res) { setStatusMessage("Свободный депозит пуст (0 ₽)."); return; }
		setStages([...res.result.updatedStages]); setDepositWallet(res.result.updatedDeposit); setStatusMessage(res.message);
	};

	const handleSignStageAct = () => {
		const target = stages.find((s) => s.id === selectedStageForActId);
		if (!target) { setStatusMessage("Выберите этап для оформления Акта."); return; }
		const res = executeSignStageAct(target, actNumberInput, actSignDate, depositWallet);
		setStages((prev) => prev.map((s) => (s.id === target.id ? res.result.updatedStage : s)));
		setDepositWallet(res.updatedDeposit); setStatusMessage(res.message);
	};

	const handleAddCustomExpense = () => handleAddCustomExpenseHelper(newExpenseTitle, newExpenseRub, newExpenseCategory, setCustomExpenses, setNewExpenseTitle, setNewExpenseRub, setStatusMessage);
	const handleGenerateFiscalReceipt = () => {
		const r = handleGenerateFiscalReceiptHelper(stages, selectedStageForFiscalId, fiscalPaymentType, fiscalPaymentMethod, params.clinicInn, params.patientName, params.clinicName);
		if (r) { setActiveFiscalReceipt(r); setStatusMessage(`Кассовый чек №${r.receiptId} сформирован.`); }
	};
	const handleDownloadCsv = () => downloadStageScheduleCsv(stages, params.planTitle || "", params.patientName || "", params.patientId || "");

	return {
		activeTab, setActiveTab, stages, setStages, depositWallet, setDepositWallet,
		topUpAmountRub, setTopUpAmountRub, selectedStageForActId, setSelectedStageForActId,
		actNumberInput, setActNumberInput, actSignDate, setActSignDate,
		customExpenses, newExpenseTitle, setNewExpenseTitle, newExpenseRub, setNewExpenseRub,
		newExpenseCategory, setNewExpenseCategory, selectedStageForFiscalId, setSelectedStageForFiscalId,
		fiscalPaymentType, setFiscalPaymentType, fiscalPaymentMethod, setFiscalPaymentMethod,
		activeFiscalReceipt, selectedStageForInstallment, setSelectedStageForInstallment,
		isInstallmentModalOpen, setIsInstallmentModalOpen, activeStageMenuId, setActiveStageMenuId,
		statusMessage, setStatusMessage, totals, terminationCalc,
		handleStageStatusChange, handlePayAdvanceForStage, handleTopUpDeposit,
		handleAutoAllocateDeposit, handleSignStageAct, handleAddCustomExpense,
		handleGenerateFiscalReceipt, handleDownloadCsv,
	};
}
