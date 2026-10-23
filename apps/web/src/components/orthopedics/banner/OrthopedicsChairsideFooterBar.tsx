import React from "react";
import { CheckCircle2, ShieldCheck, RotateCcw, Send, ExternalLink, FileText } from "lucide-react";
import type { OrthopedicsChairsideFooterBarProps } from "./orthopedicsBannerTypes.js";

export function OrthopedicsChairsideFooterBar({
	overrideActive,
	overrideReason,
	onToggleOverride,
	onChangeOverrideReason,
	isWarrantyRework,
	onToggleWarrantyRework,
	warrantyLiabilityType,
	onSelectWarrantyLiability,
	labOrderSentNumber,
	isLabOrderSending,
	onImmediateSendToLab,
	onOpenLabOrder,
	onOpenPassportA4,
}: OrthopedicsChairsideFooterBarProps) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--line)]">
			<div className="flex items-center gap-2 flex-wrap flex-1 min-w-[260px]">
				<button
					type="button"
					onClick={onToggleOverride}
					className={`min-h-[44px] sm:min-h-[34px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
						overrideActive ? "bg-emerald-700 text-white shadow-xs" : "secondary-button"
					}`}
					data-testid="doctor-clinical-override-toggle"
					title="Клинический оверрайд врача при авансе < 50% без задержек и согласований"
				>
					<ShieldCheck size={15} />
					<span>{overrideActive ? "Оверрайд врача: АКТИВЕН" : "Клинический оверрайд (Аванс < 50%)"}</span>
				</button>
				{overrideActive && (
					<input
						type="text"
						value={overrideReason}
						onChange={(e) => onChangeOverrideReason(e.target.value)}
						placeholder="Причина оверрайда"
						aria-label="Причина клинического оверрайда"
						className="min-h-[44px] sm:min-h-[34px] flex-1 px-2.5 text-xs rounded-lg border border-emerald-500/40 bg-[var(--paper-subtle)] text-[var(--ink)] focus:outline-hidden"
					/>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={onToggleWarrantyRework}
					className={`min-h-[44px] sm:min-h-[34px] px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border ${
						isWarrantyRework ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-700 dark:text-rose-300 ring-1 ring-rose-400 shadow-2xs" : "secondary-button"
					}`}
					data-testid="chairside-warranty-rework-toggle"
					title="Повторное изготовление по гарантии: пациент 0 ₽"
				>
					<RotateCcw size={14} className={isWarrantyRework ? "text-rose-600 dark:text-rose-400" : "text-[var(--muted)]"} />
					<span>{isWarrantyRework ? "Гарантия: 0 ₽ с пациента" : "Гарантийная замена (0 ₽)"}</span>
				</button>
				{isWarrantyRework && (
					<div className="flex items-center rounded-lg border border-rose-300 dark:border-rose-800 overflow-hidden text-xs">
						<button type="button" onClick={() => onSelectWarrantyLiability("clinic_warranty")} className={`min-h-[44px] sm:min-h-[34px] px-2 font-bold cursor-pointer transition-colors ${warrantyLiabilityType === "clinic_warranty" ? "bg-rose-600 text-white" : "bg-[var(--paper)] text-[var(--ink)]"}`} data-testid="chairside-liability-clinic">
							Гарантия клиники
						</button>
						<button type="button" onClick={() => onSelectWarrantyLiability("lab_defect")} className={`min-h-[44px] sm:min-h-[34px] px-2 font-bold cursor-pointer transition-colors border-l border-rose-300 dark:border-rose-800 ${warrantyLiabilityType === "lab_defect" ? "bg-rose-600 text-white" : "bg-[var(--paper)] text-[var(--ink)]"}`} data-testid="chairside-liability-lab">
							Брак ЗТЛ (0 ₽)
						</button>
					</div>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{labOrderSentNumber && (
					<span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 inline-flex items-center gap-1">
						<CheckCircle2 size={12} className="shrink-0" />
						<span>Отправлен {labOrderSentNumber}</span>
					</span>
				)}
				{onOpenPassportA4 && (
					<button
						type="button"
						onClick={onOpenPassportA4}
						className="secondary-button min-h-[44px] sm:min-h-[34px] px-3 text-xs font-bold flex items-center gap-1.5"
						data-testid="open-orthopedic-passport-btn"
						title="Сформировать Паспорт ортопедической конструкции и Гарантийный талон (А4)"
					>
						<FileText size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Паспорт (А4)</span>
					</button>
				)}
				<button
					type="button"
					onClick={onImmediateSendToLab}
					className="min-h-[44px] sm:min-h-[34px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
					data-testid="direct-send-lab-order-btn"
					title="Отправить заказ-наряд в зуботехническую лабораторию"
				>
					<Send size={14} />
					<span>{isLabOrderSending ? "Отправка в ЗТЛ..." : "Отправить в лабораторию"}</span>
				</button>
				{onOpenLabOrder && (
					<button
						type="button"
						onClick={onOpenLabOrder}
						className="secondary-button min-h-[44px] sm:min-h-[34px] px-3 text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5"
						data-testid="open-lab-order-constructor-btn"
						title="Открыть конструктор заказ-нарядов"
					>
						<span>Наряд ЗТЛ</span>
						<ExternalLink size={14} />
					</button>
				)}
			</div>
		</div>
	);
}
