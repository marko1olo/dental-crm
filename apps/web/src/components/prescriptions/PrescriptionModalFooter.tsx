/**
 * PrescriptionModalFooter.tsx — Action Footer for Prescription Cockpit
 * Apple HIG Natural Thumb Zone (min-h >= 44px on touch, 36px desktop).
 * UI_STANDARDS.md: Primary CTA strictly 1 per block, rounded-xl (10-12px).
 */

import React from "react";
import { Check, Copy, Printer, ShieldCheck } from "lucide-react";

export interface PrescriptionModalFooterProps {
	readonly isMemoCopied: boolean;
	readonly isUkepSigned: boolean;
	readonly isSigningUkep: boolean;
	readonly onCopyPatientMemo: () => void;
	readonly onInsertToDiary: () => void;
	readonly onSignUkep: () => void;
	readonly onPrintPatientMemo: () => void;
	readonly onPrintPrescription: () => void;
}

export const PrescriptionModalFooter: React.FC<PrescriptionModalFooterProps> = ({
	isMemoCopied,
	isUkepSigned,
	isSigningUkep,
	onCopyPatientMemo,
	onInsertToDiary,
	onSignUkep,
	onPrintPatientMemo,
	onPrintPrescription,
}) => {
	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
			{/* Left Action Cluster: Communication & EHR sync */}
			<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
				<button
					type="button"
					data-testid="med-rx-copy-patient-btn"
					onClick={onCopyPatientMemo}
					title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
					className="secondary-button h-9 min-h-[44px] md:min-h-[36px] px-3.5 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial justify-center"
				>
					<Copy className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>{isMemoCopied ? "Скопировано!" : "Скопировать для пациента"}</span>
				</button>
				<button
					type="button"
					data-testid="insert-to-diary-btn"
					onClick={onInsertToDiary}
					title="Перенести назначения в дневник приёма (SOAP Plan)"
					className="secondary-button h-9 min-h-[44px] md:min-h-[36px] px-3.5 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer flex-1 sm:flex-initial justify-center hover:border-[var(--teal)]"
				>
					<Check className="w-4 h-4 text-emerald-600 shrink-0" />
					<span>Перенести в дневник визита</span>
				</button>
			</div>

			{/* Right Action Cluster: UKEP, Memo & Official Blank Print (Primary CTA) */}
			<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
				<button
					type="button"
					onClick={onSignUkep}
					className={`h-9 min-h-[44px] md:min-h-[36px] px-3 text-xs font-medium rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 justify-center ${
						isUkepSigned
							? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
							: "secondary-button text-[var(--ink)]"
					}`}
				>
					<ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
					<span>{isUkepSigned ? "УКЭП подписана" : isSigningUkep ? "Подписание..." : "Подписать УКЭП"}</span>
				</button>
				<button
					type="button"
					data-testid="print-patient-memo-btn"
					onClick={onPrintPatientMemo}
					title="Распечатать понятную памятку со схемой приёма для пациента (без латыни)"
					className="secondary-button h-9 min-h-[44px] md:min-h-[36px] px-3 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer justify-center"
				>
					<Printer className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>Печать памятки</span>
				</button>
				<button
					type="button"
					data-testid="print-prescription-btn"
					onClick={onPrintPrescription}
					className="primary-button h-9 min-h-[44px] md:min-h-[36px] px-4 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-sm cursor-pointer justify-center"
				>
					<Printer className="w-4 h-4 shrink-0" />
					<span>Печать рецепта А5</span>
				</button>
			</div>
		</div>
	);
};
