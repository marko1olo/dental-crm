/**
 * PatientInstallmentScheduleModal.tsx — Студия графика платежей, рассрочки 0% и контроля задолженности (DENTE CRM).
 * 
 * НОРМАТИВНЫЙ КОНТУР:
 * • ГК РФ ст. 709 («Смета»), ст. 711 («Порядок оплаты»), ст. 819 («Рассрочка платежа»).
 * • Закон РФ № 2300-1 ст. 37 («Порядок оплаты услуг»).
 * • 54-ФЗ (тег 1214: предоплата, аванс, полный расчет).
 */

import React, { useMemo, useState } from "react";
import {
	AlertTriangle,
	ArrowRight,
	Calendar,
	Check,
	CheckCircle2,
	Clock,
	Copy,
	CreditCard,
	Download,
	FileCheck,
	FileText,
	HelpCircle,
	Layers,
	MessageSquare,
	Percent,
	Phone,
	Printer,
	QrCode,
	Receipt,
	ShieldCheck,
	Sparkles,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import {
	type ClinicalStagePaymentItem,
	type InstallmentMonthSchedule,
	type Kopecks,
	type PatientDebtSummary,
	calculatePatientDebtSummary,
	createDefaultImplantStagesPreset,
	formatKopecksRu,
	generate0PercentInstallmentSchedule,
	generateDebtPaymentReminderMessage,
	parseKopecks,
	rublesToKopecks,
} from "@dental/shared";
import { showToast } from "../GlobalToast";

export interface PatientInstallmentScheduleModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientName?: string;
	readonly patientPhone?: string;
	readonly doctorName?: string;
	readonly clinicName?: string;
	readonly treatmentPlanTitle?: string;
	readonly totalAmountRub?: number;
	readonly initialStages?: readonly ClinicalStagePaymentItem[];
	readonly onPayStage?: (stageId: string, amountKopecks: Kopecks) => void | Promise<void>;
	readonly onOpenSbpPayment?: (amountKopecks: Kopecks, description: string) => void | Promise<void>;
	readonly sbpQrUrl?: string;
}

export const PatientInstallmentScheduleModal: React.FC<PatientInstallmentScheduleModalProps> = ({
	isOpen,
	onClose,
	patientName = "Иванов Иван Сергеевич",
	patientPhone = "+7 (999) 123-45-67",
	doctorName = "Д-р Смирнов А. В. (Хирург-имплантолог, Ортопед)",
	clinicName = "Стоматологическая клиника DENTE",
	treatmentPlanTitle,
	totalAmountRub,
	initialStages,
	onPayStage,
	onOpenSbpPayment,
	sbpQrUrl,
}) => {
	const [stages, setStages] = useState<ClinicalStagePaymentItem[]>(() => {
		return initialStages && initialStages.length > 0
			? [...initialStages]
			: createDefaultImplantStagesPreset(totalAmountRub ?? 300000);
	});

	const [activeTab, setActiveTab] = useState<"stages" | "installments" | "fiscal_ndfl">("stages");
	const [selectedInstallmentMonths, setSelectedInstallmentMonths] = useState<3 | 6 | 12 | 24>(6);
	const [copied, setCopied] = useState(false);

	const debtSummary: PatientDebtSummary = useMemo(() => {
		return calculatePatientDebtSummary(stages);
	}, [stages]);

	const installmentSchedule: InstallmentMonthSchedule[] = useMemo(() => {
		return generate0PercentInstallmentSchedule(
			debtSummary.remainingDebtKopecks,
			selectedInstallmentMonths,
		);
	}, [debtSummary.remainingDebtKopecks, selectedInstallmentMonths]);

	const handlePayStageClick = async (stage: ClinicalStagePaymentItem) => {
		const remainingStageKop = Math.max(0, stage.totalCostKopecks - stage.paidKopecks) as Kopecks;
		if (remainingStageKop <= 0) {
			showToast("Этап уже полностью оплачен", "info");
			return;
		}

		try {
			if (onPayStage) {
				await onPayStage(stage.id, remainingStageKop);
			} else if (onOpenSbpPayment) {
				await onOpenSbpPayment(remainingStageKop, `Оплата этапа: ${stage.title}`);
			} else {
				showToast("Ошибка проведения платежа: обработчик оплаты не задан", "error");
			}
		} catch {
			showToast("Ошибка проведения платежа", "error");
		}
	};

	const handleCopyReminder = async () => {
		const text = generateDebtPaymentReminderMessage(
			patientName,
			clinicName,
			debtSummary,
			sbpQrUrl,
		);
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
			showToast("Текст напоминания скопирован для WhatsApp", "success");
		} catch {
			showToast("Не удалось скопировать текст", "error");
		}
	};

	const handlePrintSchedule = () => {
		window.print();
	};

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			data-testid="patient-installment-schedule-modal"
		>
			<div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-2xl overflow-hidden font-sans text-[var(--ink,#0f172a)] dark:text-slate-100">
				{/* Header */}
				<div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900/80 shrink-0">
					<div className="flex items-center gap-3 min-w-0">
						<div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
							<CreditCard className="w-5 h-5" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h2 className="text-base sm:text-lg font-black text-[var(--ink,#0f172a)] dark:text-white m-0 break-words">
									График платежей и рассрочка
								</h2>
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 whitespace-nowrap">
									ГК РФ ст. 709 & 54-ФЗ
								</span>
							</div>
							<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 m-0 mt-0.5 break-words">
								Пациент: <span className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">{patientName}</span> · {doctorName}
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="close-installment-modal-btn"
					>
						<X size={20} />
					</button>
				</div>

				{/* Financial Progress & Debt Status Bar */}
				<div className="px-4 sm:px-6 py-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper,#ffffff)] dark:bg-slate-900 shrink-0">
					{debtSummary.hasOverdueDebt && (
						<div className="mb-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-3 shadow-xs animate-pulse">
							<div className="flex items-center gap-2 text-xs font-bold min-w-0">
								<AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
								<span>
									Внимание! Имеется просроченная задолженность:{" "}
									<span className="font-mono font-black">{debtSummary.formattedOverdueDebt}</span>
								</span>
							</div>
							<span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-rose-600 text-white shrink-0">
								Просрочено
							</span>
						</div>
					)}

					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
						<div className="p-2.5 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
							<div className="text-[11px] font-bold text-[var(--muted,#64748b)] dark:text-slate-400">
								Сумма плана (300 000 ₽)
							</div>
							<div className="text-sm sm:text-base font-mono font-black text-[var(--ink,#0f172a)] dark:text-white mt-0.5">
								{debtSummary.formattedTotalCost}
							</div>
						</div>

						<div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30">
							<div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
								Оплачено ({debtSummary.paidPercent}%)
							</div>
							<div className="text-sm sm:text-base font-mono font-black text-emerald-800 dark:text-emerald-200 mt-0.5">
								{debtSummary.formattedTotalPaid}
							</div>
						</div>

						<div
							className={`p-2.5 rounded-xl border ${
								debtSummary.hasDebt
									? "bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30"
									: "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700"
							}`}
						>
							<div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
								Остаток долга
							</div>
							<div className="text-sm sm:text-base font-mono font-black text-amber-800 dark:text-amber-200 mt-0.5">
								{debtSummary.formattedRemainingDebt}
							</div>
						</div>

						<div className="p-2.5 rounded-xl bg-teal-500/10 dark:bg-teal-950/40 border border-teal-500/30">
							<div className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
								Вычет НДФЛ 13%
							</div>
							<div className="text-sm sm:text-base font-mono font-black text-teal-800 dark:text-teal-200 mt-0.5">
								+{debtSummary.formattedNdflRefund}
							</div>
						</div>
					</div>

					{/* Visual Progress Line */}
					<div className="mt-3">
						<div className="flex items-center justify-between text-[11px] font-bold text-[var(--muted,#64748b)] mb-1">
							<span>Прогресс погашения сметы</span>
							<span className="font-mono">{debtSummary.paidPercent}%</span>
						</div>
						<div className="h-2 w-full bg-[var(--line,#e2e8f0)] dark:bg-slate-800 rounded-full overflow-hidden">
							<div
								className="h-full bg-emerald-500 rounded-full transition-all duration-300"
								style={{ width: `${debtSummary.paidPercent}%` }}
							/>
						</div>
					</div>
				</div>

				{/* Tabs Navigation */}
				<div className="flex border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900 px-4 sm:px-6 pt-2 shrink-0 gap-2 overflow-x-auto whitespace-nowrap">
					<button
						type="button"
						onClick={() => setActiveTab("stages")}
						className={`min-h-[38px] px-3.5 py-1.5 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
							activeTab === "stages"
								? "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-teal-600 dark:text-teal-300 border-teal-500 shadow-xs"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
						data-testid="tab-clinical-stages"
					>
						<Layers size={14} />
						<span>1. Клинические этапы (Хирургия / Ортопедия)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("installments")}
						className={`min-h-[38px] px-3.5 py-1.5 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
							activeTab === "installments"
								? "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-teal-600 dark:text-teal-300 border-teal-500 shadow-xs"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
						data-testid="tab-0-installments"
					>
						<Sparkles size={14} />
						<span>2. Рассрочка 0% (3/6/12/24 мес)</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("fiscal_ndfl")}
						className={`min-h-[38px] px-3.5 py-1.5 rounded-t-xl text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
							activeTab === "fiscal_ndfl"
								? "bg-[var(--paper,#ffffff)] dark:bg-slate-800 text-teal-600 dark:text-teal-300 border-teal-500 shadow-xs"
								: "border-transparent text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
						}`}
						data-testid="tab-fiscal-ndfl"
					>
						<Receipt size={14} />
						<span>3. 54-ФЗ чеки & Вычет 13%</span>
					</button>
				</div>

				{/* Modal Content Body */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
					{/* TAB 1: Clinical Stages (Surgery 150k + Orthopedics 150k) */}
					{activeTab === "stages" && (
						<div className="space-y-3.5">
							<div className="text-xs font-black text-[var(--muted,#64748b)] dark:text-slate-400 uppercase tracking-wider">
								Поэтапная оплата по ходу клинического лечения:
							</div>

							{stages.map((stage) => {
								const remainingKop = Math.max(0, stage.totalCostKopecks - stage.paidKopecks) as Kopecks;
								const isFullyPaid = remainingKop === 0;
								const isOverdue =
									remainingKop > 0 && new Date(stage.dueDateIso).getTime() < Date.now();

								return (
									<div
										key={stage.id}
										className={`p-4 rounded-2xl border transition-all ${
											isFullyPaid
												? "bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30"
												: isOverdue
													? "bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/40 shadow-xs"
													: "bg-[var(--paper,#ffffff)] dark:bg-slate-800/70 border-[var(--line,#e2e8f0)] dark:border-slate-800 shadow-sm"
										}`}
										data-testid={`stage-item-${stage.id}`}
									>
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800">
											<div className="min-w-0">
												<div className="flex items-center gap-2 flex-wrap">
													<span className="text-sm sm:text-base font-black text-[var(--ink,#0f172a)] dark:text-white break-words">
														{stage.title}
													</span>
													<span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] dark:bg-slate-700 text-[var(--muted,#64748b)] dark:text-slate-300">
														804н: {stage.code804n}
													</span>
												</div>
												<div className="text-xs text-[var(--muted,#64748b)] dark:text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
													<span className="flex items-center gap-1">
														<Calendar size={13} />
														Срок оплаты: {new Date(stage.dueDateIso).toLocaleDateString("ru-RU")}
													</span>
													<span>{stage.servicesCount} манипуляции</span>
												</div>
											</div>

											<div className="flex items-center gap-2 shrink-0">
												{isFullyPaid ? (
													<span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-1">
														<CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
														<span>Оплачено 100%</span>
													</span>
												) : isOverdue ? (
													<span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/40 text-xs font-black flex items-center gap-1 animate-pulse">
														<AlertTriangle size={14} className="text-rose-600 dark:text-rose-400" />
														<span>Просрочено</span>
													</span>
												) : (
													<span className="px-3 py-1 rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
														<Clock size={14} className="text-amber-600" />
														<span>Ожидает оплаты</span>
													</span>
												)}
											</div>
										</div>

										<div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
											<div className="flex items-center gap-4 text-xs font-bold">
												<div>
													<span className="text-[var(--muted,#64748b)] dark:text-slate-400">
														Сумма этапа:
													</span>{" "}
													<span className="font-mono text-sm text-[var(--ink,#0f172a)] dark:text-white">
														{formatKopecksRu(stage.totalCostKopecks)}
													</span>
												</div>
												<div>
													<span className="text-[var(--muted,#64748b)] dark:text-slate-400">
														Внесено:
													</span>{" "}
													<span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
														{formatKopecksRu(stage.paidKopecks)}
													</span>
												</div>
												<div>
													<span className="text-[var(--muted,#64748b)] dark:text-slate-400">
														Остаток:
													</span>{" "}
													<span className="font-mono text-sm text-rose-600 dark:text-rose-400">
														{formatKopecksRu(remainingKop)}
													</span>
												</div>
											</div>

											{!isFullyPaid && (
												<button
													type="button"
													onClick={() => handlePayStageClick(stage)}
													className="min-h-[40px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 shrink-0"
													data-testid={`pay-stage-btn-${stage.id}`}
												>
													<CreditCard size={14} />
													<span>Оплатить этап ({formatKopecksRu(remainingKop)})</span>
												</button>
											)}
										</div>

										{stage.notes && (
											<div className="mt-2 text-xs text-[var(--muted,#64748b)] dark:text-slate-400 italic">
												{stage.notes}
											</div>
										)}
									</div>
								);
							})}
						</div>
					)}

					{/* TAB 2: 0% Installment Schedule (3, 6, 12, 24 months) */}
					{activeTab === "installments" && (
						<div className="space-y-4">
							<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-teal-500/10 dark:bg-teal-950/40 border border-teal-500/30">
								<div>
									<div className="text-sm font-black text-teal-800 dark:text-teal-200">
										Беспроцентная рассрочка клиники (0% переплат)
									</div>
									<p className="text-xs text-[var(--muted,#64748b)] dark:text-slate-300 m-0 mt-0.5">
										Остаток к распределению:{" "}
										<span className="font-mono font-bold text-teal-700 dark:text-teal-300">
											{debtSummary.formattedRemainingDebt}
										</span>
									</p>
								</div>

								{/* Month Selector with 32px height buttons */}
								<div className="inline-flex p-1 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-800 border border-[var(--line,#e2e8f0)] dark:border-slate-700 shrink-0">
									{([3, 6, 12, 24] as const).map((m) => (
										<button
											key={m}
											type="button"
											onClick={() => setSelectedInstallmentMonths(m)}
											className={`min-h-[32px] h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
												selectedInstallmentMonths === m
													? "bg-teal-600 text-white shadow-xs"
													: "text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] dark:hover:text-white"
											}`}
											data-testid={`installment-months-${m}`}
										>
											{m} мес
										</button>
									))}
								</div>
							</div>

							{/* Monthly Schedule Table */}
							<div className="border border-[var(--line,#e2e8f0)] dark:border-slate-800 rounded-2xl overflow-hidden">
								<table className="w-full text-left text-xs border-collapse">
									<thead className="bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-b border-[var(--line,#e2e8f0)] dark:border-slate-800 font-bold text-[var(--muted,#64748b)]">
										<tr>
											<th className="p-3">№ Платежа</th>
											<th className="p-3">Дата списания</th>
											<th className="p-3 text-right">Сумма (точно в копейках)</th>
											<th className="p-3 text-center">Статус</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-[var(--line,#e2e8f0)] dark:divide-slate-800">
										{installmentSchedule.map((row) => (
											<tr
												key={row.monthIndex}
												className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
											>
												<td className="p-3 font-bold text-[var(--ink,#0f172a)] dark:text-white">
													Платёж #{row.monthIndex} из {selectedInstallmentMonths}
												</td>
												<td className="p-3 font-mono text-[var(--muted,#64748b)] dark:text-slate-300">
													{new Date(row.paymentDateIso).toLocaleDateString("ru-RU")}
												</td>
												<td className="p-3 text-right font-mono font-bold text-sm text-[var(--ink,#0f172a)] dark:text-white">
													{formatKopecksRu(row.amountKopecks)}
												</td>
												<td className="p-3 text-center">
													{row.isPaid ? (
														<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
															Оплачен
														</span>
													) : row.isOverdue ? (
														<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-200">
															Просрочен
														</span>
													) : (
														<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200">
															Запланирован
														</span>
													)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}

					{/* TAB 3: Fiscal 54-FZ & 13% Tax Deduction */}
					{activeTab === "fiscal_ndfl" && (
						<div className="space-y-4">
							<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-800 space-y-3">
								<div className="flex items-center gap-2 font-black text-sm text-[var(--ink,#0f172a)] dark:text-white">
									<ShieldCheck className="text-teal-600 dark:text-teal-400" size={18} />
									<span>Фискализация по 54-ФЗ и налоговые преференции</span>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
									<div className="p-3 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
										<div className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">
											Тег 1214 (Признак способа расчета)
										</div>
										<p className="text-[var(--muted,#64748b)] mt-1">
											Авансовые этапы фискализируются как «Аванс» (3) или «Предоплата» (2). По завершении этапа пробивается чек «Полный расчет» (4).
										</p>
									</div>
									<div className="p-3 rounded-xl bg-[var(--paper,#ffffff)] dark:bg-slate-900 border border-[var(--line,#e2e8f0)] dark:border-slate-800">
										<div className="font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">
											Справка для ФНС (Вычет 13%)
										</div>
										<p className="text-[var(--muted,#64748b)] mt-1">
											Пациенту доступен возврат 13% НДФЛ от фактически оплаченной суммы:{" "}
											<span className="font-mono font-bold text-teal-600 dark:text-teal-400">
												+{debtSummary.formattedNdflRefund}
											</span>
										</p>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Fixed Action Footer */}
				<div className="p-4 sm:px-6 py-3.5 border-t border-[var(--line,#e2e8f0)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={handleCopyReminder}
							className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
							title="Скопировать график платежей для WhatsApp"
							data-testid="copy-whatsapp-reminder-btn"
						>
							{copied ? <Check size={14} className="text-emerald-600" /> : <MessageSquare size={14} />}
							<span>{copied ? "Скопировано!" : "Напоминание (WhatsApp)"}</span>
						</button>

						<button
							type="button"
							onClick={handlePrintSchedule}
							className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
							title="Распечатать график платежей для пациента"
							data-testid="print-schedule-btn"
						>
							<Printer size={14} />
							<span>Печать (A4)</span>
						</button>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[40px] px-4 py-2 rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold cursor-pointer transition-all"
						>
							Закрыть
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
