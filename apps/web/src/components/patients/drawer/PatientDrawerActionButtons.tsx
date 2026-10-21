/**
 * apps/web/src/components/patients/drawer/PatientDrawerActionButtons.tsx
 * Primary action buttons for patient drawer.
 * Mandate 8b: strictly <= 120 lines.
 */

import { CalendarPlus, FileText } from "lucide-react";
import React from "react";

export interface PatientDrawerActionButtonsProps {
	readonly patientId?: string | undefined;
	readonly onOpenFullCard?: (() => void) | undefined;
	readonly onNewAppointment?: ((patientId?: string) => void) | undefined;
}

export const PatientDrawerActionButtons: React.FC<PatientDrawerActionButtonsProps> =
	React.memo(function PatientDrawerActionButtons({
		patientId,
		onOpenFullCard,
		onNewAppointment,
	}) {
		return (
			<div className="flex flex-col gap-2">
				<button
					type="button"
					data-testid="patient-drawer-full-card-btn"
					onClick={onOpenFullCard}
					className="min-h-[44px] sm:min-h-[36px] h-9 px-4 bg-[var(--teal)] hover:opacity-95 text-white text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-opacity"
				>
					<FileText className="w-4 h-4" />
					<span>Открыть медицинскую карту пациента</span>
				</button>

				{onNewAppointment && (
					<button
						type="button"
						onClick={() => onNewAppointment(patientId)}
						className="min-h-[44px] sm:min-h-[36px] h-9 px-4 border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-bold rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
					>
						<CalendarPlus className="w-4 h-4 text-[var(--teal)]" />
						<span>Записать на приём</span>
					</button>
				)}
			</div>
		);
	});
