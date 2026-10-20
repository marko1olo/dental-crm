/**
 * PrescriptionPrintSheet.tsx — Clean Printable Outpatient Sheet (Form 107-1/u & Patient Memo)
 * Responsive CSS tokens, Order 1094n compliance, WCAG AAA.
 * Architecture: Decomposed module <= 120 lines
 */

import { CheckCircle2 } from "lucide-react";
import type React from "react";
import type { PrescriptionDrugItem } from "./PrescriptionPrintModal";

export interface PrescriptionPrintSheetProps {
	readonly seriesNumber: string;
	readonly clinicName: string;
	readonly clinicAddress?: string; readonly clinicPhone?: string;
	readonly doctorName: string; readonly doctorSpecialty?: string;
	readonly patientName: string; readonly patientBirthDate?: string;
	readonly medicalCardNumber?: string; readonly prescriptionDate: string;
	readonly items: readonly PrescriptionDrugItem[];
	readonly validityDays?: string; readonly isMemoMode?: boolean;
	readonly isUkepSigned?: boolean; readonly className?: string;
}

export const PrescriptionPrintSheet: React.FC<PrescriptionPrintSheetProps> = ({
	seriesNumber, clinicName, clinicAddress, clinicPhone,
	doctorName, doctorSpecialty = "Врач-стоматолог",
	patientName, patientBirthDate, medicalCardNumber,
	prescriptionDate, items, validityDays = "60",
	isMemoMode = false, isUkepSigned = false, className,
}) => {
	return (
		<div
			data-testid="prescription-print-sheet"
			className={`p-5 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] shadow-md flex flex-col gap-3.5 select-text ${className || ""}`}
		>
			{/* Stamp Header */}
			<div className="flex items-start justify-between border-b border-[var(--line)] pb-3 gap-2">
				<div className="min-w-0">
					<div className="text-xs font-bold text-[var(--teal)] uppercase tracking-wider">
						{clinicName}
					</div>
					<div className="text-[11px] text-[var(--muted)] truncate">
						{clinicAddress} {clinicPhone ? `· Тел: ${clinicPhone}` : ""}
					</div>
					<div className="text-[11px] font-semibold text-[var(--ink-secondary)] mt-0.5">
						Врач: {doctorName} ({doctorSpecialty})
					</div>
				</div>
				<div className="text-right shrink-0">
					<span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
						{seriesNumber}
					</span>
					<div className="text-[10px] text-[var(--muted)] mt-1">
						{isMemoMode ? "Памятка пациента" : `Срок: ${validityDays} дней`}
					</div>
				</div>
			</div>

			{/* Patient Box */}
			<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs flex flex-wrap items-center justify-between gap-1.5">
				<div>
					<strong>Пациент:</strong> {patientName || "—"}{" "}
					{patientBirthDate ? `(${patientBirthDate})` : ""}
				</div>
				<div>
					<strong>Карта:</strong> {medicalCardNumber || "—"} ·{" "}
					<strong>Дата:</strong> {prescriptionDate}
				</div>
			</div>

			{/* Drug List */}
			<div className="flex flex-col gap-2.5 min-h-[140px]">
				{items.length === 0 ? (
					<div className="py-8 text-center text-xs text-[var(--muted)] italic">
						Препараты не выбраны. Нажмите на экспресс-набор выше.
					</div>
				) : (
					items.map((item, idx) => (
						<div
							key={item.id || idx}
							className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] text-xs flex flex-col gap-1"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="font-bold text-[var(--ink)]">
									{idx + 1}. {item.tradeName}
								</span>
								<span className="text-[11px] font-mono text-[var(--muted)]">
									{item.dispenseLatin}
								</span>
							</div>
							{!isMemoMode && (
								<div className="font-mono text-[11px] text-[var(--teal)] italic">
									{item.latinName}
								</div>
							)}
							<div className="text-[11.5px] text-[var(--ink-secondary)] bg-[var(--paper-soft)] p-1.5 rounded-lg border border-[var(--line-subtle,var(--line))]">
								<strong>Назначение:</strong> {item.signaRussian}
							</div>
						</div>
					))
				)}
			</div>

			{/* Footer Stamp & Autonomy Badge */}
			<div className="pt-2.5 border-t border-[var(--line)] flex items-center justify-between text-[11px] text-[var(--muted)]">
				<div className="flex items-center gap-1.5">
					<CheckCircle2 className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Печать клиники и подпись врача</span>
				</div>
				{isUkepSigned && (
					<span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
						УКЭП подтверждена
					</span>
				)}
			</div>
		</div>
	);
};
