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
						overrideActive ? "dente-btn-secondary text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)]/50 bg-[var(--teal,#0d9488)]/10 shadow-xs" : "dente-btn-secondary"
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
						className="min-h-[44px] sm:min-h-[34px] flex-1 px-2.5 text-xs rounded-lg border border-[var(--primary,#0d9488)]/40 bg-[var(--paper-subtle)] text-[var(--ink)] focus:outline-none"
					/>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				<button
					type="button"
					onClick={onToggleWarrantyRework}
					className={`min-h-[44px] sm:min-h-[34px] px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer border focus:outline-none ${
						isWarrantyRework ? "bg-[var(--danger-soft,rgba(239,68,68,0.1))] border-[var(--danger,#ef4444)] text-[var(--danger,#ef4444)] ring-1 ring-[var(--danger,#ef4444)] shadow-2xs" : "secondary-button"
					}`}
					data-testid="chairside-warranty-rework-toggle"
					title="Повторное изготовление по гарантии: пациент 0 ₽"
				>
					<RotateCcw size={14} className={isWarrantyRework ? "text-[var(--danger,#ef4444)]" : "text-[var(--muted)]"} />
					<span>{isWarrantyRework ? "Гарантия: 0 ₽ с пациента" : "Гарантийная замена (0 ₽)"}</span>
				</button>
				{isWarrantyRework && (
					<div className="flex items-center rounded-lg border border-[var(--danger,#ef4444)]/30 overflow-hidden text-xs">
						<button type="button" onClick={() => onSelectWarrantyLiability("clinic_warranty")} className={`min-h-[44px] sm:min-h-[34px] px-2 font-bold cursor-pointer transition-colors focus:outline-none ${warrantyLiabilityType === "clinic_warranty" ? "dente-btn-secondary border-[var(--danger,#ef4444)]/50 bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)]" : "dente-btn-secondary"}`} data-testid="chairside-liability-clinic">
							Гарантия клиники
						</button>
						<button type="button" onClick={() => onSelectWarrantyLiability("lab_defect")} className={`min-h-[44px] sm:min-h-[34px] px-2 font-bold cursor-pointer transition-colors border-l border-[var(--danger,#ef4444)]/30 focus:outline-none ${warrantyLiabilityType === "lab_defect" ? "dente-btn-secondary border-[var(--danger,#ef4444)]/50 bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)]" : "dente-btn-secondary"}`} data-testid="chairside-liability-lab">
							Брак ЗТЛ (0 ₽)
						</button>
					</div>
				)}
			</div>

			<div className="flex items-center gap-1.5 flex-wrap">
				{labOrderSentNumber && (
					<span className="text-[11px] font-mono text-[var(--success,#10b981)] font-bold px-2 py-0.5 rounded bg-[var(--success-soft,rgba(16,185,129,0.1))] border border-[var(--success,#10b981)]/30 inline-flex items-center gap-1">
						<CheckCircle2 size={12} className="shrink-0" />
						<span>Отправлен {labOrderSentNumber}</span>
					</span>
				)}
				{onOpenPassportA4 && (
					<button
						type="button"
						onClick={onOpenPassportA4}
						className="secondary-button min-h-[44px] sm:min-h-[34px] px-3 text-xs font-bold flex items-center gap-1.5 focus:outline-none"
						data-testid="open-orthopedic-passport-btn"
						title="Сформировать Паспорт ортопедической конструкции и Гарантийный талон (А4)"
					>
						<FileText size={14} className="text-[var(--primary,#0d9488)] shrink-0" />
						<span>Паспорт (А4)</span>
					</button>
				)}
				<button
					type="button"
					onClick={onImmediateSendToLab}
					className="primary-button min-h-[44px] sm:min-h-[34px] px-4 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-dark,#0f766e)] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer focus:outline-none"
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
						className="secondary-button min-h-[44px] sm:min-h-[34px] px-3 text-xs font-bold text-[var(--primary,#0d9488)] flex items-center gap-1.5 focus:outline-none"
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
