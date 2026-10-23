import React from "react";
import { createPortal } from "react-dom";
import { TelephonyToastActions } from "./telephonyToast/TelephonyToastActions";
import { TelephonyToastHeader } from "./telephonyToast/TelephonyToastHeader";
import { TelephonyToastPatientCard } from "./telephonyToast/TelephonyToastPatientCard";
import type { TelephonyToastProps } from "./telephonyToast/types";
import { useTelephonyToastController } from "./telephonyToast/useTelephonyToastController";
import "./telephonyFloatingWidget.css";

export type { TelephonyToastProps };

export function TelephonyToast(props: TelephonyToastProps): React.JSX.Element | null {
	const c = useTelephonyToastController(props);

	if (!c.activeCall || c.isSterileZone) {
		return null;
	}

	const cardContent = (
		<aside
			role="complementary"
			aria-label="Входящий звонок"
			className={`telephony-toast-card pointer-events-auto w-full max-w-[390px] rounded-2xl p-3 bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-2xl flex flex-col gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-top-4 sm:slide-in-from-top-2 ${
				props.className || ""
			}`}
			data-testid="telephony-toast-card"
		>
			<TelephonyToastHeader
				isAnswered={c.isAnswered}
				isEnded={c.isEnded}
				provider={c.activeCall.provider}
				isConnected={c.isConnected}
				elapsedSeconds={c.elapsedSeconds}
				onDismiss={c.handleDismiss}
			/>

			<TelephonyToastPatientCard
				callerName={c.callerName}
				formattedPhone={c.formattedPhone}
				category={c.category}
				balanceText={c.balanceText}
				balanceColor={c.balanceColor}
				lastVisitText={c.lastVisitText}
				hasAllergy={c.hasAllergy}
				somaticNote={c.somaticNote}
			/>

			<TelephonyToastActions
				isKnownPatient={c.isKnownPatient}
				isAnswered={c.isAnswered}
				onOpenPatientCard={c.handleOpenPatientCard}
				onCreateAppointment={c.handleCreateAppointment}
				onAnswer={c.handleAnswer}
				onRejectCall={c.handleRejectCall}
				onEndCall={c.handleEndCall}
			/>
		</aside>
	);

	if (typeof document === "undefined") {
		return cardContent;
	}

	return createPortal(
		<div
			className="telephony-toast-portal fixed inset-x-0 bottom-[70px] sm:bottom-auto sm:top-4 sm:right-6 sm:inset-x-auto sm:w-auto w-full z-[9990] pointer-events-none flex flex-col items-center sm:items-end px-2 sm:px-0"
			data-testid="telephony-toast-portal"
		>
			{cardContent}
		</div>,
		document.body,
	);
}

export default TelephonyToast;
