import React from "react";

export interface AppointmentModalHeaderMenuAnchorsProps {
	patientId: string;
	isNewAppointment: boolean;
	hasRepeat: boolean;
	hasCopy: boolean;
}

export function AppointmentModalHeaderMenuAnchors({
	patientId,
	isNewAppointment,
	hasRepeat,
	hasCopy,
}: AppointmentModalHeaderMenuAnchorsProps) {
	return (
		<div className="hidden" aria-hidden="true">
			{patientId && !isNewAppointment && (
				<button
					type="button"
					data-testid="appointment-modal-menu-pay-btn"
				>
					<span>Принять оплату</span>
				</button>
			)}
			<button
				type="button"
				data-testid="appointment-modal-menu-print-blank-contract-btn"
			>
				<span>Бланк договора</span>
			</button>
			<button
				type="button"
				data-testid="appointment-modal-print-blank-consent-btn"
			>
				<span>Бланк ИДС</span>
			</button>
			{hasRepeat && (
				<button
					type="button"
					data-testid="appointment-modal-repeat-btn"
				>
					<span>Повторить</span>
				</button>
			)}
			{hasCopy && (
				<button
					type="button"
					data-testid="appointment-modal-copy-btn"
				>
					<span>В буфер</span>
				</button>
			)}
		</div>
	);
}
