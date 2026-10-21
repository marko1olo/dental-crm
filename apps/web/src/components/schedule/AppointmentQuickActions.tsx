import type { Appointment } from "@dental/shared";
import React, { useCallback } from "react";
import { QuickActionCommunicationButtons } from "./appointmentQuickActions/QuickActionCommunicationButtons";
import { QuickActionStatusButtons } from "./appointmentQuickActions/QuickActionStatusButtons";
import {
	buildQuickActionDefs,
	type QuickActionStatus,
} from "./appointmentQuickActions/quickActionConfig";
import { useQuickActionCommunication } from "./appointmentQuickActions/useQuickActionCommunication";

export type { QuickActionStatus };

export interface AppointmentQuickActionsProps {
	appointmentId: string;
	currentStatus: Appointment["status"];
	patientName: string;
	patientPhone?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	startsAt?: string | undefined;
	clinicName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	treatmentReason?: string | null | undefined;
	cabinetName?: string | null | undefined;
	appointmentHasOpenVisit?: boolean;
	activeVisitLockedAppointmentStatuses?: Set<Appointment["status"]>;
	onStatusChange: (
		status: Appointment["status"],
		noteAppend?: string,
	) => Promise<void> | void;
	onWhatsAppConfirm?: (() => void) | undefined;
	disabled?: boolean;
	compact?: boolean;
	showLabels?: boolean;
}

export function AppointmentQuickActions({
	appointmentId,
	currentStatus,
	patientName,
	patientPhone,
	doctorName,
	doctorSpecialty,
	startsAt,
	clinicName,
	clinicAddress,
	clinicPhone,
	treatmentReason,
	cabinetName,
	appointmentHasOpenVisit = false,
	activeVisitLockedAppointmentStatuses,
	onStatusChange,
	onWhatsAppConfirm,
	disabled = false,
	compact = false,
	showLabels = true,
}: AppointmentQuickActionsProps) {
	const [optimisticStatus, setOptimisticStatus] = React.useState<
		Appointment["status"] | null
	>(null);
	const [optimisticNote, setOptimisticNote] = React.useState<string | null>(
		null,
	);

	React.useEffect(() => {
		setOptimisticStatus(null);
		setOptimisticNote(null);
	}, [currentStatus]);

	const effectiveStatus = optimisticStatus ?? currentStatus;

	const handleAction = useCallback(
		async (status: Appointment["status"], noteAppend?: string) => {
			if (disabled) return;
			if (
				appointmentHasOpenVisit &&
				status !== "completed" &&
				activeVisitLockedAppointmentStatuses?.has(status)
			) {
				return;
			}
			setOptimisticStatus(status);
			setOptimisticNote(noteAppend ?? null);
			try {
				await onStatusChange(status, noteAppend);
			} catch {
				setOptimisticStatus(null);
				setOptimisticNote(null);
			}
		},
		[
			disabled,
			appointmentHasOpenVisit,
			activeVisitLockedAppointmentStatuses,
			onStatusChange,
		],
	);

	const { handleSendWhatsApp, handleCopySmsReminder } =
		useQuickActionCommunication({
			patientName,
			patientPhone,
			doctorName,
			doctorSpecialty,
			startsAt,
			clinicName,
			clinicAddress,
			clinicPhone,
			treatmentReason,
			cabinetName,
			onWhatsAppConfirm,
		});

	const actionDefs = React.useMemo(
		() => buildQuickActionDefs(patientName),
		[patientName],
	);

	return (
		<div
			className="appointment-quick-actions-bar flex flex-wrap items-center justify-between gap-1 p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] min-w-0 max-w-full"
			data-testid={`appointment-quick-actions-${appointmentId}`}
			role="toolbar"
			aria-label={`Быстрые действия по статусу: ${patientName}`}
		>
			<QuickActionStatusButtons
				actions={actionDefs}
				effectiveStatus={effectiveStatus}
				optimisticNote={optimisticNote}
				disabled={disabled}
				appointmentHasOpenVisit={appointmentHasOpenVisit}
				activeVisitLockedAppointmentStatuses={
					activeVisitLockedAppointmentStatuses
				}
				compact={compact}
				showLabels={showLabels}
				onActionClick={handleAction}
			/>
			{startsAt && (
				<QuickActionCommunicationButtons
					patientName={patientName}
					compact={compact}
					showLabels={showLabels}
					onSendWhatsApp={handleSendWhatsApp}
					onCopySmsReminder={handleCopySmsReminder}
				/>
			)}
		</div>
	);
}
