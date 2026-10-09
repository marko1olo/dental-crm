import React from "react";
import { statusLabels, statusTone } from "./constants";

export interface DeliveryStatusBadgeProps {
	status: string;
	lastErrorMessage?: string | null;
	attempts?: number;
	maxAttempts?: number;
}

export function DeliveryStatusBadge({
	status,
	lastErrorMessage,
	attempts = 0,
	maxAttempts = 0,
}: DeliveryStatusBadgeProps) {
	return (
		<>
			<span
				className={`ops-state ops-state--${statusTone[status] ?? "muted"}`}
			>
				{statusLabels[status] ?? status}
			</span>
			{/* Причина отказа показывается прямо в строке: раньше её негде было узнать. */}
			{lastErrorMessage ? (
				<span className="ops-note">{lastErrorMessage}</span>
			) : null}
			{attempts > 0 ? (
				<span className="ops-note">
					попыток {attempts} из {maxAttempts}
				</span>
			) : null}
		</>
	);
}
