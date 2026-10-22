import React from "react";
import type { Patient } from "@dental/shared";
import { Printer } from "lucide-react";

interface MobileDocumentsHeaderProps {
	totalCount: number;
	activePatient?: Patient | null | undefined;
	onDirectPrintPrimaryIntake?: (() => void) | undefined;
	triggerTactile: () => void;
}

export function MobileDocumentsHeader({
	totalCount,
	activePatient,
	onDirectPrintPrimaryIntake,
	triggerTactile,
}: MobileDocumentsHeaderProps) {
	return (
		<div className="px-4 pt-1 flex items-center justify-between">
			<div className="min-w-0">
				<h2 className="text-[20px] font-bold text-[var(--ink)] tracking-tight flex items-center gap-2">
					<span>Документы</span>
					<span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[var(--paper-soft)] text-[var(--muted)] border border-[var(--line-subtle)]">
						{totalCount}
					</span>
				</h2>
				<div className="text-[12px] text-[var(--muted)] leading-tight break-words mt-0.5">
					{activePatient ? `Пациент: ${activePatient.fullName}` : "Все пациенты клиники"}
				</div>
			</div>

			{onDirectPrintPrimaryIntake && (
				<button
					type="button"
					onClick={() => {
						triggerTactile();
						onDirectPrintPrimaryIntake();
					}}
					className="mobile-quick-intake-btn active:scale-95 transition-all"
					data-testid="mobile-quick-print-intake-btn"
					aria-label="Печать пакета первичного приёма"
				>
					<Printer size={15} aria-hidden="true" />
					<span>Печать пакета</span>
				</button>
			)}
		</div>
	);
}
