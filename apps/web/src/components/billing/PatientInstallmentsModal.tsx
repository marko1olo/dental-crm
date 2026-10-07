/**
 * PatientInstallmentsModal.tsx — Clinic Internal 0% Installment Management Modal.
 * 
 * Compliance: Mandates 8d, 8e, 8n, 8p (Studio Clinical HIG / Apple WebKit Density).
 * Modal depth strictly 1 (Zero nested popup windows).
 * Exact integer kopecks arithmetic without float drift.
 */

import React, { useState, useMemo, useEffect } from "react";
import {
	AlertTriangle,
	Calendar,
	Check,
	CheckCircle2,
	ChevronDown,
	Clock,
	Copy,
	CreditCard,
	DollarSign,
	FileText,
	MessageSquare,
	Phone,
	Plus,
	Printer,
	QrCode,
	Receipt,
	Send,
	ShieldCheck,
	Sparkles,
	Wallet,
	X,
} from "lucide-react";
import {
	type InstallmentPlan,
	type InstallmentPlanStatus,
	type InternalInstallmentScheduleItem,
	type FiscalReceipt54FzResult,
	type TreatmentPresetType,
	createDefaultInternalInstallmentsPreset,
	evaluateInstallmentStatus,
	generateInstallmentReminder,
	generateInstallmentSchedule,
	recordInstallmentPayment,
	generateInstallmentContractNumber,
	TREATMENT_INSTALLMENT_PRESETS,
} from "./installmentsEngine.js";
import { formatKopecksRu, rublesToKopecks } from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { usePatientInstallmentsApi, isUuid } from "./usePatientInstallmentsApi.js";
import "./patientInstallments.css";

export interface PatientInstallmentsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialPlan?: InstallmentPlan | undefined;
	readonly onPlanUpdate?: (plan: InstallmentPlan) => void;
	readonly onOpenBankInstallment?: () => void | undefined;
}

export const PatientInstallmentsModal: React.FC<PatientInstallmentsModalProps> = ({
	isOpen,
	onClose,
	patientId = "pat-demo-1",
	patientName = "Смирнова Елена Васильевна",
	patientPhone = "+7 (926) 345-67-89",
	clinicName = "ООО «ДЕНТЕ»",
	initialPlan,
	onPlanUpdate,
	onOpenBankInstallment,
}) => {
	// Active installment plan state
	const [plan, setPlan] = useState<InstallmentPlan>(() => {
		if (initialPlan) return initialPlan;
		return createDefaultInternalInstallmentsPreset(
			patientId,
			patientName,
			"aligners",
			new Date().toISOString(),
			patientPhone,
		);
	});

	// Sub-panels (Single surface mode — Modal Depth strictly 1)
	const [activeSubView, setActiveSubView] = useState<"schedule" | "quick_pay" | "reminder" | "create_preset">("schedule");
	const [selectedPaymentItemId, setSelectedPaymentItemId] = useState<string | null>(null);
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"card" | "cash" | "sbp">("card");
	const [customPayAmountRub, setCustomPayAmountRub] = useState<string>("");
	const [lastReceipt, setLastReceipt] = useState<FiscalReceipt54FzResult | null>(null);

	// New preset creation state
	const [selectedPreset, setSelectedPreset] = useState<TreatmentPresetType>("aligners");
	const [newTotalRubles, setNewTotalRubles] = useState<number>(360000);
	const [newDownPaymentPercent, setNewDownPaymentPercent] = useState<number>(30);
	const [newMonthsCount, setNewMonthsCount] = useState<number>(10);

	const appLogic = useOptionalAppLogicContext();
	const installmentsApi = usePatientInstallmentsApi({
		patientId,
		getMutationHeaders: () => appLogic?.auth?.denteClinicalMutationHeaders?.() ?? {},
		getReadHeaders: () => appLogic?.auth?.denteClinicalReadHeaders?.() ?? {},
	});

	// Sync initialPlan if passed externally
	useEffect(() => {
		if (initialPlan) {
			setPlan(initialPlan);
		}
	}, [initialPlan]);

	// Auto-fetch real active contract from database if patientId is real UUID
	useEffect(() => {
		if (isOpen && patientId && isUuid(patientId) && !initialPlan) {
			installmentsApi.fetchActiveContract().then((serverPlan) => {
				if (serverPlan) {
					setPlan(serverPlan);
					onPlanUpdate?.(serverPlan);
				}
			});
		}
	}, [isOpen, patientId, initialPlan, installmentsApi, onPlanUpdate]);

	if (!isOpen) return null;

	// Dynamic status badges
	const statusBadgeConfig = {
		on_schedule: {
			label: "По графику",
			className: "patient-installments-badge-on-schedule",
			icon: CheckCircle2,
		},
		due: {
			label: "Очередной платеж ожидает оплаты",
			className: "patient-installments-badge-due",
			icon: Clock,
		},
		overdue: {
			label: "Просрочен",
			className: "patient-installments-badge-overdue",
			icon: AlertTriangle,
		},
		completed: {
			label: "Полностью выплачен",
			className: "patient-installments-badge-completed",
			icon: ShieldCheck,
		},
	}[plan.status];

	const StatusIcon = statusBadgeConfig.icon;

	// 1-Click Pay Handler
	const handleInitiateQuickPay = (itemId?: string) => {
		const target = itemId
			? plan.schedule.find((s) => s.id === itemId)
			: plan.nextPaymentDueItem || plan.schedule.find((s) => s.paidKopecks < s.amountKopecks);

		if (!target) {
			showToast("Все платежи по рассрочке уже оплачены!", "success");
			return;
		}

		setSelectedPaymentItemId(target.id);
		const remainingItemKop = target.amountKopecks - target.paidKopecks;
		setCustomPayAmountRub((remainingItemKop / 100).toFixed(0));
		setActiveSubView("quick_pay");
	};

	const handleExecutePayment = async () => {
		if (!selectedPaymentItemId) return;

		const target = plan.schedule.find((s) => s.id === selectedPaymentItemId);
		if (!target) return;

		const enteredKop = customPayAmountRub
			? rublesToKopecks(Math.max(1, Number(customPayAmountRub)))
			: (target.amountKopecks - target.paidKopecks);

		try {
			if (isUuid(selectedPaymentItemId)) {
				await installmentsApi.payTranche(selectedPaymentItemId);
			}

			const { updatedPlan, receipt } = recordInstallmentPayment({
				plan,
				paymentItemId: selectedPaymentItemId,
				paidAmountKopecks: enteredKop,
				paymentMethod: selectedPaymentMethod,
				paidAtIso: new Date().toISOString(),
			});

			setPlan(updatedPlan);
			setLastReceipt(receipt);
			onPlanUpdate?.(updatedPlan);
			setActiveSubView("schedule");

			showToast(
				`Платеж ${receipt.formattedAmount} принят! Чек ${receipt.receiptNumber} сформирован.`,
				"success",
			);
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка проведения платежа", "error");
		}
	};

	// Reminder Generator
	const reminderData = generateInstallmentReminder({
		patientName,
		clinicName,
		plan,
		sbpQrUrl: "https://qr.nspk.ru/pay-installment-0pct",
	});

	const handleCopyReminder = () => {
		navigator.clipboard.writeText(reminderData.messageText);
		showToast("Текст напоминания скопирован в буфер обмена", "success");
	};

	const handleCreateNewPlan = async () => {
		const totalKop = rublesToKopecks(newTotalRubles);
		const downPaymentKop = Math.round((totalKop * newDownPaymentPercent) / 100);
		const validMonths = ([3, 6, 12, 24].includes(newMonthsCount)
			? newMonthsCount
			: (newMonthsCount <= 4 ? 3 : (newMonthsCount <= 8 ? 6 : (newMonthsCount <= 18 ? 12 : 24)))) as 3 | 6 | 12 | 24;

		const presetCfg = TREATMENT_INSTALLMENT_PRESETS[selectedPreset];

		if (isUuid(patientId)) {
			const serverPlan = await installmentsApi.createContract({
				patientId,
				totalAmountRub: newTotalRubles,
				downPaymentRub: Math.round((newTotalRubles * newDownPaymentPercent) / 100),
				monthsCount: validMonths,
				notes: presetCfg.notes,
			});

			if (serverPlan) {
				setPlan(serverPlan);
				onPlanUpdate?.(serverPlan);
				setActiveSubView("schedule");
				showToast(`Договор рассрочки ${serverPlan.contractNumber} успешно оформлен!`, "success");
				return;
			}
		}

		const schedule = generateInstallmentSchedule({
			totalAmountKopecks: totalKop,
			downPaymentKopecks: downPaymentKop,
			monthsCount: newMonthsCount,
			startDateIso: new Date().toISOString(),
			dueDayOfMonth: 15,
		});

		const evalResult = evaluateInstallmentStatus(schedule, new Date().toISOString());

		const contractNumber = generateInstallmentContractNumber(patientId, new Date().toISOString(), 1);

		const newPlan: InstallmentPlan = {
			id: `inst-plan-${selectedPreset}-${patientId}-${Date.now()}`,
			contractNumber,
			patientId,
			patientName,
			patientPhone,
			doctorName: "Лечащий врач",
			treatmentTitle: presetCfg.title,
			totalAmountKopecks: totalKop,
			downPaymentKopecks: downPaymentKop,
			monthsCount: newMonthsCount,
			monthlyPaymentKopecks: schedule.length > 1 ? schedule[1]!.amountKopecks : 0,
			startDateIso: new Date().toISOString(),
			schedule: evalResult.updatedSchedule,
			paidAmountKopecks: evalResult.paidAmountKopecks,
			remainingDebtKopecks: evalResult.remainingDebtKopecks,
			overdueDebtKopecks: evalResult.overdueDebtKopecks,
			status: evalResult.status,
			nextPaymentDueItem: evalResult.nextPaymentDueItem,
			daysUntilNextPayment: evalResult.daysUntilNextPayment,
			createdAtIso: new Date().toISOString(),
			notes: presetCfg.notes,
		};

		setPlan(newPlan);
		onPlanUpdate?.(newPlan);
		setActiveSubView("schedule");
		showToast(`Договор рассрочки ${newPlan.contractNumber} успешно оформлен!`, "success");
	};

	return (
		<div className="patient-installments-overlay" data-testid="patient-installments-overlay">
			<div className="patient-installments-modal" data-testid="patient-installments-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
				{/* 1. Header */}
				<div className="patient-installments-header">
					<div className="flex flex-col gap-0.5 min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="font-bold text-sm text-[var(--ink)] flex items-center gap-1.5" id="modal-title">
								<Wallet className="w-4 h-4 text-teal-600 shrink-0" />
								<span>Внутренняя рассрочка клиники (0%)</span>
							</span>
							<span className="text-xs text-[var(--muted)]">•</span>
							<span className="text-xs font-semibold text-[var(--muted)] truncate max-w-[200px]">
								{plan.contractNumber}
							</span>
							<span
								className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${statusBadgeConfig.className}`}
								data-testid="plan-status-badge"
							>
								<StatusIcon className="w-3 h-3 shrink-0" />
								<span>{statusBadgeConfig.label}</span>
							</span>
						</div>
						<div className="text-xs text-[var(--muted)] truncate">
							Пациент: <strong className="text-[var(--ink)]">{patientName}</strong> • {plan.treatmentTitle}
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="w-8 h-8 rounded-lg border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors shrink-0"
						aria-label="Закрыть модальное окно рассрочки"
						data-testid="btn-close-installments-modal"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* 2. Last Receipt Toast Notice (if any) */}
				{lastReceipt && (
					<div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-100 animate-fadeIn">
						<div className="flex items-center gap-2">
							<Receipt className="w-4 h-4 text-emerald-600 shrink-0" />
							<span>
								Чек: <strong>{lastReceipt.receiptNumber}</strong> на сумму <strong>{lastReceipt.formattedAmount}</strong> ({lastReceipt.paymentMethodRu}, {lastReceipt.calculationTypeNameRu}).
							</span>
						</div>
						<button
							type="button"
							onClick={() => setLastReceipt(null)}
							className="text-emerald-700 hover:text-emerald-950 text-[11px] underline cursor-pointer"
						>
							Скрыть
						</button>
					</div>
				)}

				{/* 3. KPI Summary Bar */}
				<div className="patient-installments-grid-kpi" data-testid="installments-kpi-bar">
					<div className="patient-installments-kpi-card">
						<span className="patient-installments-kpi-label">Сумма договора</span>
						<span className="patient-installments-kpi-value text-teal-700 dark:text-teal-400">
							{formatKopecksRu(plan.totalAmountKopecks)}
						</span>
					</div>

					<div className="patient-installments-kpi-card">
						<span className="patient-installments-kpi-label">1-й взнос</span>
						<span className="patient-installments-kpi-value">
							{formatKopecksRu(plan.downPaymentKopecks)}
						</span>
					</div>

					<div className="patient-installments-kpi-card">
						<span className="patient-installments-kpi-label">Оплачено всего</span>
						<span className="patient-installments-kpi-value text-emerald-600 dark:text-emerald-400">
							{formatKopecksRu(plan.paidAmountKopecks)}
						</span>
					</div>

					<div className="patient-installments-kpi-card">
						<span className="patient-installments-kpi-label">Остаток долга</span>
						<span className="patient-installments-kpi-value text-amber-600 dark:text-amber-400">
							{formatKopecksRu(plan.remainingDebtKopecks)}
						</span>
					</div>

					<div className="patient-installments-kpi-card">
						<span className="patient-installments-kpi-label">Ежемесячный платеж</span>
						<span className="patient-installments-kpi-value">
							{formatKopecksRu(plan.monthlyPaymentKopecks)}
						</span>
					</div>
				</div>

				{/* 4. Single-Surface Sub-View Selector (Modal Depth = 1) */}
				{activeSubView === "quick_pay" && (
					<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]" data-testid="section-quick-pay">
						<div className="flex items-center justify-between mb-3">
							<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
								<CreditCard className="w-3.5 h-3.5 text-teal-600" />
								<span>Внести взнос по рассрочке</span>
							</span>
							<button
								type="button"
								onClick={() => setActiveSubView("schedule")}
								className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								Отмена
							</button>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<div>
								<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
									Целевой взнос
								</label>
								<select
									value={selectedPaymentItemId || ""}
									onChange={(e) => setSelectedPaymentItemId(e.target.value)}
									className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none focus:border-teal-500"
								>
									{plan.schedule.map((item) => (
										<option key={item.id} value={item.id} disabled={item.paidKopecks >= item.amountKopecks}>
											{item.title} — {formatKopecksRu(item.amountKopecks)} {item.paidKopecks >= item.amountKopecks ? "(Оплачен)" : ""}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
									Сумма к оплате (₽)
								</label>
								<input
									type="number"
									value={customPayAmountRub}
									onChange={(e) => setCustomPayAmountRub(e.target.value)}
									className="w-full h-8 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none focus:border-teal-500"
								/>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
									Способ оплаты
								</label>
								<div className="flex gap-1">
									<button
										type="button"
										onClick={() => setSelectedPaymentMethod("card")}
										className={`flex-1 h-8 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
											selectedPaymentMethod === "card"
												? "bg-teal-600 text-white border-teal-600"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
										}`}
									>
										Карта
									</button>
									<button
										type="button"
										onClick={() => setSelectedPaymentMethod("cash")}
										className={`flex-1 h-8 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
											selectedPaymentMethod === "cash"
												? "bg-teal-600 text-white border-teal-600"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
										}`}
									>
										Нал
									</button>
									<button
										type="button"
										onClick={() => setSelectedPaymentMethod("sbp")}
										className={`flex-1 h-8 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
											selectedPaymentMethod === "sbp"
												? "bg-teal-600 text-white border-teal-600"
												: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)]"
										}`}
									>
										СБП 0%
									</button>
								</div>
							</div>
						</div>

						<div className="mt-3 flex justify-end gap-2">
							<button
								type="button"
								onClick={handleExecutePayment}
								className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
								data-testid="btn-confirm-installment-payment"
							>
								<Check className="w-3.5 h-3.5" />
								<span>Пробить чек и закрыть взнос</span>
							</button>
						</div>
					</div>
				)}

				{activeSubView === "reminder" && (
					<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]" data-testid="section-reminder-preview">
						<div className="flex items-center justify-between mb-2">
							<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
								<MessageSquare className="w-3.5 h-3.5 text-teal-600" />
								<span>Автоматическое напоминание пациенту</span>
							</span>
							<button
								type="button"
								onClick={() => setActiveSubView("schedule")}
								className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								Скрыть
							</button>
						</div>

						<div className="p-3 bg-[var(--paper)] rounded-xl border border-[var(--line)] font-mono text-xs text-[var(--ink)] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto mb-3">
							{reminderData.messageText}
						</div>

						<div className="flex items-center justify-between flex-wrap gap-2">
							<span className="text-[11px] text-[var(--muted)]">
								Срок платежа: <strong>{reminderData.dueDateRu}</strong> • К оплате: <strong>{reminderData.amountFormatted}</strong>
							</span>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleCopyReminder}
									className="h-7 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
									data-testid="btn-copy-reminder"
								>
									<Copy className="w-3.5 h-3.5" />
									<span>Скопировать</span>
								</button>
								<a
									href={reminderData.whatsappUrl}
									target="_blank"
									rel="noreferrer"
									className="h-7 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer no-underline"
									data-testid="btn-open-whatsapp"
								>
									<Send className="w-3.5 h-3.5" />
									<span>Отправить в WhatsApp</span>
								</a>
							</div>
						</div>
					</div>
				)}

				{activeSubView === "create_preset" && (
					<div className="p-4 bg-[var(--paper-soft)] border-b border-[var(--line)]" data-testid="section-create-preset">
						<div className="flex items-center justify-between mb-3">
							<span className="font-bold text-xs uppercase tracking-wider text-[var(--ink)] flex items-center gap-1.5">
								<Plus className="w-3.5 h-3.5 text-teal-600" />
								<span>Оформление нового договора рассрочки (0%)</span>
							</span>
							<button
								type="button"
								onClick={() => setActiveSubView("schedule")}
								className="text-xs text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
							>
								Отмена
							</button>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3">
							<div>
								<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
									Тип лечения
								</label>
								<select
									value={selectedPreset}
									onChange={(e) => {
										const p = e.target.value as TreatmentPresetType;
										setSelectedPreset(p);
										const cfg = TREATMENT_INSTALLMENT_PRESETS[p];
										setNewTotalRubles(cfg.totalRubles);
										setNewDownPaymentPercent(cfg.downPaymentPercent);
										setNewMonthsCount(cfg.months);
									}}
									className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
								>
									<option value="aligners">Элайнеры Spark (360 000 ₽)</option>
									<option value="all_on_4">All-on-4 Straumann (450 000 ₽)</option>
									<option value="braces">Брекеты Damon Q (240 000 ₽)</option>
									<option value="total_rehab">Тотальный цирконий (600 000 ₽)</option>
								</select>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
									Сумма договора (₽)
								</label>
								<input
									type="number"
									value={newTotalRubles}
									onChange={(e) => setNewTotalRubles(Number(e.target.value))}
									className="w-full h-8 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
								/>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
									1-й взнос (%)
								</label>
								<select
									value={newDownPaymentPercent}
									onChange={(e) => setNewDownPaymentPercent(Number(e.target.value))}
									className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
								>
									<option value={20}>20%</option>
									<option value={30}>30% (Стандарт)</option>
									<option value={40}>40%</option>
									<option value={50}>50% (Половина)</option>
								</select>
							</div>

							<div>
								<label className="text-[11px] font-semibold text-[var(--muted)] block mb-1">
									Срок рассрочки (мес)
								</label>
								<select
									value={newMonthsCount}
									onChange={(e) => setNewMonthsCount(Number(e.target.value))}
									className="w-full h-8 text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2 outline-none"
								>
									<option value={3}>3 месяца</option>
									<option value={6}>6 месяцев</option>
									<option value={10}>10 месяцев</option>
									<option value={12}>12 месяцев (1 год)</option>
									<option value={18}>18 месяцев</option>
									<option value={24}>24 месяца (2 года)</option>
								</select>
							</div>
						</div>

						<div className="flex items-center justify-between pt-2">
							<span className="text-xs text-[var(--muted)]">
								Ежемесячный платеж составит:{" "}
								<strong className="text-[var(--ink)] font-mono">
									{Math.round(((newTotalRubles * (100 - newDownPaymentPercent)) / 100) / newMonthsCount).toLocaleString("ru-RU")} ₽/мес
								</strong>
							</span>
							<button
								type="button"
								onClick={handleCreateNewPlan}
								className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
								data-testid="btn-confirm-create-plan"
							>
								<Check className="w-3.5 h-3.5" />
								<span>Сформировать график платежей</span>
							</button>
						</div>
					</div>
				)}

				{/* 5. Installment Schedule Table */}
				<div className="patient-installments-table-container">
					<table className="patient-installments-table" data-testid="table-installments-schedule">
						<thead>
							<tr>
								<th style={{ width: "220px" }}>Назначение платежа</th>
								<th style={{ width: "110px" }}>Срок оплаты</th>
								<th style={{ textAlign: "right", width: "110px" }}>Сумма</th>
								<th style={{ textAlign: "right", width: "110px" }}>Оплачено</th>
								<th style={{ width: "120px", textAlign: "center" }}>Статус</th>
								<th>Чек / Оплата</th>
								<th style={{ textAlign: "right", width: "110px" }}>Действие</th>
							</tr>
						</thead>
						<tbody>
							{plan.schedule.map((item) => {
								const isPaid = item.paidKopecks >= item.amountKopecks;
								const badgeCls = isPaid
									? "patient-installments-badge-completed"
									: item.status === "overdue"
										? "patient-installments-badge-overdue"
										: item.status === "due"
											? "patient-installments-badge-due"
											: "patient-installments-badge-on-schedule";

								const labelRu = isPaid
									? "Оплачен"
									: item.status === "overdue"
										? "Просрочен"
										: item.status === "due"
											? "Ожидает оплаты"
											: "По графику";

								return (
									<tr key={item.id} data-testid={`schedule-row-${item.paymentNumber}`}>
										<td>
											<div className="font-semibold text-[var(--ink)]">
												{item.title}
											</div>
											{item.paymentNumber === 0 && (
												<div className="text-[10px] text-[var(--muted)]">
													Обязательный взнос в день оформления
												</div>
											)}
										</td>
										<td className="font-mono text-[11px] text-[var(--muted)]">
											{new Date(item.dueDateIso).toLocaleDateString("ru-RU")}
										</td>
										<td className="font-mono font-bold text-right text-[var(--ink)]">
											{formatKopecksRu(item.amountKopecks)}
										</td>
										<td className="font-mono font-bold text-right text-emerald-600 dark:text-emerald-400">
											{formatKopecksRu(item.paidKopecks)}
										</td>
										<td style={{ textAlign: "center" }}>
											<span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeCls}`}>
												{labelRu}
											</span>
										</td>
										<td className="text-xs">
											{item.fiscalReceiptNumber ? (
												<div className="flex items-center gap-1 font-mono text-[11px] text-teal-700 dark:text-teal-400">
													<Receipt className="w-3 h-3 shrink-0" />
													<span>{item.fiscalReceiptNumber}</span>
													{item.paidAtIso && (
														<span className="text-[10px] text-[var(--muted)]">
															({new Date(item.paidAtIso).toLocaleDateString("ru-RU")})
														</span>
													)}
												</div>
											) : (
												<span className="text-[11px] text-[var(--muted)]">—</span>
											)}
										</td>
										<td style={{ textAlign: "right" }}>
											{!isPaid ? (
												<button
													type="button"
													onClick={() => handleInitiateQuickPay(item.id)}
													className="h-7 px-2.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
													data-testid={`btn-pay-item-${item.paymentNumber}`}
													title="Принять взнос и пробить чек"
												>
													<Check className="w-3 h-3" />
													<span>Оплатить</span>
												</button>
											) : (
												<span className="text-[11px] text-emerald-600 font-bold inline-flex items-center gap-1">
													<CheckCircle2 className="w-3.5 h-3.5" />
													<span>Закрыт</span>
												</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* 6. Action Bar */}
				<div className="patient-installments-action-bar">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setActiveSubView(activeSubView === "create_preset" ? "schedule" : "create_preset")}
							className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[var(--ink)]"
							data-testid="btn-open-create-preset"
						>
							<Plus className="w-3.5 h-3.5 text-teal-600" />
							<span>Новый договор</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveSubView(activeSubView === "reminder" ? "schedule" : "reminder")}
							className="h-8 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-[var(--ink)]"
							data-testid="btn-open-reminder"
						>
							<MessageSquare className="w-3.5 h-3.5 text-teal-600" />
							<span>Напомнить пациенту</span>
						</button>

						{onOpenBankInstallment && (
							<button
								type="button"
								onClick={onOpenBankInstallment}
								className="h-8 px-3 rounded-lg border border-purple-500/40 bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
								data-testid="btn-open-bank-installment"
								title="Оформить банковскую рассрочку (Сбер / Т-Банк)"
							>
								<QrCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
								<span>Банковская рассрочка (QR)</span>
							</button>
						)}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => handleInitiateQuickPay()}
							disabled={plan.status === "completed"}
							className="h-8 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
							data-testid="btn-quick-pay-next"
						>
							<CreditCard className="w-3.5 h-3.5" />
							<span>Принять очередной взнос</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
