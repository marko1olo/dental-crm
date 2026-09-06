/**
 * apps/web/src/components/treatment-plans/TreatmentPlanModal.tsx
 *
 * DENTE Dental CRM — Treatment Plan & Doctor Autonomy Modal.
 * Governed by:
 * - Mandate 8e, Item 7: Doctor discount freedom up to 100% on warranty reworks and staff without admin PIN.
 * - Mandate 8e, Item 7: Expiration of 30 days NEVER blocks ZTL work order creation or 54-FZ payment acceptance.
 * - Mandates 8e, 8n, 8k: Frictionless reception, scale sovereignty (solo-doctor to small clinic), anti-matryoshka (depth = 1).
 * - HIG & 7 Deadly Sins: Single-row toolbar (32-36px), touch targets >= 44x44px, zero raw emojis (strict Lucide).
 */

import React, { useState, useMemo } from "react";
import {
	X,
	ShieldCheck,
	Clock,
	CheckCircle2,
	Printer,
	FileText,
	CreditCard,
	Percent,
	Sparkles,
	Coins,
	FileCheck,
	AlertCircle,
	Check,
} from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { showToast } from "../GlobalToast.js";

export interface TreatmentPlanModalProps {
	readonly isOpen: boolean;
	readonly planId?: string | undefined;
	readonly planNumber?: string | undefined;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialTotalRub?: number | undefined;
	readonly createdAtIso?: string | undefined;
	readonly onClose: () => void;
	readonly onProceedToPayment?: ((data: { planId: string; amountRub: number; discountPercent: number }) => void) | undefined;
	readonly onOpenWorkOrder?: ((data: { planId: string; planNumber: string }) => void) | undefined;
}

export const TreatmentPlanModal: React.FC<TreatmentPlanModalProps> = ({
	isOpen,
	planId = "plan-001",
	planNumber = "ПЛ-2026/041",
	patientId,
	patientName,
	doctorId = "doc-001",
	doctorName = "Д-р Ковалев С. П.",
	initialTotalRub = 45000,
	createdAtIso = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(), // Demo: 35 days ago to prove non-blocking
	onClose,
	onProceedToPayment,
	onOpenWorkOrder,
}) => {
	const [discountPercent, setDiscountPercent] = useState<number>(0);

	// Plan age calculation (in days)
	const planAgeDays = useMemo(() => {
		const created = new Date(createdAtIso).getTime();
		const now = Date.now();
		if (Number.isNaN(created)) return 0;
		return Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
	}, [createdAtIso]);

	// Mandate 8e, Item 7: 30 days expiration never blocks creation of ZTL work orders or payment tender
	const isPlanExpired = planAgeDays > 30;

	// Kopeck-exact financial calculations
	const grossKop = rubToKopecks(initialTotalRub);
	const discountKop = Math.round((grossKop * Math.min(100, Math.max(0, discountPercent))) / 100);
	const netKop = Math.max(0, grossKop - discountKop);

	const grossRub = kopecksToRub(grossKop);
	const discountRub = kopecksToRub(discountKop);
	const netRub = kopecksToRub(netKop);
	const isZeroDue = netKop === 0;

	if (!isOpen) return null;

	const handleProceedToPayment = () => {
		if (onProceedToPayment) {
			onProceedToPayment({
				planId,
				amountRub: netRub,
				discountPercent,
			});
		} else {
			showToast(`Переход к кассе 54-ФЗ: сумма к оплате ${netRub.toLocaleString("ru-RU")} ₽`, "info");
		}
		onClose();
	};

	const handleCreateWorkOrder = () => {
		if (onOpenWorkOrder) {
			onOpenWorkOrder({
				planId,
				planNumber,
			});
		} else {
			showToast(`Зуботехнический наряд (ЗТЛ) по плану ${planNumber} успешно сформирован`, "success");
		}
	};

	const handlePrintEstimate = () => {
		window.print();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="treatment-plan-modal-title"
		>
			<div className="w-full max-w-2xl rounded-2xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
				{/* Modal Header — Single-row toolbar */}
				<div className="p-4 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)]">
					<div>
						<h2
							id="treatment-plan-modal-title"
							className="text-base sm:text-lg font-bold m-0 flex items-center gap-2"
						>
							<ShieldCheck size={18} className="text-teal-600 dark:text-teal-400" />
							<span>План лечения: {planNumber}</span>
							<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 inline-flex items-center gap-1">
								<CheckCircle2 size={12} />
								<span>804н / СтАР</span>
							</span>
						</h2>
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong> • Врач:{" "}
							<span className="text-[var(--ink,#0f172a)]">{doctorName}</span>
						</p>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-9 sm:w-9 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-4 overflow-y-auto flex-1 space-y-4">
					{/* 30-Day Validity & Non-blocking Guarantee Banner (Mandate 8e, Item 7) */}
					{isPlanExpired ? (
						<div
							className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-700 text-xs text-teal-900 dark:text-teal-200 flex items-start gap-2.5"
							data-testid="banner-plan-expired-nonblocking"
						>
							<Clock size={18} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
							<div>
								<div className="font-bold flex items-center gap-1.5 flex-wrap">
									<span>Смета составлена {planAgeDays} дней назад</span>
									<span className="px-1.5 py-0.2 rounded-md bg-teal-200/60 dark:bg-teal-800/60 text-[10px] font-mono font-bold uppercase">
										Актуальна / Продлена
									</span>
								</div>
								<p className="m-0 mt-1 text-teal-800 dark:text-teal-300 leading-normal">
									Истечение 30 дней не блокирует создание зуботехнических нарядов (ЗТЛ), оказание услуг или приём
									оплаты в кассу (Мандаты 8e, 8n). Цены зафиксированы по согласованию с лечащим врачом.
								</p>
							</div>
						</div>
					) : (
						<div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
							<Clock size={16} className="text-emerald-600 shrink-0" />
							<span>Смета активна: составлена {planAgeDays} дн. назад (гарантия цен в пределах 30 дней).</span>
						</div>
					)}

					{/* Metrics Grid */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
							<span className="text-[11px] text-[var(--muted,#64748b)] block font-semibold">Базовая сумма плана</span>
							<span className="text-base font-extrabold font-mono text-[var(--ink,#0f172a)]">
								{grossRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
						<div className="p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
							<span className="text-[11px] text-[var(--muted,#64748b)] block font-semibold">Скидка врача</span>
							<span className={`text-base font-extrabold font-mono ${discountRub > 0 ? "text-emerald-600" : "text-[var(--ink,#0f172a)]"}`}>
								{discountPercent > 0 ? `-${discountRub.toLocaleString("ru-RU")} ₽ (${discountPercent}%)` : "0 ₽"}
							</span>
						</div>
						<div className="p-3 rounded-xl border border-teal-500/30 bg-teal-50/30 dark:bg-teal-950/20">
							<span className="text-[11px] text-teal-700 dark:text-teal-400 block font-bold">Итого к оплате</span>
							<span className="text-lg font-black font-mono text-teal-700 dark:text-teal-300">
								{netRub.toLocaleString("ru-RU")} ₽
							</span>
						</div>
					</div>

					{/* Doctor Discount Autonomy Bar (Mandate 8e, Item 7: Freedom up to 100% on warranty reworks and staff) */}
					<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
						<div className="flex items-center justify-between flex-wrap gap-1">
							<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink,#0f172a)]">
								<Percent size={14} className="text-teal-600" />
								<span>Скидка лечащего врача (Мандат 8e: свобода до 100%):</span>
							</div>
							{discountPercent === 100 && (
								<span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
									<Sparkles size={12} />
									<span>Гарантийная переделка / Персонал клиники</span>
								</span>
							)}
						</div>

						<div className="flex items-center gap-1.5 flex-wrap">
							{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
								<button
									key={pct}
									type="button"
									onClick={() => setDiscountPercent(pct)}
									className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
										discountPercent === pct
											? pct === 100
												? "bg-emerald-600 text-white shadow-2xs"
												: "bg-teal-600 text-white shadow-2xs"
											: pct === 100
												? "bg-[var(--paper,#ffffff)] border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
												: "bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] hover:border-teal-400"
									}`}
									data-testid={`btn-doctor-discount-${pct}`}
								>
									{discountPercent === pct && <Check size={12} />}
									<span>{pct === 100 ? "100% (Гарантия)" : `${pct}%`}</span>
								</button>
							))}
						</div>
					</div>

					{/* 100% Warranty Zero Checkout Banner */}
					{isZeroDue && (
						<div
							className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-center justify-between gap-3 flex-wrap"
							data-testid="banner-plan-zero-warranty"
						>
							<div className="flex items-center gap-2">
								<CheckCircle2 size={18} className="text-emerald-600" />
								<span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
									Гарантийная переделка • К оплате: 0 ₽ (закрывается в 1 клик без паролей админа)
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									showToast("Гарантийный план закрыт в 1 клик (скидка 100%, 0 ₽)!", "success");
									onClose();
								}}
								className="min-h-[44px] sm:min-h-[36px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
								data-testid="btn-plan-close-warranty-zero"
							>
								<Sparkles size={14} />
								<span>Закрыть по гарантии (0 ₽)</span>
							</button>
						</div>
					)}
				</div>

				{/* Modal Footer — Actions (Anti-Matryoshka, Touch-First) */}
				<div className="p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-2 flex-wrap">
					<button
						type="button"
						onClick={handlePrintEstimate}
						className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-bold text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer transition-all"
					>
						<Printer size={15} />
						<span>Печать сметы (043/у)</span>
					</button>

					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={handleCreateWorkOrder}
							className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
							data-testid="btn-plan-create-ztl-workorder"
						>
							<FileText size={15} />
							<span>Оформить наряд ЗТЛ</span>
						</button>

						<button
							type="button"
							onClick={handleProceedToPayment}
							className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
							data-testid="btn-plan-proceed-payment"
						>
							<CreditCard size={15} />
							<span>Перейти к кассе 54-ФЗ ({netRub.toLocaleString("ru-RU")} ₽)</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanModal;
