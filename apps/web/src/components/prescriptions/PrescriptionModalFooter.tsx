/**
 * PrescriptionModalFooter.tsx — Action Footer for Prescription Cockpit
 * Apple HIG Natural Thumb Zone (min-h >= 44px on touch, 36px desktop).
 * UI_STANDARDS.md: Primary CTA strictly 1 per block, rounded-xl (10-12px).
 */

import { Check, Copy, Printer } from "lucide-react";
import type React from "react";

export interface PrescriptionModalFooterProps {
	readonly isMemoCopied: boolean;
	readonly onCopyPatientMemo: () => void;
	readonly onInsertToDiary: () => void;
	readonly onPrintPatientMemo: () => void;
	readonly onPrintPrescription: () => void;
}

export const PrescriptionModalFooter: React.FC<
	PrescriptionModalFooterProps
> = ({
	isMemoCopied,
	onCopyPatientMemo,
	onInsertToDiary,
	onPrintPatientMemo,
	onPrintPrescription,
}) => {
	return (
		<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-3 border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
			{/* Mobile layout: Secondary row (3 items) + Full-width Primary CTA in Thumb Zone */}
			<div className="flex sm:hidden flex-col gap-2 w-full">
				<div className="grid grid-cols-3 gap-1.5 w-full">
					<button
						type="button"
						data-testid="med-rx-copy-patient-btn"
						onClick={onCopyPatientMemo}
						title="Скопировать памятку для пациента в мессенджер"
						className="secondary-button btn btn--secondary h-9 px-2 text-xs font-medium rounded-xl inline-flex items-center gap-1 cursor-pointer justify-center"
					>
						<Copy className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="truncate">{isMemoCopied ? "Скопировано!" : "Копия"}</span>
					</button>
					<button
						type="button"
						data-testid="insert-to-diary-btn"
						onClick={onInsertToDiary}
						title="Перенести назначения в дневник приёма"
						className="secondary-button btn btn--secondary h-9 px-2 text-xs font-semibold rounded-xl inline-flex items-center gap-1 cursor-pointer justify-center"
					>
						<Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
						<span className="truncate">В дневник</span>
					</button>
					<button
						type="button"
						data-testid="print-patient-memo-btn"
						onClick={onPrintPatientMemo}
						title="Распечатать памятку пациенту"
						className="secondary-button btn btn--secondary h-9 px-2 text-xs font-medium rounded-xl inline-flex items-center gap-1 cursor-pointer justify-center"
					>
						<Printer className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
						<span className="truncate">Памятка</span>
					</button>
				</div>
				<button
					type="button"
					data-testid="print-prescription-btn"
					onClick={onPrintPrescription}
					className="primary-button btn btn--primary w-full h-12 min-h-[48px] px-4 text-sm font-bold rounded-xl inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
				>
					<Printer className="w-4 h-4 shrink-0" />
					<span>Печать рецепта</span>
				</button>
			</div>

			{/* Desktop layout: Left actions + Right actions */}
			<div className="hidden sm:flex items-center gap-2">
				<button
					type="button"
					data-testid="med-rx-copy-patient-btn-desktop"
					onClick={onCopyPatientMemo}
					title="Скопировать схему приёма и памятку для отправки пациенту в WhatsApp/Telegram"
					className="secondary-button btn btn--secondary h-9 min-h-[36px] px-3.5 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer justify-center"
				>
					<Copy className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>{isMemoCopied ? "Скопировано!" : "Скопировать для пациента"}</span>
				</button>
				<button
					type="button"
					data-testid="insert-to-diary-btn-desktop"
					onClick={onInsertToDiary}
					title="Перенести назначения в дневник приёма (SOAP Plan)"
					className="secondary-button btn btn--secondary h-9 min-h-[36px] px-3.5 text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 cursor-pointer justify-center hover:border-[var(--teal)]"
				>
					<Check className="w-4 h-4 text-emerald-600 shrink-0" />
					<span>Перенести в дневник визита</span>
				</button>
			</div>

			<div className="hidden sm:flex items-center gap-2">
				<button
					type="button"
					data-testid="print-patient-memo-btn-desktop"
					onClick={onPrintPatientMemo}
					title="Распечатать понятную памятку со схемой приёма для пациента"
					className="secondary-button btn btn--secondary h-9 min-h-[36px] px-3 text-xs font-medium rounded-xl inline-flex items-center gap-1.5 cursor-pointer justify-center"
				>
					<Printer className="w-3.5 h-3.5 text-[var(--teal)] shrink-0" />
					<span>Печать памятки</span>
				</button>
				<button
					type="button"
					data-testid="print-prescription-btn-desktop"
					onClick={onPrintPrescription}
					className="primary-button btn btn--primary h-9 min-h-[36px] px-4 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
				>
					<Printer className="w-4 h-4 shrink-0" />
					<span>Печать рецепта</span>
				</button>
			</div>
		</div>
	);
};
