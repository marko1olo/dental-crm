import React from "react";
import type { Appointment } from "@dental/shared";
import {
	AppointmentStatusBadgeSelector,
	AppointmentBalanceBadge,
	AppointmentAlertBadges,
} from "../AppointmentPaymentBadges";

export interface CardStatusBadgeContainerProps {
	appointmentId: string;
	displayStatus: Appointment["status"];
	appointmentLabels?: Record<string, string>;
	isQuickStatusUpdating: boolean;
	isLocked: boolean;
	compactMicro?: boolean;
	onStatusChange: (status: Appointment["status"]) => void;
	patientBalance: number | null;
	isCito: boolean;
	collisionMessage?: string | null;
	hasOpenVisit?: boolean;
	showSelector?: boolean;
}

export function CardStatusBadgeContainer({
	appointmentId,
	displayStatus,
	appointmentLabels,
	isQuickStatusUpdating,
	isLocked,
	compactMicro = false,
	onStatusChange,
	patientBalance,
	isCito,
	collisionMessage = null,
	hasOpenVisit = false,
	showSelector = true,
}: CardStatusBadgeContainerProps) {
	return (
		<>
			{showSelector && (
				<AppointmentStatusBadgeSelector
					appointmentId={appointmentId}
					displayStatus={displayStatus}
					appointmentLabels={appointmentLabels}
					isQuickStatusUpdating={isQuickStatusUpdating}
					isLocked={isLocked}
					compactMicro={compactMicro}
					onStatusChange={onStatusChange}
				/>
			)}
			<AppointmentBalanceBadge balance={patientBalance} />
			<AppointmentAlertBadges
				isCito={isCito}
				collisionMessage={collisionMessage}
				hasOpenVisit={hasOpenVisit}
			/>
		</>
	);
}
