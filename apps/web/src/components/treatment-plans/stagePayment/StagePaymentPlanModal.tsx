/**
 * StagePaymentPlanModal.tsx — Студия поэтапной оплаты и эскроу-депозита планов лечения (DENTE CRM).
 * 
 * НОРМАТИВНЫЙ КОНТУР:
 * • ГК РФ ст. 709 («Смета»), ст. 711 («Порядок оплаты»), ст. 720 («Приемка заказчиком работы»).
 * • Закон РФ № 2300-1 ст. 32 («Отказ от исполнения договора») и ст. 37 («Порядок оплаты»).
 * • Федеральный закон № 54-ФЗ («О применении ККТ»).
 */

import React, { useMemo, useState } from "react";
import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Calendar,
	CheckCircle2,
	ChevronRight,
	Clock,
	Coins,
	CreditCard,
	Download,
	FileCheck,
	FileDown,
	FileEdit,
	FileText,
	HelpCircle,
	Layers,
	Lock,
	Plus,
	Printer,
	QrCode,
	RotateCcw,
	Shield,
	ShieldCheck,
	Sparkles,
	Trash2,
	User,
	Wallet,
	X,
} from "lucide-react";
import {
	type Kopecks,
	formatKopecksRu,
	parseKopecks,
	rublesToKopecks,
} from "@dental/shared";
import {
	type StagePaymentKind,
	type StagePaymentPreset,
	type StagePaymentStatus,
	STAGE_PAYMENT_PRESETS,
	STAGE_STATUS_UI_MAP,
	getAllStagePaymentKinds,
	getStagePresetByKind,
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
	readonly onSaveStages?: (stages: readonly MilestoneStage[]) => void;
}

export const StagePaymentPlanModal: React.FC<StagePaymentPlanModalProps> = ({
	isOpen,
	onClose,
	planTitle = "Комплексный план лечения и реабилитации",
	patientName = "Иванов Иван Иванович",
	patientId = "PAT-10492",
	clinicName = "ООО 'ДЕНТЕ СТОМАТОЛОГИЯ'",
	clinicInn = "7701234567",
	doctorFullName = "Д-р Смирнов А. В.",
	initialStages,
	initialDepositKopecks = rublesToKopecks(50000),
	onSaveStages,
}) => {
	const [activeTab, setActiveTab] = useState<StagePaymentModalTab>("schedule");

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
	const [newExpenseTitle, setNewExpenseTitle] = useState<string>("");
	const [newExpenseRub, setNewExpenseRub] = useState<string>("");
	const [newExpenseCategory, setNewExpenseCategory] = useState<TerminationExpenseItem["category"]>("lab_cadcam");

	// Состояние фискализации 54-ФЗ
	const [selectedStageForFiscalId, setSelectedStageForFiscalId] = useState<string>(() => stages[0]?.id || "");
	const [fiscalPaymentType, setFiscalPaymentType] = useState<"advance" | "completion" | "full">("advance");
	const [fiscalPaymentMethod, setFiscalPaymentMethod] = useState<"CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR">("BANK_CARD");
	const [activeFiscalReceipt, setActiveFiscalReceipt] = useState<StageFiscalReceipt54Fz | null>(null);

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

	// Вспомогательные функции изменения состояния
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

	// 1-Click внесение аванса по этапу
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
		setStatusMessage(`Аванс ${formatKopecksRu(requiredAdvance)} по этапу №${targetStage.stageNumber} успешно внесен и заблокирован в эскроу.`);
	};

	// Пополнение депозита пациента
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

	// Автоматическое распределение свободного депозита
	const handleAutoAllocateDeposit = () => {
		const result = allocatePatientDepositToStages(stages, depositWallet);
		setStages([...result.updatedStages]);
		setDepositWallet(result.updatedDeposit);
		if (result.allocatedLog.length > 0) {
			setStatusMessage(`Депозит успешно распределен! Операций: ${result.allocatedLog.length}. Заблокировано в эскроу: ${formatKopecksRu(result.allocatedLog.reduce((a, b) => a + b.amountKopecks, 0))}`);
		} else {
			setStatusMessage("Нет этапов, требующих распределения депозита, либо недостаточно средств.");
		}
	};

	// Закрытие этапа актом выполненных работ
	const handleSignStageAct = () => {
		const targetStage = stages.find((s) => s.id === selectedStageForActId);
		if (!targetStage) {
			setStatusMessage("Выберите этап для оформления Акта.");
			return;
		}

		const result = closeStageWithCompletedAct(targetStage, actNumberInput, actSignDate);
		setStages((prev) => prev.map((s) => (s.id === targetStage.id ? result.updatedStage : s)));

		// Обновляем эскроу кошелька
		setDepositWallet((prev) => ({
			...prev,
			lockedEscrowKopecks: Math.max(0, prev.lockedEscrowKopecks - result.releasedEscrowKopecks),
			totalBalanceKopecks: Math.max(0, prev.totalBalanceKopecks - result.releasedEscrowKopecks),
		}));

		setStatusMessage(`Акт №${result.updatedStage.actNumber} успешно подписан! Выручка клиники признана: ${formatKopecksRu(result.recognizedRevenueKopecks)}.`);
	};

	// Добавление кастомного расхода при расторжении
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

	// Генерация и просмотр фискального чека 54-ФЗ
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
		setStatusMessage(`Фискальный чек №${receipt.receiptId} сформирован согласно 54-ФЗ.`);
	};

	// Экспорт в CSV (RFC 4180)
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

	// Печать
	const handlePrint = () => {
		window.print();
	};

	return (
		<div className="stage-payment-modal-overlay" role="dialog" aria-modal="true">
			<div className="stage-payment-modal-container">
				{/* Modal Header */}
				<header className="stage-payment-header">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
							<Coins className="h-5 w-5" />
						</div>
						<div>
							<h2 className="text-lg font-bold tracking-tight text-[var(--ink,#0f172a)] flex items-center gap-2">
								Студия поэтапной оплаты и Эскроу
								<span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
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
					<div className="bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-800/60 px-6 py-2.5 flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 no-print">
						<div className="flex items-center gap-2">
							<Sparkles className="h-4 w-4 shrink-0 text-teal-600" />
							<span>{statusMessage}</span>
						</div>
						<button
							type="button"
							onClick={() => setStatusMessage(null)}
							className="text-teal-600 hover:text-teal-800 dark:hover:text-teal-200 font-semibold"
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
							<span className="ml-1 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 px-2 py-0.2 text-xs">
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
						<span>Расторжение и возврат (ст. 32)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("fiscal54fz")}
						className={`stage-payment-tab-btn ${activeTab === "fiscal54fz" ? "active" : ""}`}
					>
						<QrCode className="h-4 w-4" />
						<span>Фискализация 54-ФЗ</span>
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
					{/* TAB 1: SCHEDULE */}
					{activeTab === "schedule" && (
						<div className="flex flex-col gap-5">
							{/* Progress Bar & Summary Card */}
							<div className="stage-progress-card">
								<div className="flex flex-wrap items-center justify-between gap-4">
									<div>
										<span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted,#64748b)]">
											Прогресс закрытия комплексного плана
										</span>
										<div className="flex items-baseline gap-2 mt-0.5">
											<span className="text-2xl font-extrabold text-[var(--ink,#0f172a)]">
												{totals.progressPercent}%
											</span>
											<span className="text-xs text-[var(--muted,#64748b)]">
												(Выполнено и принято: {formatKopecksRu(totals.totalActCompletedKopecks)} из {formatKopecksRu(totals.grandTotalKopecks)})
											</span>
										</div>
									</div>

									<div className="flex flex-wrap items-center gap-4 text-xs">
										<div className="rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] px-3 py-1.5 shadow-sm">
											<span className="text-[var(--muted,#64748b)] block">Всего оплачено:</span>
											<span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
												{formatKopecksRu(totals.totalPaidKopecks)}
											</span>
										</div>
										<div className="rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] px-3 py-1.5 shadow-sm">
											<span className="text-[var(--muted,#64748b)] block">В эскроу (заблокировано):</span>
											<span className="font-bold text-teal-600 dark:text-teal-400 text-sm">
												{formatKopecksRu(totals.totalEscrowLockedKopecks)}
											</span>
										</div>
										<div className="rounded-lg bg-[var(--paper,#ffffff)] border border-[var(--border,#cbd5e1)] px-3 py-1.5 shadow-sm">
											<span className="text-[var(--muted,#64748b)] block">Остаток к доплате:</span>
											<span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
												{formatKopecksRu(totals.remainingDueKopecks)}
											</span>
										</div>
									</div>
								</div>

								{/* Progress Track */}
								<div className="stage-progress-track">
									<div
										className="stage-progress-fill"
										style={{ width: `${totals.progressPercent}%` }}
									/>
								</div>
							</div>

							{/* Stage Cards List */}
							<div className="flex flex-col gap-4">
								{stages.map((stage) => {
									const preset = getStagePresetByKind(stage.kind);
									const statusMeta = STAGE_STATUS_UI_MAP[stage.status];
									const stageDue = Math.max(
										0,
										stage.totalKopecks - (stage.advancePaidKopecks + stage.completionPaidKopecks),
									);

									return (
										<div
											key={stage.id}
											className={`stage-item-card is-${stage.status.replace("_", "-")}`}
										>
											{/* Stage Top Row */}
											<div className="flex flex-wrap items-start justify-between gap-3">
												<div className="flex items-start gap-3">
													<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-[var(--ink,#0f172a)] font-bold text-sm">
														{stage.stageNumber}
													</div>
													<div>
														<div className="flex items-center gap-2">
															<h3 className="font-bold text-base text-[var(--ink,#0f172a)]">
																{stage.title}
															</h3>
															<span
																className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusMeta.badgeClass}`}
															>
																{statusMeta.labelRu}
															</span>
														</div>
														<p className="text-xs text-[var(--muted,#64748b)] mt-0.5">
															{preset.clinicalGoalRu}
														</p>
													</div>
												</div>

												{/* Stage Total Amount */}
												<div className="text-right">
													<span className="text-xs text-[var(--muted,#64748b)] block">
														Стоимость этапа:
													</span>
													<span className="text-lg font-extrabold text-[var(--ink,#0f172a)]">
														{formatKopecksRu(stage.totalKopecks)}
													</span>
												</div>
											</div>

											{/* Financial Breakdown Grid */}
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-xs border border-[var(--border,#cbd5e1)]">
												<div>
													<span className="text-[var(--muted,#64748b)] block">Аванс ({preset.defaultAdvancePercent}%):</span>
													<span className="font-semibold text-[var(--ink,#0f172a)]">
														{formatKopecksRu(stage.advanceRequiredKopecks)}
													</span>
												</div>
												<div>
													<span className="text-[var(--muted,#64748b)] block">Внесено аванса:</span>
													<span className={`font-semibold ${stage.advancePaidKopecks >= stage.advanceRequiredKopecks ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600"}`}>
														{formatKopecksRu(stage.advancePaidKopecks)}
													</span>
												</div>
												<div>
													<span className="text-[var(--muted,#64748b)] block">В эскроу (заморожено):</span>
													<span className="font-semibold text-teal-600 dark:text-teal-400">
														{formatKopecksRu(stage.escrowLockedKopecks)}
													</span>
												</div>
												<div>
													<span className="text-[var(--muted,#64748b)] block">Остаток к доплате:</span>
													<span className="font-semibold text-[var(--ink,#0f172a)]">
														{formatKopecksRu(stageDue)}
													</span>
												</div>
											</div>

											{/* Clinical Milestones */}
											<div className="text-xs">
												<span className="font-semibold text-[var(--ink,#0f172a)] block mb-1">
													Клинические вехи этапа:
												</span>
												<div className="flex flex-wrap gap-1.5">
													{preset.clinicalMilestones.map((m, i) => (
														<span
															key={i}
															className="rounded-md bg-slate-100 dark:bg-slate-800 text-[var(--muted,#64748b)] px-2 py-0.5 border border-slate-200 dark:border-slate-700 text-[11px]"
														>
															• {m}
														</span>
													))}
												</div>
											</div>

											{/* Action Bar */}
											<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border,#cbd5e1)]">
												<div className="text-[11px] text-[var(--muted,#64748b)] italic">
													{preset.legalBasisRu}
												</div>

												<div className="flex flex-wrap items-center gap-2">
													{stage.status === "draft" && (
														<button
															type="button"
															onClick={() => handlePayAdvanceForStage(stage.id)}
															className="stage-action-btn primary"
														>
															<Coins className="h-4 w-4" />
															<span>Внести аванс ({formatKopecksRu(stage.advanceRequiredKopecks)})</span>
														</button>
													)}

													{stage.status === "advance_paid" && (
														<button
															type="button"
															onClick={() => handleStageStatusChange(stage.id, "in_progress")}
															className="stage-action-btn primary"
														>
															<Lock className="h-4 w-4" />
															<span>Взять в работу (Эскроу)</span>
														</button>
													)}

													{(stage.status === "in_progress" || stage.status === "advance_paid") && (
														<button
															type="button"
															onClick={() => {
																setSelectedStageForActId(stage.id);
																setActiveTab("act");
															}}
															className="stage-action-btn secondary"
														>
															<FileCheck className="h-4 w-4 text-teal-600" />
															<span>Закрыть актом</span>
														</button>
													)}

													<button
														type="button"
														onClick={() => {
															setSelectedStageForFiscalId(stage.id);
															setActiveTab("fiscal54fz");
														}}
														className="stage-action-btn secondary text-xs"
													>
														<QrCode className="h-3.5 w-3.5" />
														<span>54-ФЗ Чек</span>
													</button>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}

					{/* TAB 2: ESCROW & DEPOSIT */}
					{activeTab === "escrow" && (
						<div className="flex flex-col gap-6">
							{/* Deposit Balances Banner */}
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 shadow-sm">
									<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
										<span>Свободный остаток депозита</span>
										<Wallet className="h-4 w-4 text-emerald-500" />
									</div>
									<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
										{formatKopecksRu(depositWallet.availableDepositKopecks)}
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] mt-2">
										Доступно для покрытия авансов и окончательных расчетов.
									</p>
								</div>

								<div className="rounded-2xl border border-teal-500/30 bg-teal-50/50 dark:bg-teal-950/20 p-5 shadow-sm">
									<div className="flex items-center justify-between text-xs text-teal-700 dark:text-teal-300 mb-1">
										<span>Заблокировано в Эскроу</span>
										<Lock className="h-4 w-4 text-teal-600" />
									</div>
									<div className="text-2xl font-black text-teal-600 dark:text-teal-400">
										{formatKopecksRu(depositWallet.lockedEscrowKopecks)}
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] mt-2">
										Средства заморожены под активные этапы до подписания Акта.
									</p>
								</div>

								<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 shadow-sm">
									<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
										<span>Общий баланс пациента</span>
										<Coins className="h-4 w-4 text-blue-500" />
									</div>
									<div className="text-2xl font-black text-[var(--ink,#0f172a)]">
										{formatKopecksRu(depositWallet.totalBalanceKopecks)}
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] mt-2">
										Суммарные денежные средства пациента в клинике.
									</p>
								</div>
							</div>

							{/* Top-up & Waterfall Allocation Actions */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Deposit Top-Up Form */}
								<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
									<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
										<Plus className="h-5 w-5 text-teal-600" />
										Внесение средств на депозит пациента
									</h3>
									<p className="text-xs text-[var(--muted,#64748b)]">
										Пациент может внести предоплату на свой личный депозитный счет наличными, картой или через СБП.
									</p>
									<div className="flex items-center gap-3">
										<div className="relative flex-1">
											<input
												type="number"
												value={topUpAmountRub}
												onChange={(e) => setTopUpAmountRub(e.target.value)}
												placeholder="Сумма в рублях..."
												className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-none"
											/>
											<span className="absolute right-3.5 top-2.5 text-xs text-[var(--muted,#64748b)] font-bold">
												₽
											</span>
										</div>
										<button
											type="button"
											onClick={handleTopUpDeposit}
											className="stage-action-btn primary"
										>
											Пополнить
										</button>
									</div>
								</div>

								{/* Waterfall Allocation */}
								<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col justify-between gap-4">
									<div>
										<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
											<Sparkles className="h-5 w-5 text-teal-600" />
											Авто-распределение депозита по этапам
										</h3>
										<p className="text-xs text-[var(--muted,#64748b)] mt-1">
											Автоматически направляет свободный остаток на покрытие обязательных авансов в порядке очередности (Терапия → Хирургия → Ортопедия).
										</p>
									</div>
									<button
										type="button"
										onClick={handleAutoAllocateDeposit}
										disabled={depositWallet.availableDepositKopecks <= 0}
										className="stage-action-btn primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Распределить свободный депозит ({formatKopecksRu(depositWallet.availableDepositKopecks)})
									</button>
								</div>
							</div>

							{/* Legal Escrow Protection Guarantee */}
							<div className="rounded-2xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 p-4 text-xs text-[var(--ink,#0f172a)] flex items-start gap-3">
								<ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
								<div>
									<h4 className="font-bold text-teal-900 dark:text-teal-200">
										Гарантия сохранности эскроу-депозита (ГК РФ ст. 711)
									</h4>
									<p className="text-[var(--muted,#64748b)] mt-1">
										Все внесенные пациентом авансовые средства блокируются на целевом эскроу-счете этапа и признаются выручкой клиники исключительно после фактического оказания медицинской услуги и двустороннего подписания Акта сдачи-приемки.
									</p>
								</div>
							</div>
						</div>
					)}

					{/* TAB 3: ACT SIGN-OFF */}
					{activeTab === "act" && (
						<div className="flex flex-col gap-6">
							<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-5">
								<div className="flex items-center justify-between">
									<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
										<FileCheck className="h-5 w-5 text-teal-600" />
										Оформление Акта сдачи-приемки выполненных работ (ст. 720 ГК РФ)
									</h3>
									<span className="text-xs text-[var(--muted,#64748b)]">
										Врач: {doctorFullName}
									</span>
								</div>

								{/* Stage Selector */}
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
											Выберите закрываемый этап:
										</label>
										<select
											value={selectedStageForActId}
											onChange={(e) => setSelectedStageForActId(e.target.value)}
											className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] font-medium focus:border-teal-500 focus:outline-none"
										>
											{stages.map((s) => (
												<option key={s.id} value={s.id}>
													Этап №{s.stageNumber}: {s.title} ({formatKopecksRu(s.totalKopecks)})
												</option>
											))}
										</select>
									</div>

									<div>
										<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
											Номер Акта:
										</label>
										<input
											type="text"
											value={actNumberInput}
											onChange={(e) => setActNumberInput(e.target.value)}
											className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] font-medium focus:border-teal-500 focus:outline-none"
										/>
									</div>

									<div>
										<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
											Дата подписания:
										</label>
										<input
											type="date"
											value={actSignDate}
											onChange={(e) => setActSignDate(e.target.value)}
											className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] font-medium focus:border-teal-500 focus:outline-none"
										/>
									</div>
								</div>

								{/* Selected Stage Detail Card */}
								{(() => {
									const stg = stages.find((s) => s.id === selectedStageForActId);
									if (!stg) return null;
									const preset = getStagePresetByKind(stg.kind);

									return (
										<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-slate-50 dark:bg-slate-900/40 p-4 text-xs flex flex-col gap-3">
											<div className="flex justify-between items-center">
												<span className="font-bold text-sm text-[var(--ink,#0f172a)]">
													{stg.title}
												</span>
												<span className="font-extrabold text-sm text-teal-600 dark:text-teal-400">
													{formatKopecksRu(stg.totalKopecks)}
												</span>
											</div>

											<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[var(--muted,#64748b)]">
												<div>
													<span>Внесено аванса: </span>
													<strong className="text-[var(--ink,#0f172a)]">{formatKopecksRu(stg.advancePaidKopecks)}</strong>
												</div>
												<div>
													<span>Заблокировано в эскроу: </span>
													<strong className="text-teal-600">{formatKopecksRu(stg.escrowLockedKopecks)}</strong>
												</div>
												<div>
													<span>Прямые затраты (Lab/BOM): </span>
													<strong className="text-[var(--ink,#0f172a)]">
														{formatKopecksRu(
															stg.directExpensesKopecks.labKopecks +
																stg.directExpensesKopecks.materialsKopecks +
																stg.directExpensesKopecks.otherKopecks,
														)}
													</strong>
												</div>
											</div>

											<div className="border-t border-[var(--border,#cbd5e1)] pt-2 text-[11px] text-[var(--muted,#64748b)]">
												При подписании Акта средства из эскроу ({formatKopecksRu(stg.escrowLockedKopecks)}) переводятся в признанную выручку клиники, а гарантийные обязательства вступают в силу.
											</div>
										</div>
									);
								})()}

								<div className="flex justify-end gap-3">
									<button
										type="button"
										onClick={handleSignStageAct}
										className="stage-action-btn primary"
									>
										<FileCheck className="h-4 w-4" />
										<span>Подписать Акт сдачи-приемки и разблокировать эскроу</span>
									</button>
								</div>
							</div>
						</div>
					)}

					{/* TAB 4: TERMINATION & REFUND */}
					{activeTab === "termination" && (
						<div className="flex flex-col gap-6">
							{/* Statutory Rule Banner */}
							<div className="rounded-2xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 p-4 text-xs text-[var(--ink,#0f172a)] flex items-start gap-3">
								<AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
								<div>
									<h4 className="font-bold text-rose-900 dark:text-rose-200">
										Расчет возврата при досрочном расторжении (ст. 32 Закона РФ № 2300-1)
									</h4>
									<p className="text-[var(--muted,#64748b)] mt-1">
										Потребитель вправе отказаться от договора в любое время при условии оплаты фактически понесенных расходов клиники (ст. 709 ГК РФ). Работы по подписанным Актам признаны и возврату не подлежат.
									</p>
								</div>
							</div>

							{/* Calculation Breakdown Grid */}
							<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
								<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
									<span className="text-[var(--muted,#64748b)] block">Всего оплачено пациентом:</span>
									<span className="text-xl font-bold text-[var(--ink,#0f172a)] mt-1 block">
										{formatKopecksRu(terminationCalc.totalPaidByPatientKopecks)}
									</span>
								</div>

								<div className="rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
									<span className="text-[var(--muted,#64748b)] block">Принято по Актам (не возвращается):</span>
									<span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
										{formatKopecksRu(terminationCalc.completedActsTotalKopecks)}
									</span>
								</div>

								<div className="rounded-xl border border-rose-300 dark:border-rose-800 bg-[var(--paper-strong,#ffffff)] p-4 text-xs">
									<span className="text-[var(--muted,#64748b)] block">Фактические расходы клиники:</span>
									<span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 block">
										{formatKopecksRu(terminationCalc.actualClinicExpensesKopecks)}
									</span>
								</div>

								<div className="rounded-xl border border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 text-xs">
									<span className="text-emerald-800 dark:text-emerald-300 font-bold block">Сумма к возврату пациенту:</span>
									<span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
										{formatKopecksRu(terminationCalc.refundableToPatientKopecks)}
									</span>
								</div>
							</div>

							{/* Itemized Expenses Table */}
							<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
								<h3 className="font-bold text-sm text-[var(--ink,#0f172a)] flex items-center justify-between">
									<span>Фактически понесенные расходы клиники (Lab, BOM, расходники):</span>
									<span className="text-xs text-[var(--muted,#64748b)] font-normal">
										Позиций: {terminationCalc.itemizedExpenses.length}
									</span>
								</h3>

								{terminationCalc.itemizedExpenses.length > 0 ? (
									<div className="overflow-x-auto">
										<table className="w-full text-xs text-left">
											<thead>
												<tr className="border-b border-[var(--border,#cbd5e1)] text-[var(--muted,#64748b)]">
													<th className="py-2 px-3">Статья расхода</th>
													<th className="py-2 px-3">Категория</th>
													<th className="py-2 px-3">Обоснование</th>
													<th className="py-2 px-3 text-right">Сумма</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-[var(--border,#cbd5e1)]">
												{terminationCalc.itemizedExpenses.map((exp, i) => (
													<tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
														<td className="py-2 px-3 font-semibold text-[var(--ink,#0f172a)]">{exp.title}</td>
														<td className="py-2 px-3 text-[var(--muted,#64748b)]">{exp.category}</td>
														<td className="py-2 px-3 text-[var(--muted,#64748b)]">{exp.justificationRu}</td>
														<td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
															{formatKopecksRu(exp.amountKopecks)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<p className="text-xs text-[var(--muted,#64748b)] italic">
										Прямых расходов по незавершенным этапам не зафиксировано.
									</p>
								)}

								{/* Add Custom Expense Input */}
								<div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border,#cbd5e1)]">
									<input
										type="text"
										value={newExpenseTitle}
										onChange={(e) => setNewExpenseTitle(e.target.value)}
										placeholder="Добавить подтвержденный расход (напр. фрезеровка каркаса)..."
										className="flex-1 min-w-[200px] rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-none"
									/>
									<select
										value={newExpenseCategory}
										onChange={(e) => setNewExpenseCategory(e.target.value as TerminationExpenseItem["category"])}
										className="rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-none"
									>
										<option value="lab_cadcam">CAD/CAM Лаборатория</option>
										<option value="implant_hardware">Имплантаты/Компоненты</option>
										<option value="sterilization_materials">Материалы/Стерилизация</option>
										<option value="diagnostic">Диагностика/Шаблоны</option>
									</select>
									<input
										type="number"
										value={newExpenseRub}
										onChange={(e) => setNewExpenseRub(e.target.value)}
										placeholder="Сумма ₽"
										className="w-28 rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-xs text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-none"
									/>
									<button
										type="button"
										onClick={handleAddCustomExpense}
										className="stage-action-btn secondary text-xs"
									>
										<Plus className="h-4 w-4" />
										<span>Добавить</span>
									</button>
								</div>
							</div>

							{/* Legal Rationale Box */}
							<div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[var(--border,#cbd5e1)] p-4 text-xs text-[var(--muted,#64748b)] leading-relaxed">
								<strong className="text-[var(--ink,#0f172a)] block mb-1">
									Правовое заключение для соглашения о расторжении:
								</strong>
								{terminationCalc.legalRationaleRu}
							</div>
						</div>
					)}

					{/* TAB 5: 54-FZ FISCALIZATION */}
					{activeTab === "fiscal54fz" && (
						<div className="flex flex-col lg:flex-row gap-6 items-start">
							{/* Parameters Config Panel */}
							<div className="flex-1 w-full rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
								<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
									<QrCode className="h-5 w-5 text-teal-600" />
									Параметры фискализации по 54-ФЗ
								</h3>

								<div>
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
										Этап плана лечения:
									</label>
									<select
										value={selectedStageForFiscalId}
										onChange={(e) => setSelectedStageForFiscalId(e.target.value)}
										className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-none"
									>
										{stages.map((s) => (
											<option key={s.id} value={s.id}>
												Этап №{s.stageNumber}: {s.title} ({formatKopecksRu(s.totalKopecks)})
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
										Признак способа расчета (Тег 1214):
									</label>
									<div className="grid grid-cols-3 gap-2">
										<button
											type="button"
											onClick={() => setFiscalPaymentType("advance")}
											className={`stage-action-btn ${fiscalPaymentType === "advance" ? "primary" : "secondary"} text-xs`}
										>
											Аванс / Предоплата
										</button>
										<button
											type="button"
											onClick={() => setFiscalPaymentType("completion")}
											className={`stage-action-btn ${fiscalPaymentType === "completion" ? "primary" : "secondary"} text-xs`}
										>
											Окончательный расчет
										</button>
										<button
											type="button"
											onClick={() => setFiscalPaymentType("full")}
											className={`stage-action-btn ${fiscalPaymentType === "full" ? "primary" : "secondary"} text-xs`}
										>
											Полная оплата 100%
										</button>
									</div>
								</div>

								<div>
									<label className="text-xs font-semibold text-[var(--muted,#64748b)] block mb-1.5">
										Способ оплаты:
									</label>
									<select
										value={fiscalPaymentMethod}
										onChange={(e) => setFiscalPaymentMethod(e.target.value as any)}
										className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 py-2 text-sm text-[var(--ink,#0f172a)] focus:border-teal-500 focus:outline-none"
									>
										<option value="BANK_CARD">Банковская карта (Эквайринг)</option>
										<option value="SBP_QR">СБП QR-код</option>
										<option value="CASH">Наличные в кассу</option>
										<option value="PATIENT_DEPOSIT">Списание с депозита</option>
									</select>
								</div>

								<div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-3 text-xs text-[var(--muted,#64748b)] border border-[var(--border,#cbd5e1)]">
									<div>• Система налогообложения: <strong>УСН Доходы</strong></div>
									<div>• Налоговая ставка: <strong>Без НДС (ст. 149 НК РФ пп. 2 п. 2)</strong></div>
									<div>• Тег 1212 (Предмет расчета): <strong>10 (Платеж/Аванс) / 4 (Услуга)</strong></div>
								</div>

								<button
									type="button"
									onClick={handleGenerateFiscalReceipt}
									className="stage-action-btn primary w-full"
								>
									<QrCode className="h-4 w-4" />
									Сформировать фискальный чек
								</button>
							</div>

							{/* Thermal Receipt Paper Visual Simulation */}
							<div className="w-full lg:w-96 flex flex-col items-center">
								{activeFiscalReceipt ? (
									<div className="fiscal-slip-container w-full">
										<div className="text-center font-bold">{activeFiscalReceipt.clinicName}</div>
										<div className="text-center text-xs">ИНН: {activeFiscalReceipt.clinicInn}</div>
										<div className="text-center text-xs">{activeFiscalReceipt.taxationSystem}</div>
										<div className="fiscal-slip-divider" />

										<div className="flex justify-between text-xs">
											<span>КАССОВЫЙ ЧЕК</span>
											<span>ПРИХОД</span>
										</div>
										<div className="text-xs">Чек №: {activeFiscalReceipt.receiptId}</div>
										<div className="text-xs">
											Дата: {new Date(activeFiscalReceipt.timestamp).toLocaleString("ru-RU")}
										</div>
										<div className="text-xs">Клиент: {activeFiscalReceipt.patientName}</div>
										<div className="fiscal-slip-divider" />

										{activeFiscalReceipt.items.map((item, idx) => (
											<div key={idx} className="flex flex-col gap-1 mb-2 text-xs">
												<div className="font-semibold">{item.name}</div>
												<div className="flex justify-between text-[11px] text-[var(--muted,#64748b)]">
													<span>Признак: {activeFiscalReceipt.calculationSign} (Т1214:{item.fiscalTag1214})</span>
													<span>{item.quantity} x {formatKopecksRu(item.priceKopecks)}</span>
												</div>
												<div className="flex justify-between font-bold">
													<span>{activeFiscalReceipt.vatRate}</span>
													<span>{formatKopecksRu(item.totalKopecks)}</span>
												</div>
											</div>
										))}

										<div className="fiscal-slip-divider" />
										<div className="flex justify-between text-sm font-extrabold">
											<span>ИТОГО К ОПЛАТЕ:</span>
											<span>{formatKopecksRu(activeFiscalReceipt.totalAmountKopecks)}</span>
										</div>
										<div className="flex justify-between text-xs">
											<span>Вид оплаты ({activeFiscalReceipt.paymentMethod}):</span>
											<span>{formatKopecksRu(activeFiscalReceipt.totalAmountKopecks)}</span>
										</div>

										<div className="fiscal-slip-divider" />
										<div className="text-[10px] text-[var(--muted,#64748b)] space-y-0.5">
											<div>ФН: {activeFiscalReceipt.fnNumber}</div>
											<div>ФД: {activeFiscalReceipt.fdNumber}</div>
											<div>ФПД: {activeFiscalReceipt.fpd}</div>
										</div>

										{/* QR Payload visualization */}
										<div className="mt-3 text-center p-3 border border-slate-300 dark:border-slate-700 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono break-all">
											[QR-КОД ФНС 54-ФЗ]<br />
											{activeFiscalReceipt.qrPayload}
										</div>
									</div>
								) : (
									<div className="w-full rounded-2xl border border-dashed border-[var(--border,#cbd5e1)] p-12 text-center text-xs text-[var(--muted,#64748b)]">
										Выберите этап и нажмите «Сформировать фискальный чек» для предпросмотра чека ККТ.
									</div>
								)}
							</div>
						</div>
					)}

					{/* TAB 6: STATUTORY CONTRACT ADDENDUM (A4) */}
					{activeTab === "contract_addendum" && (
						<div className="flex flex-col gap-4">
							<div className="contract-addendum-a4">
								<div className="text-center font-bold text-sm mb-1">
									ПРИЛОЖЕНИЕ № 1
								</div>
								<div className="text-center font-bold text-base mb-4">
									к Договору на оказание платных медицинских услуг<br />
									СОГЛАШЕНИЕ О ПОРЯДКЕ И ГРАФИКЕ ПОЭТАПНОЙ ОПЛАТЫ ЛЕЧЕНИЯ
								</div>

								<div className="flex justify-between text-xs mb-4">
									<span>г. Москва</span>
									<span>«{new Date().getDate()}» {new Date().toLocaleString("ru-RU", { month: "long" })} {new Date().getFullYear()} г.</span>
								</div>

								<p className="text-xs text-justify mb-3">
									<strong>{clinicName}</strong>, именуемое в дальнейшем «Исполнитель», в лице главного врача, действующего на основании Устава и Лицензии на медицинскую деятельность, с одной стороны, и гражданин(ка) <strong>{patientName}</strong>, именуемый(ая) в дальнейшем «Пациент (Заказчик)», с другой стороны, заключили настоящее Соглашение о нижеследующем:
								</p>

								<div className="text-xs font-bold mb-2">1. ПРЕДМЕТ СОГЛАШЕНИЯ И ЭТАПЫ ЛЕЧЕНИЯ</div>
								<p className="text-xs text-justify mb-3">
									1.1. В соответствии со статьями 709, 711 Гражданского кодекса РФ Стороны согласовали план лечения <strong>«{planTitle}»</strong>, разделенный на самостоятельные клинические этапы с раздельным финансированием и приемкой результатов.
								</p>

								<table className="contract-addendum-table">
									<thead>
										<tr>
											<th>№</th>
											<th>Наименование этапа лечения</th>
											<th>Сумма (руб.)</th>
											<th>Аванс (%)</th>
											<th>Сумма аванса (руб.)</th>
											<th>Окончательный расчет (руб.)</th>
										</tr>
									</thead>
									<tbody>
										{stages.map((stg) => (
											<tr key={stg.id}>
												<td>{stg.stageNumber}</td>
												<td>{stg.title}</td>
												<td>{formatKopecksRu(stg.totalKopecks)}</td>
												<td>{getStagePresetByKind(stg.kind).defaultAdvancePercent}%</td>
												<td>{formatKopecksRu(stg.advanceRequiredKopecks)}</td>
												<td>{formatKopecksRu(Math.max(0, stg.totalKopecks - stg.advanceRequiredKopecks))}</td>
											</tr>
										))}
										<tr className="font-bold bg-slate-100">
											<td colSpan={2}>ИТОГО ПО ВСЕМ ЭТАПАМ:</td>
											<td>{formatKopecksRu(totals.grandTotalKopecks)}</td>
											<td>-</td>
											<td>{formatKopecksRu(totals.totalAdvanceRequiredKopecks)}</td>
											<td>{formatKopecksRu(totals.grandTotalKopecks - totals.totalAdvanceRequiredKopecks)}</td>
										</tr>
									</tbody>
								</table>

								<div className="text-xs font-bold mb-2 mt-4">2. ПОРЯДОК ОПЛАТЫ И ПРИЕМКИ РАБОТ (ЭСКРОУ)</div>
								<p className="text-xs text-justify mb-2">
									2.1. Пациент обязуется внести авансовый платеж по каждому этапу до начала выполнения соответствующих медицинских манипуляций.
								</p>
								<p className="text-xs text-justify mb-2">
									2.2. Авансовые средства блокируются на внутреннем эскроу-депозите клиники и признаются выручкой Исполнителя только после завершения этапа и подписания Сторонами двустороннего Акта сдачи-приемки выполненных работ (ст. 720 ГК РФ).
								</p>
								<p className="text-xs text-justify mb-4">
									2.3. В случае досрочного расторжения настоящего договора по инициативе Пациента (ст. 32 Закона РФ № 2300-1) внесенный аванс по незавершенным этапам возвращается за вычетом фактически понесенных Исполнителем затрат (оплата зуботехнической лаборатории CAD/CAM, титановые имплантаты, стерильные наборы).
								</p>

								{/* Signatures */}
								<div className="grid grid-cols-2 gap-8 mt-8 pt-4 border-t border-slate-400 text-xs">
									<div>
										<strong>ИСПОЛНИТЕЛЬ:</strong><br />
										{clinicName}<br />
										ИНН: {clinicInn}<br />
										Врач: ___________________ / {doctorFullName} /<br />
										М.П.
									</div>
									<div>
										<strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br />
										{patientName}<br />
										Паспорт / ИД: {patientId}<br />
										Подпись: ___________________ / {patientName} /
									</div>
								</div>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	);
};
