/**
 * @file StatusBlockCashboxShift.tsx
 * @description Cash shift status card and 1-click controls (Mandate 8b <= 120 lines, 8e, 8n).
 */

import React from "react";
import { Clock, CreditCard, FileText, Play, ShieldCheck } from "lucide-react";
import { useAppStore } from "../../../store/appStore.js";
import { showToast } from "../../GlobalToast.js";
import type { StatusBlockCashboxShiftProps } from "./headerStatusTypes.js";

export function StatusBlockCashboxShift({
	status,
	onClose,
	onOpenShiftModal,
}: StatusBlockCashboxShiftProps) {
	const { isShiftOpen, shiftNumber, formattedShiftTime, handleToggleShift } = status;
	const setCurrentView = useAppStore((s) => s.setCurrentView);

	const handleOpenReport = () => {
		onClose();
		showToast("Сформирован промежуточный отчет (без гашения)", "info");
		setCurrentView("shift");
	};

	const handleShiftAction = () => {
		onClose();
		if (onOpenShiftModal) {
			onOpenShiftModal();
		} else {
			void handleToggleShift();
		}
	};

	return (
		<div className="dnt-cc-section">
			<div className="dnt-cc-section-header">
				<span className="dnt-cc-section-title">
					<Clock size={13} className="text-[var(--teal)]" />
					<span>Кассовая смена</span>
				</span>
				<span
					className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
						isShiftOpen
							? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60"
							: "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/60"
					}`}
				>
					{isShiftOpen ? `Открыта (${formattedShiftTime})` : "Смена закрыта"}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-2 text-xs mb-3">
				<div className="p-2 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))]">
					<span className="text-[10px] text-[var(--muted,#475569)] block">Смена №</span>
					<strong className="text-[var(--ink,#0f172a)] font-mono text-sm">
						№ {shiftNumber}
					</strong>
				</div>
				<div className="p-2 rounded-lg bg-[var(--paper-strong,var(--paper,#ffffff))]">
					<span className="text-[10px] text-[var(--muted,#475569)] block">Касса и чеки</span>
					<strong className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
						<ShieldCheck size={12} /> ККТ АТОЛ Онлайн
					</strong>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={handleOpenReport}
					className="dnt-cc-btn dnt-cc-btn--secondary flex-1 min-h-[44px]"
					title="Снять промежуточный отчет без закрытия смены"
				>
					<FileText size={14} />
					<span>Текущий отчет</span>
				</button>

				<button
					type="button"
					onClick={handleShiftAction}
					className={`dnt-cc-btn flex-1 min-h-[44px] ${isShiftOpen ? "dnt-cc-btn--secondary" : "dnt-cc-btn--primary"}`}
					title={isShiftOpen ? "Закрыть смену и сформировать отчет" : "Открыть новую кассовую смену"}
				>
					{isShiftOpen ? <CreditCard size={14} /> : <Play size={14} />}
					<span>{isShiftOpen ? "Закрыть смену" : "Открыть смену"}</span>
				</button>
			</div>
		</div>
	);
}
