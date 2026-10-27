/**
 * Сборка логики и контейнера подбора кандидатов листа ожидания.
 */
import React from "react";
import { useWaitlistMatchesLogic } from "./useWaitlistMatchesLogic";
import { WaitlistBlockContainer } from "./WaitlistBlockContainer";
import type { WaitlistMatchesBlockProps } from "./waitlistTypes";

export const WaitlistBlock: React.FC<WaitlistMatchesBlockProps> = ({
	appointmentId,
	compact = false,
	lazy = false,
	lazyLabel = "Показать всех из листа ожидания",
}) => {
	const logic = useWaitlistMatchesLogic(appointmentId, lazy);

	return (
		<WaitlistBlockContainer
			appointmentId={appointmentId}
			compact={compact}
			lazy={lazy}
			lazyLabel={lazyLabel}
			started={logic.started}
			loading={logic.loading}
			error={logic.error}
			report={logic.report}
			called={logic.called}
			contactedPatients={logic.contactedPatients}
			bookingId={logic.bookingId}
			activeMenuEntryId={logic.activeMenuEntryId}
			setActiveMenuEntryId={logic.setActiveMenuEntryId}
			onLoad={logic.load}
			onTakeSlot={logic.handleTakeSlot}
			onSendWhatsApp={logic.handleSendWhatsApp}
			onCopySms={logic.handleCopySms}
			onToggleCalled={logic.toggleCalled}
		/>
	);
};

export default WaitlistBlock;
