import React from "react";

export interface BillboardStatusSelectorProps {
	readonly status: "calling" | "in_treatment" | "waiting";
	readonly scheduledTime?: string;
}

export const BillboardStatusSelector: React.FC<BillboardStatusSelectorProps> = ({
	status,
	scheduledTime,
}) => {
	if (status === "calling") {
		return (
			<span className="lounge-status-badge lounge-status-badge--calling">
				<span className="lounge-welcome-beacon" aria-hidden="true" />
				<span>Приглашается в кабинет</span>
			</span>
		);
	}

	if (status === "in_treatment") {
		return (
			<span className="lounge-status-badge lounge-status-badge--treatment">
				<span>Идёт приём</span>
			</span>
		);
	}

	return (
		<span className="lounge-status-badge lounge-status-badge--waiting">
			<span>Ожидает приёма</span>
			{scheduledTime && <span className="opacity-75">• {scheduledTime}</span>}
		</span>
	);
};
