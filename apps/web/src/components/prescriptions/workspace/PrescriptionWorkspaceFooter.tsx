/**
 * PrescriptionWorkspaceFooter.tsx — Unified Actions Footer with Exactly ONE Primary CTA
 * DENTE Dental CRM (Doctor Autonomy Mandates 8e, 8n, 8x, 8y, 8am & Apple HIG).
 * Strictly 60–100 lines Sweet Spot (Mandate 8b). Primary CTA #0d9488 is NEVER disabled.
 */

import React from "react";
import { Printer, Copy, Check, ChevronRight } from "lucide-react";

export interface PrescriptionWorkspaceFooterProps {
	readonly isMemoCopied: boolean;
	readonly isInsertedToDiary: boolean;
	readonly onCopyPatientMemo: () => void;
	readonly onPrint: () => void;
	readonly onIssueAndInsert: () => void;
}

export const PrescriptionWorkspaceFooter: React.FC<PrescriptionWorkspaceFooterProps> = ({
	isMemoCopied,
	isInsertedToDiary,
	onCopyPatientMemo,
	onPrint,
	onIssueAndInsert,
}) => {
	return (
		<footer
			data-testid="prescription-all-actions-row"
			className="px-3 sm:px-5 py-3 bg-[var(--paper-strong)] border-t border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
		>
			{/* Secondary Actions: Patient Memo & Print Buttons */}
			<div className="grid grid-cols-3 sm:flex items-center gap-2">
				<button
					type="button"
					data-testid="med-rx-copy-patient-btn"
					title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
					onClick={onCopyPatientMemo}
					className="min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
				>
					{isMemoCopied ? (
						<>
							<Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
							<span className="text-emerald-600 truncate">Скопировано</span>
						</>
					) : (
						<>
							<Copy className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
							<span className="hidden sm:inline">Скопировать для пациента</span>
							<span className="sm:hidden text-[11px]">Копия</span>
						</>
					)}
				</button>
				<button
					type="button"
					data-testid="print-prescription-btn"
					onClick={onPrint}
					className="min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
				>
					<Printer className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
					<span className="hidden sm:inline">Печать рецепта (А5)</span>
					<span className="sm:hidden text-[11px]">Рецепт</span>
				</button>
				<button
					type="button"
					data-testid="print-patient-memo-btn"
					onClick={onPrint}
					className="min-h-[44px] px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] cursor-pointer"
				>
					<Printer className="w-3.5 h-3.5 text-[var(--muted)] shrink-0" />
					<span className="hidden sm:inline">Печать памятки</span>
					<span className="sm:hidden text-[11px]">Памятка</span>
				</button>
			</div>

			{/* Exactly ONE Primary CTA #0d9488 (Doctor Autonomy: Never Disabled) */}
			<div className="flex items-center sm:ml-auto w-full sm:w-auto">
				<button
					type="button"
					data-testid="insert-to-diary-btn"
					onClick={onIssueAndInsert}
					className="w-full sm:w-auto min-h-[48px] sm:min-h-[44px] px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] active:scale-[0.98] transition-all shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer border-0"
				>
					{isInsertedToDiary ? (
						<>
							<Check className="w-4 h-4 shrink-0" />
							<span>Рецепт внесен в карту приёма</span>
						</>
					) : (
						<>
							<Check className="w-4 h-4 shrink-0" />
							<span>Выписать рецепт и внести в карту приёма</span>
							<ChevronRight className="w-3.5 h-3.5 opacity-80 shrink-0" />
						</>
					)}
				</button>
			</div>
		</footer>
	);
};

PrescriptionWorkspaceFooter.displayName = "PrescriptionWorkspaceFooter";
