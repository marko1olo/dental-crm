import React from "react";
import { CheckCircle2, CreditCard, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import { type DentalLabFinancialGateResult, createDoctorClinicalOverride } from "./dentalLabFinancialGateEngine";

export interface DentalLabFinancialGateProps {
	readonly gateResult: DentalLabFinancialGateResult;
	readonly isOpen?: boolean; readonly onClose?: () => void;
	readonly patientName?: string; readonly stageTitle?: string;
	readonly doctorName?: string; readonly defaultDoctorName?: string; readonly defaultChiefDoctorName?: string;
	readonly variant?: "modal" | "inline" | "banner";
	readonly onConfirmOverride?: (override: { authorized: boolean; doctorName: string; timestampIso: string; reason: string }) => void;
	readonly onBlock?: () => void; readonly onOpenInstallmentModal?: () => void; readonly onAcceptAdvancePayment?: () => void;
}

/**
 * Контроль оплаты изделия ЗТЛ (Мандат 8e: врач сам решает, примерять ли коронку, кнопка никогда не блокируется).
 */
export const DentalLabFinancialGate: React.FC<DentalLabFinancialGateProps> = ({
	gateResult,
	isOpen = true,
	onClose,
	patientName = "Пациент",
	stageTitle = "Ортопедический этап",
	doctorName,
	defaultDoctorName,
	defaultChiefDoctorName,
	variant = "modal",
	onConfirmOverride,
	onOpenInstallmentModal,
}) => {
	if (!isOpen) return null;
	const doc = doctorName || defaultDoctorName || defaultChiefDoctorName || "Лечащий врач";
	const handleOverride = () => {
		onConfirmOverride?.(createDoctorClinicalOverride(doc, "Клиническое решение врача (Автономия)"));
		onClose?.();
	};

	if (variant === "banner") {
		if (gateResult.isGatePassed) {
			return (
				<div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs" data-testid="lab-gate-banner-cleared">
					<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<div className="flex-1 truncate"><span className="font-bold">Контроль оплаты изделия: </span>{gateResult.detailedReasonRu}</div>
				</div>
			);
		}
		return (
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs" data-testid="lab-gate-banner-blocked">
				<div className="flex items-start gap-2.5 min-w-0">
					<ShieldAlert size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
					<div>
						<div className="font-bold text-sm text-amber-800 dark:text-amber-300">Контроль оплаты изделия ({gateResult.paidPercent}% внесено)</div>
						<p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5">Врач сам решает отправлять ли наряд и примерять ли коронку (Автономия врача).</p>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{onConfirmOverride && (
						<button type="button" onClick={handleOverride} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5" data-testid="btn-lab-override-financial-gate">
							<ShieldCheck size={14} /><span>Согласовать примерку (Автономия)</span>
						</button>
					)}
					{onOpenInstallmentModal && (
						<button type="button" onClick={onOpenInstallmentModal} className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper)] transition cursor-pointer flex items-center gap-1" data-testid="lab-gate-installment-btn">
							<CreditCard size={13} /><span>Рассрочка</span>
						</button>
					)}
				</div>
			</div>
		);
	}

	if (variant === "inline") {
		return (
			<div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-sm space-y-3" data-testid="lab-gate-inline-card">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ShieldAlert size={18} className={gateResult.isGatePassed ? "text-emerald-600" : "text-amber-600"} />
						<h4 className="text-sm font-bold text-[var(--ink)]">Контроль оплаты изделия (Рекомендовано: 50%)</h4>
					</div>
					<span className="text-xs px-2.5 py-0.5 rounded-full font-bold border border-[var(--line)]">{gateResult.paidPercent}% внесено</span>
				</div>
				<p className="text-xs text-[var(--muted)]">{gateResult.detailedReasonRu}</p>
				{onConfirmOverride && (
					<button type="button" onClick={handleOverride} className="min-h-[44px] w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer" data-testid="btn-lab-override-financial-gate">
						<ShieldCheck size={15} /><span>Согласовать примерку без блокировок</span>
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="dental-lab-financial-gate-modal">
			<div className="relative w-full max-w-lg bg-[var(--paper)] border border-[var(--line)] rounded-2xl p-5 shadow-2xl space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="text-base font-bold text-[var(--ink)]">Контроль оплаты изделия</h3>
					<button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--ink)]"><X size={16} /></button>
				</div>
				<p className="text-xs text-[var(--muted)]">Пациент: <strong>{patientName}</strong> · Этап: <strong>{stageTitle}</strong></p>
				<p className="text-xs text-[var(--ink)]">{gateResult.detailedReasonRu}</p>
				<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
					<button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--line)]">Отмена</button>
					<button type="button" onClick={handleOverride} className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white" data-testid="btn-lab-override-financial-gate">
						Согласовать примерку (Автономия врача)
					</button>
				</div>
			</div>
		</div>
	);
};

export default DentalLabFinancialGate;
