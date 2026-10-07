/**
 * StagePaymentPlanModal.tsx — Студия поэтапной оплаты и эскроу-депозита планов лечения (DENTE CRM).
 * 
 * НОРМАТИВНЫЙ КОНТУР:
 * • ГК РФ ст. 709 («Смета»), ст. 711 («Порядок оплаты»), ст. 720 («Приемка заказчиком работы»).
 * • Закон РФ № 2300-1 ст. 32 («Отказ от исполнения договора») и ст. 37 («Порядок оплаты»).
 * • Федеральный закон № 54-ФЗ («О применении ККТ»).
 *
 * Архитектурно декомпозирован согласно Engineering Rule 2 (< 300 строк):
 * - StagePaymentScheduleTab: график этапов, карточки этапов, контекстное меню.
 * - StagePaymentEscrowTab: балансы депозита, пополнение, авто-распределение.
 * - StagePaymentActTab: закрытие этапа двусторонним актом выполненных работ.
 * - StagePaymentTerminationTab: расторжение договора и калькуляция удержания фактически понесенных затрат.
 * - StagePaymentFiscalTab: параметры чеков ККТ и предпросмотр термоленты 54-ФЗ.
 * - StagePaymentAddendumTab: печатное Приложение № 1 (А4) к договору.
 */

import React, { useMemo, useState } from "react";
import {
	Calendar,
	Coins,
	Download,
	FileCheck,
	FileText,
	Printer,
	QrCode,
	RotateCcw,
	Sparkles,
	Wallet,
	X,
} from "lucide-react";
import {
	type Kopecks,
	formatKopecksRu,
	rublesToKopecks,
} from "@dental/shared";
import {
	STAGE_STATUS_UI_MAP,
	type StagePaymentStatus,
} from "./stagePaymentPresets.js";
import {
	type MilestoneStage,
	type PatientDepositWallet,
	type StageFiscalReceipt54Fz,
	type StagePaymentTotals,
	type TerminationExpenseItem,
	type TerminationRefundCalculation,
	allocatePatientDepositToStages,
	calculateStagePaymentTotals,
	calculateTerminationRefund,
	closeStageWithCompletedAct,
	createDefaultMilestoneStages,
	exportStageScheduleToCsv,
	generate54FzStageFiscalReceipt,
	validateStageStateTransition,
} from "./stagePaymentEngine.js";
import { BankInstallmentQrModal } from "../../payments/BankInstallmentQrModal";
import { StagePaymentScheduleTab } from "./StagePaymentScheduleTab.js";
import { StagePaymentEscrowTab } from "./StagePaymentEscrowTab.js";
import { StagePaymentActTab } from "./StagePaymentActTab.js";
import { StagePaymentTerminationTab } from "./StagePaymentTerminationTab.js";
import { StagePaymentFiscalTab } from "./StagePaymentFiscalTab.js";
import { StagePaymentAddendumTab } from "./StagePaymentAddendumTab.js";
import "./stagePayment.css";

export type StagePaymentModalTab =
	| "schedule"
	| "escrow"
	| "act"
	| "termination"
	| "fiscal54fz"
	| "contract_addendum";

export interface StagePaymentPlanModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly planTitle?: string;
	readonly patientName?: string;
	readonly patientId?: string;
	readonly clinicName?: string;
	readonly clinicInn?: string;
	readonly doctorFullName?: string;
	readonly initialStages?: readonly MilestoneStage[];
	readonly initialDepositKopecks?: Kopecks;
	readonly initialTab?: StagePaymentModalTab;
	readonly onSaveStages?: (stages: readonly MilestoneStage[]) => void;
}

export const StagePaymentPlanModal: React.FC<StagePaymentPlanModalProps> = ({
	isOpen,
	onClose,
	planTitle = "Комплексный план лечения",
	patientName = "",
	patientId = "",
	clinicName = "Стоматологическая клиника",
	clinicInn = "",
	doctorFullName = "Лечащий врач",
	initialStages,
	initialDepositKopecks = 0 as Kopecks,
	initialTab = "schedule",
}) => {
	const [activeTab, setActiveTab] = useState<StagePaymentModalTab>(initialTab);

	// Состояние этапов
	const [stages, setStages] = useState<MilestoneStage[]>(() => {
		if (initialStages && initialStages.length > 0) {
			return [...initialStages];
		}
		return createDefaultMilestoneStages();
	});

	// Состояние депозитного кошелька пациента
	const [depositWallet, setDepositWallet] = useState<PatientDepositWallet>(() => {
		const initialLocked = stages.reduce((acc, s) => acc + s.escrowLockedKopecks, 0);
		return {
			patientId,
			availableDepositKopecks: initialDepositKopecks,
			lockedEscrowKopecks: initialLocked,
			totalBalanceKopecks: initialDepositKopecks + initialLocked,
		};
	});

	// Состояние пополнения депозита
	const [topUpAmountRub, setTopUpAmountRub] = useState<string>("30000");

	// Состояние закрытия актом
	const [selectedStageForActId, setSelectedStageForActId] = useState<string>(() => stages[0]?.id || "");
	const [actNumberInput, setActNumberInput] = useState<string>(`АКТ-${Date.now().toString().slice(-6)}`);
	const [actSignDate, setActSignDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

	// Состояние кастомных расходов при расторжении
	const [customExpenses, setCustomExpenses] = useState<TerminationExpenseItem[]>([]);
	const [newExpenseTitle, setNewExpenseTitle] = useState<string>("" );
	const [newExpenseRub, setNewExpenseRub] = useState<string>("");
	const [newExpenseCategory, setNewExpenseCategory] = useState<TerminationExpenseItem["category"]>("lab_cadcam");

	// Состояние фискализации 54-ФЗ
	const [selectedStageForFiscalId, setSelectedStageForFiscalId] = useState<string>(() => stages[0]?.id || "");
	const [fiscalPaymentType, setFiscalPaymentType] = useState<"advance" | "completion" | "full">("advance");
	const [fiscalPaymentMethod, setFiscalPaymentMethod] = useState<"CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR">("BANK_CARD");
	const [activeFiscalReceipt, setActiveFiscalReceipt] = useState<StageFiscalReceipt54Fz | null>(null);

	// Состояние банковской рассрочки
	const [selectedStageForInstallment, setSelectedStageForInstallment] = useState<MilestoneStage | null>(null);
	const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState<boolean>(false);

	// Состояние контекстного меню карточки этапа
	const [activeStageMenuId, setActiveStageMenuId] = useState<string | null>(null);

	// Уведомление
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	// Расчет сводных финансовых показателей
	const totals: StagePaymentTotals = useMemo(() => {
		return calculateStagePaymentTotals(stages);
	}, [stages]);

	// Расчет расторжения и возврата
	const terminationCalc: TerminationRefundCalculation = useMemo(() => {
		return calculateTerminationRefund(stages, customExpenses);
	}, [stages, customExpenses]);

	if (!isOpen) return null;

	const handleStageStatusChange = (stageId: string, newStatus: StagePaymentStatus) => {
		const targetStage = stages.find((s) => s.id === stageId);
		if (!targetStage) return;

		const validation = validateStageStateTransition(targetStage.status, newStatus);
		if (!validation.allowed) {
			setStatusMessage(validation.reasonRu ?? "Недопустимый переход статуса");
			return;
		}

		setStages((prev) =>
			prev.map((s) => {
				if (s.id !== stageId) return s;

				let advancePaid = s.advancePaidKopecks;
				let escrowLocked = s.escrowLockedKopecks;
				let completionPaid = s.completionPaidKopecks;

				if (newStatus === "advance_paid" && advancePaid === 0) {
					advancePaid = s.advanceRequiredKopecks;
					escrowLocked = s.advanceRequiredKopecks;
				} else if (newStatus === "fully_paid") {
					completionPaid = Math.max(0, s.totalKopecks - advancePaid);
					escrowLocked = 0;
				} else if (newStatus === "refunded") {
					escrowLocked = 0;
				}

				return {
					...s,
					status: newStatus,
					advancePaidKopecks: advancePaid,
					escrowLockedKopecks: escrowLocked,
					completionPaidKopecks: completionPaid,
				};
			}),
		);
		setStatusMessage(`Статус этапа №${targetStage.stageNumber} успешно изменен на "${STAGE_STATUS_UI_MAP[newStatus].labelRu}"`);
	};

	const handlePayAdvanceForStage = (stageId: string) => {
		const targetStage = stages.find((s) => s.id === stageId);
		if (!targetStage) return;

		const requiredAdvance = targetStage.advanceRequiredKopecks;
		setStages((prev) =>
			prev.map((s) =>
				s.id === stageId
					? {
							...s,
							status: "advance_paid",
							advancePaidKopecks: requiredAdvance,
							escrowLockedKopecks: requiredAdvance,
						}
					: s,
			),
		);
		setStatusMessage(`Аванс ${formatKopecksRu(requiredAdvance)} по этапу №${targetStage.stageNumber} успешно внесен и зарезервирован в эскроу.`);
	};

	const handleTopUpDeposit = () => {
		const parsedRub = parseFloat(topUpAmountRub);
		if (isNaN(parsedRub) || parsedRub <= 0) {
			setStatusMessage("Пожалуйста, укажите корректную сумму пополнения.");
			return;
		}
		const addKopecks = rublesToKopecks(Math.round(parsedRub));
		setDepositWallet((prev) => ({
			...prev,
			availableDepositKopecks: prev.availableDepositKopecks + addKopecks,
			totalBalanceKopecks: prev.totalBalanceKopecks + addKopecks,
		}));
		setStatusMessage(`Депозит пациента успешно пополнен на ${formatKopecksRu(addKopecks)}.`);
		setTopUpAmountRub("");
	};

	const handleAutoAllocateDeposit = () => {
		if (depositWallet.availableDepositKopecks <= 0) {
			setStatusMessage("Свободный депозит пуст (0 ₽). Внесите аванс пациента в кассе для авто-распределения по этапам.");
			return;
		}
		const result = allocatePatientDepositToStages(stages, depositWallet);
		setStages([...result.updatedStages]);
		setDepositWallet(result.updatedDeposit);
		if (result.allocatedLog.length > 0) {
			setStatusMessage(`Депозит успешно распределен! Операций: ${result.allocatedLog.length}. Зарезервировано в эскроу: ${formatKopecksRu(result.allocatedLog.reduce((a, b) => a + b.amountKopecks, 0))}`);
		} else {
			setStatusMessage("Нет этапов, требующих распределения депозита, либо недостаточно средств.");
		}
	};

	const handleSignStageAct = () => {
		const targetStage = stages.find((s) => s.id === selectedStageForActId);
		if (!targetStage) {
			setStatusMessage("Выберите этап для оформления Акта.");
			return;
		}

		const result = closeStageWithCompletedAct(targetStage, actNumberInput, actSignDate);
		setStages((prev) => prev.map((s) => (s.id === targetStage.id ? result.updatedStage : s)));

		setDepositWallet((prev) => ({
			...prev,
			lockedEscrowKopecks: Math.max(0, prev.lockedEscrowKopecks - result.releasedEscrowKopecks),
			totalBalanceKopecks: Math.max(0, prev.totalBalanceKopecks - result.releasedEscrowKopecks),
		}));

		setStatusMessage(`Акт №${result.updatedStage.actNumber} успешно подписан! Выручка клиники признана: ${formatKopecksRu(result.recognizedRevenueKopecks)}.`);
	};

	const handleAddCustomExpense = () => {
		if (!newExpenseTitle.trim()) {
			setStatusMessage("Укажите наименование фактически понесенного расхода.");
			return;
		}
		const rub = parseFloat(newExpenseRub);
		if (isNaN(rub) || rub <= 0) {
			setStatusMessage("Укажите корректную сумму расхода.");
			return;
		}
		const amountKopecks = rublesToKopecks(Math.round(rub));
		const newExp: TerminationExpenseItem = {
			title: newExpenseTitle.trim(),
			category: newExpenseCategory,
			amountKopecks,
			justificationRu: `Фактически понесенные затраты по наряд-заказу: ${newExpenseTitle.trim()}`,
		};
		setCustomExpenses((prev) => [...prev, newExp]);
		setNewExpenseTitle("");
		setNewExpenseRub("");
		setStatusMessage("Фактический расход успешно добавлен в калькулятор возврата.");
	};

	const handleGenerateFiscalReceipt = () => {
		const targetStage = stages.find((s) => s.id === selectedStageForFiscalId);
		if (!targetStage) return;

		const receipt = generate54FzStageFiscalReceipt(
			targetStage,
			fiscalPaymentType,
			fiscalPaymentMethod,
			clinicInn,
			patientName,
			clinicName,
		);
		setActiveFiscalReceipt(receipt);
		setStatusMessage(`Кассовый чек №${receipt.receiptId} сформирован.`);
	};

	const handleDownloadCsv = () => {
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
		setStatusMessage("График платежей успешно выгружен в формате RFC 4180 (CSV UTF-8 BOM).");
	};

	const handlePrint = () => {
		window.print();
	};

	if (isInstallmentModalOpen && selectedStageForInstallment) {
		return (
			<BankInstallmentQrModal
				isOpen={isInstallmentModalOpen}
				onClose={() => {
					setIsInstallmentModalOpen(false);
					setSelectedStageForInstallment(null);
				}}
				stageTitle={`Этап №${selectedStageForInstallment.stageNumber}: ${selectedStageForInstallment.title}`}
				stageNumber={selectedStageForInstallment.stageNumber}
				stageAmountKopecks={selectedStageForInstallment.totalKopecks}
				patientId={patientId}
				patientName={patientName}
				clinicName={clinicName}
				clinicInn={clinicInn}
				planId={planTitle}
				onInstallmentApproved={() => {
					const stageId = selectedStageForInstallment.id;
					setStages((prev) =>
						prev.map((s) =>
							s.id === stageId
								? {
										...s,
										status: "advance_paid",
										advancePaidKopecks: s.advanceRequiredKopecks,
										escrowLockedKopecks: s.advanceRequiredKopecks,
									}
								: s,
						),
					);
					setStatusMessage(
						`Рассрочка по этапу №${selectedStageForInstallment.stageNumber} одобрена! Аванс зачислен в эскроу.`,
					);
					setIsInstallmentModalOpen(false);
					setSelectedStageForInstallment(null);
				}}
			/>
		);
	}

	return (
		<div className="stage-payment-modal-overlay" role="dialog" aria-modal="true">
			<div className="stage-payment-modal-container">
				{/* Modal Header */}
				<header className="stage-payment-header">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]">
							<Coins className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-lg font-bold tracking-tight text-[var(--ink,#0f172a)] flex items-center gap-2">
								Студия поэтапной оплаты и Эскроу
								<span className="rounded-full bg-[var(--teal-soft,var(--paper-soft))] px-2.5 py-0.5 text-xs font-semibold text-[var(--teal-dark,var(--teal))]">
									ГК РФ ст. 709/711
								</span>
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)]">
								{patientName} ({patientId}) • {planTitle}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleDownloadCsv}
							className="stage-action-btn secondary no-print"
							title="Экспорт в CSV (RFC 4180)"
						>
							<Download className="h-4 w-4" />
							<span>CSV</span>
						</button>
						<button
							type="button"
							onClick={handlePrint}
							className="stage-action-btn secondary no-print"
							title="Печать текущей вкладки"
						>
							<Printer className="h-4 w-4" />
							<span>Печать</span>
						</button>
						<button
							type="button"
							onClick={onClose}
							className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)] hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--ink,#0f172a)] transition no-print"
							aria-label="Закрыть"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
				</header>

				{/* Toast Banner */}
				{statusMessage && (
					<div className="bg-[var(--teal-soft,var(--paper-soft))] border-b border-[var(--teal,var(--brand-primary))]/20 px-6 py-2.5 flex items-center justify-between text-xs text-[var(--teal-dark,var(--teal))] no-print">
						<div className="flex items-center gap-2">
							<Sparkles className="h-4 w-4 shrink-0 text-[var(--teal,var(--brand-primary))]" />
							<span>{statusMessage}</span>
						</div>
						<button
							type="button"
							onClick={() => setStatusMessage(null)}
							className="text-[var(--teal,var(--brand-primary))] hover:text-[var(--teal-dark,var(--teal))] font-semibold"
						>
							Закрыть
						</button>
					</div>
				)}

				{/* Navigation Tabs Bar */}
				<nav className="stage-payment-tabs-bar no-print">
					<button
						type="button"
						onClick={() => setActiveTab("schedule")}
						className={`stage-payment-tab-btn ${activeTab === "schedule" ? "active" : ""}`}
					>
						<Calendar className="h-4 w-4" />
						<span>График этапов и оплат</span>
						<span className="ml-1 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.2 text-xs">
							{stages.length}
						</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("escrow")}
						className={`stage-payment-tab-btn ${activeTab === "escrow" ? "active" : ""}`}
					>
						<Wallet className="h-4 w-4" />
						<span>Депозит и Эскроу</span>
						{depositWallet.lockedEscrowKopecks > 0 && (
							<span className="ml-1 rounded-full bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] px-2 py-0.2 text-xs">
								{formatKopecksRu(depositWallet.lockedEscrowKopecks)}
							</span>
						)}
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("act")}
						className={`stage-payment-tab-btn ${activeTab === "act" ? "active" : ""}`}
					>
						<FileCheck className="h-4 w-4" />
						<span>Закрытие этапа актом</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("termination")}
						className={`stage-payment-tab-btn ${activeTab === "termination" ? "active" : ""}`}
					>
						<RotateCcw className="h-4 w-4" />
						<span>Расторжение и возврат</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("fiscal54fz")}
						className={`stage-payment-tab-btn ${activeTab === "fiscal54fz" ? "active" : ""}`}
					>
						<QrCode className="h-4 w-4" />
						<span>Кассовые чеки</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("contract_addendum")}
						className={`stage-payment-tab-btn ${activeTab === "contract_addendum" ? "active" : ""}`}
					>
						<FileText className="h-4 w-4" />
						<span>Доп. соглашение (А4)</span>
					</button>
				</nav>

				{/* Tab Body */}
				<main className="stage-payment-body">
					{activeTab === "schedule" && (
						<StagePaymentScheduleTab
							stages={stages}
							totals={totals}
							activeStageMenuId={activeStageMenuId}
							onToggleStageMenu={(id) => setActiveStageMenuId(activeStageMenuId === id ? null : id)}
							onPayAdvance={handlePayAdvanceForStage}
							onStageStatusChange={handleStageStatusChange}
							onOpenActTab={(id) => {
								setSelectedStageForActId(id);
								setActiveTab("act");
							}}
							onOpenInstallmentModal={(stg) => {
								setSelectedStageForInstallment(stg);
								setIsInstallmentModalOpen(true);
							}}
							onOpenFiscalTab={(id) => {
								setSelectedStageForFiscalId(id);
								setActiveTab("fiscal54fz");
							}}
						/>
					)}

					{activeTab === "escrow" && (
						<StagePaymentEscrowTab
							depositWallet={depositWallet}
							topUpAmountRub={topUpAmountRub}
							onTopUpAmountChange={setTopUpAmountRub}
							onTopUpDeposit={handleTopUpDeposit}
							onAutoAllocateDeposit={handleAutoAllocateDeposit}
						/>
					)}

					{activeTab === "act" && (
						<StagePaymentActTab
							stages={stages}
							selectedStageForActId={selectedStageForActId}
							onSelectStageForAct={setSelectedStageForActId}
							actNumberInput={actNumberInput}
							onActNumberChange={setActNumberInput}
							actSignDate={actSignDate}
							onActSignDateChange={setActSignDate}
							doctorFullName={doctorFullName}
							onSignStageAct={handleSignStageAct}
						/>
					)}

					{activeTab === "termination" && (
						<StagePaymentTerminationTab
							terminationCalc={terminationCalc}
							newExpenseTitle={newExpenseTitle}
							onNewExpenseTitleChange={setNewExpenseTitle}
							newExpenseRub={newExpenseRub}
							onNewExpenseRubChange={setNewExpenseRub}
							newExpenseCategory={newExpenseCategory}
							onNewExpenseCategoryChange={setNewExpenseCategory}
							onAddCustomExpense={handleAddCustomExpense}
						/>
					)}

					{activeTab === "fiscal54fz" && (
						<StagePaymentFiscalTab
							stages={stages}
							selectedStageForFiscalId={selectedStageForFiscalId}
							onSelectStageForFiscal={setSelectedStageForFiscalId}
							fiscalPaymentType={fiscalPaymentType}
							onFiscalPaymentTypeChange={setFiscalPaymentType}
							fiscalPaymentMethod={fiscalPaymentMethod}
							onFiscalPaymentMethodChange={setFiscalPaymentMethod}
							onGenerateFiscalReceipt={handleGenerateFiscalReceipt}
							activeFiscalReceipt={activeFiscalReceipt}
						/>
					)}

					{activeTab === "contract_addendum" && (
						<StagePaymentAddendumTab
							stages={stages}
							totals={totals}
							clinicName={clinicName}
							clinicInn={clinicInn}
							doctorFullName={doctorFullName}
							patientName={patientName}
							patientId={patientId}
							planTitle={planTitle}
						/>
					)}
				</main>
			</div>
		</div>
	);
};

export default StagePaymentPlanModal;
