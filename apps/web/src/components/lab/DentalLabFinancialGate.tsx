/**
 * DentalLabFinancialGate.tsx — UI-компонент финансового шлюза наряд-заказов в ЗТЛ.
 * 
 * Предотвращает кассовые разрывы клиники при заказе дорогостоящих ортопедических конструкций:
 * - Если оплачено < 50% этапа: выводит предупреждение и запрос авторизации Главного врача («Да / Блокировать»).
 * - Предлагает моментальный переход в 1-клик банковскую рассрочку (Сбер / Т-Банк / Подели).
 */

import React, { useState } from "react";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	CreditCard,
	DollarSign,
	Lock,
	QrCode,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	UserCheck,
	X,
	XCircle,
} from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import {
	type DentalLabFinancialGateResult,
	createChiefDoctorOverride,
} from "./dentalLabFinancialGateEngine";

export interface DentalLabFinancialGateProps {
	readonly gateResult: DentalLabFinancialGateResult;
	readonly isOpen?: boolean;
	readonly onClose?: () => void;
	readonly patientName?: string;
	readonly stageTitle?: string;
	readonly defaultChiefDoctorName?: string;
	readonly variant?: "modal" | "inline" | "banner";
	readonly onConfirmOverride?: (override: {
		readonly authorized: boolean;
		readonly doctorName: string;
		readonly timestampIso: string;
		readonly reason: string;
	}) => void;
	readonly onBlock?: () => void;
	readonly onOpenInstallmentModal?: () => void;
	readonly onAcceptAdvancePayment?: () => void;
}

export const DentalLabFinancialGate: React.FC<DentalLabFinancialGateProps> = ({
	gateResult,
	isOpen = true,
	onClose,
	patientName = "Пациент",
	stageTitle = "Ортопедический этап",
	defaultChiefDoctorName = "Д-р Смирнов А. В. (Главный врач)",
	variant = "modal",
	onConfirmOverride,
	onBlock,
	onOpenInstallmentModal,
	onAcceptAdvancePayment,
}) => {
	const [chiefDoctorInput, setChiefDoctorInput] = useState<string>(defaultChiefDoctorName);
	const [overrideReason, setOverrideReason] = useState<string>(
		"Согласовано с главным врачом клиники ввиду срочности клинического этапа",
	);
	const [showOverrideForm, setShowOverrideForm] = useState<boolean>(false);

	if (!isOpen) return null;

	const handleOverrideSubmit = () => {
		const override = createChiefDoctorOverride(chiefDoctorInput, overrideReason);
		if (onConfirmOverride) {
			onConfirmOverride(override);
		}
	};

	// ─── 1. BANNER VARIANT ───────────────────────────────────────────────────────
	if (variant === "banner") {
		if (gateResult.gateStatus === "CLEARED") {
			return (
				<div
					className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs"
					data-testid="lab-gate-banner-cleared"
				>
					<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<div className="flex-1 min-w-0">
						<span className="font-bold">Финансовый шлюз пройден ({gateResult.paidPercent}% внесено): </span>
						<span>{gateResult.detailedReasonRu}</span>
					</div>
				</div>
			);
		}

		if (gateResult.gateStatus === "CHIEF_DOCTOR_OVERRIDE") {
			return (
				<div
					className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs"
					data-testid="lab-gate-banner-override"
				>
					<ShieldCheck size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<div className="flex-1 min-w-0">
						<span className="font-bold">Одобрено Главным врачом: </span>
						<span>{gateResult.overrideMeta?.doctorName} · {gateResult.overrideMeta?.reason}</span>
					</div>
				</div>
			);
		}

		return (
			<div
				className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs"
				data-testid="lab-gate-banner-blocked"
			>
				<div className="flex items-start gap-2.5 min-w-0">
					<ShieldAlert size={18} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
					<div>
						<div className="font-bold text-sm text-rose-700 dark:text-rose-300">
							Внимание: этап не оплачен. Требуется аванс {formatKopecksRu(gateResult.missingAdvanceKopecks)}
						</div>
						<p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-0.5">
							Внесено только {gateResult.paidPercent}% из требуемых {gateResult.minAdvancePercent}%. Отправка наряда без аванса заблокирована.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{onOpenInstallmentModal && (
						<button
							type="button"
							onClick={onOpenInstallmentModal}
							className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30 hover:bg-[var(--teal-soft)] transition cursor-pointer flex items-center gap-1"
							data-testid="lab-gate-installment-btn"
						>
							<CreditCard size={13} />
							<span>Рассрочка (Сбер/Т-Банк)</span>
						</button>
					)}
				</div>
			</div>
		);
	}

	// ─── 2. INLINE CARD VARIANT ──────────────────────────────────────────────────
	if (variant === "inline") {
		return (
			<div
				className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] p-4 shadow-sm space-y-3"
				data-testid="lab-gate-inline-card"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ShieldAlert
							size={18}
							className={
								gateResult.isGatePassed
									? "text-emerald-600 dark:text-emerald-400"
									: "text-rose-600 dark:text-rose-400"
							}
						/>
						<h4 className="text-sm font-bold text-[var(--ink,#0f172a)]">
							Финансовый контроль ЗТЛ (Порог аванса: {gateResult.minAdvancePercent}%)
						</h4>
					</div>

					<span
						className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
							gateResult.isGatePassed
								? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
								: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
						}`}
					>
						{gateResult.gateStatus === "CLEARED" && "ОДОБРЕНО (>= 50%)"}
						{gateResult.gateStatus === "CHIEF_DOCTOR_OVERRIDE" && "ОВЕРРАЙД ГЛАВВРАЧА"}
						{gateResult.gateStatus === "BLOCKED_REQUIRES_ADVANCE" && "ТРЕБУЕТСЯ АВАНС"}
					</span>
				</div>

				<p className="text-xs text-[var(--muted,#64748b)]">
					{gateResult.detailedReasonRu}
				</p>

				{/* Progress Track */}
				<div className="space-y-1">
					<div className="flex items-center justify-between text-[11px]">
						<span className="text-[var(--muted,#64748b)]">
							Внесено: {formatKopecksRu(gateResult.totalPaidAndCoveredKopecks)} ({gateResult.paidPercent}%)
						</span>
						<span className="font-bold text-[var(--ink,#0f172a)]">
							Мин. аванс 50%: {formatKopecksRu(gateResult.requiredAdvanceKopecks)}
						</span>
					</div>
					<div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
						<div
							className={`h-full rounded-full transition-all ${
								gateResult.paidPercent >= 50 ? "bg-emerald-500" : "bg-rose-500"
							}`}
							style={{ width: `${Math.min(100, gateResult.paidPercent)}%` }}
						/>
					</div>
				</div>
			</div>
		);
	}

	// ─── 3. MODAL CONFIRMATION DIALOG ────────────────────────────────────────────
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto"
			role="dialog"
			aria-modal="true"
			aria-labelledby="lab-financial-gate-title"
			data-testid="lab-financial-gate-modal"
		>
			<div className="relative w-full max-w-lg bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border,#cbd5e1)] bg-rose-500/10">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/30">
							<ShieldAlert className="w-5 h-5" />
						</div>
						<div>
							<h3
								id="lab-financial-gate-title"
								className="text-base font-bold text-[var(--ink,#0f172a)] m-0"
							>
								Финансовый контроль ЗТЛ
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								{patientName} · {stageTitle}
							</p>
						</div>
					</div>

					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
							aria-label="Закрыть"
							data-testid="lab-gate-close-btn"
						>
							<X className="w-5 h-5" />
						</button>
					)}
				</div>

				{/* Modal Body */}
				<div className="p-6 space-y-5 text-xs text-[var(--ink,#0f172a)]">
					{/* Warning Card */}
					<div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2">
						<div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300 text-sm">
							<AlertTriangle size={17} className="text-rose-600" />
							<span>Внимание: этап не оплачен!</span>
						</div>
						<p className="text-rose-900/90 dark:text-rose-200 text-xs leading-relaxed">
							По регламенту клиники для отправки заказа в зуботехническую лабораторию требуется
							внесение аванса не менее <strong>{gateResult.minAdvancePercent}%</strong> (
							{formatKopecksRu(gateResult.requiredAdvanceKopecks)}).
						</p>
						<div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-500/20 flex items-center justify-between font-mono">
							<span className="text-[var(--muted,#64748b)]">Недостающий аванс:</span>
							<strong className="text-rose-600 dark:text-rose-400 text-sm">
								{formatKopecksRu(gateResult.missingAdvanceKopecks)}
							</strong>
						</div>
					</div>

					{/* Fast Payment Options */}
					<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-3">
						<span className="font-bold text-[var(--ink,#0f172a)] block">
							Быстрое закрытие аванса для пациента:
						</span>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{onOpenInstallmentModal && (
								<button
									type="button"
									onClick={() => {
										if (onClose) onClose();
										onOpenInstallmentModal();
									}}
									className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal,var(--brand-primary))]/30 transition cursor-pointer"
									data-testid="lab-gate-open-installment-btn"
								>
									<CreditCard size={15} />
									<span>Рассрочка (Сбер/Т-Банк)</span>
								</button>
							)}

							{onAcceptAdvancePayment && (
								<button
									type="button"
									onClick={() => {
										if (onClose) onClose();
										onAcceptAdvancePayment();
									}}
									className="min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-slate-100 dark:hover:bg-slate-800 border border-[var(--border,#cbd5e1)] transition cursor-pointer"
									data-testid="lab-gate-accept-payment-btn"
								>
									<DollarSign size={15} />
									<span>Принять аванс в кассу</span>
								</button>
							)}
						</div>
					</div>

					{/* Chief Doctor Override Section */}
					<div className="space-y-3 pt-1 border-t border-[var(--border,#cbd5e1)]">
						<div className="flex items-center justify-between">
							<span className="font-bold text-[var(--ink,#0f172a)]">
								Отправить наряд под ответственность главврача?
							</span>
							<button
								type="button"
								onClick={() => setShowOverrideForm((prev) => !prev)}
								className="text-xs text-[var(--teal,var(--brand-primary))] hover:underline font-semibold cursor-pointer"
							>
								{showOverrideForm ? "Скрыть форму" : "Разрешить отправку (Да)"}
							</button>
						</div>

						{showOverrideForm && (
							<div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
								<div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
									<UserCheck size={15} className="text-amber-600" />
									<span>Авторизация Главного врача</span>
								</div>

								<div className="space-y-2">
									<div>
										<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
											ФИО Главного врача:
										</label>
										<input
											type="text"
											value={chiefDoctorInput}
											onChange={(e) => setChiefDoctorInput(e.target.value)}
											className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] px-3 py-2 text-xs font-semibold text-[var(--ink,#0f172a)] focus:outline-none focus:border-[var(--teal,var(--brand-primary))]"
											placeholder="ФИО Главврача..."
										/>
									</div>

									<div>
										<label className="text-[11px] text-[var(--muted,#64748b)] block mb-1">
											Клиническое обоснование оверрайда:
										</label>
										<input
											type="text"
											value={overrideReason}
											onChange={(e) => setOverrideReason(e.target.value)}
											className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] px-3 py-2 text-xs text-[var(--ink,#0f172a)] focus:outline-none focus:border-[var(--teal,var(--brand-primary))]"
											placeholder="Причина отправки без аванса..."
										/>
									</div>
								</div>

								<button
									type="button"
									onClick={handleOverrideSubmit}
									className="min-h-[44px] w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition cursor-pointer"
									data-testid="lab-gate-confirm-override-btn"
								>
									<ShieldCheck size={15} />
									<span>Подтвердить отправку под мою ответственность (Да)</span>
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Modal Footer */}
				<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
					<button
						type="button"
						onClick={() => {
							if (onBlock) onBlock();
							if (onClose) onClose();
						}}
						className="min-h-[44px] flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
						data-testid="lab-gate-block-btn"
					>
						<XCircle size={15} />
						<span>Блокировать отправку</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default DentalLabFinancialGate;
