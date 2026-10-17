import type React from "react";
import type { DashboardResponse, IncomingCallPayload } from "../../../../store/telephonyStore";
import { formatPhoneDisplay, normalizePhoneDigits, resolvePatientFromPhone } from "../../../../store/telephonyStore";
import { showToast } from "../../../GlobalToast";
import type { TelephonyWidgetTab } from "../types";

interface UseFloatingDialActionsParams {
	dialNumber: string;
	setDialNumber: React.Dispatch<React.SetStateAction<string>>;
	dialInputRef: React.RefObject<HTMLInputElement | null>;
	setActiveTab: React.Dispatch<React.SetStateAction<TelephonyWidgetTab>>;
	dashboard: DashboardResponse | null | undefined;
	triggerIncomingCall: (call: IncomingCallPayload) => void;
}

export function useFloatingDialActions({
	dialNumber,
	setDialNumber,
	dialInputRef,
	setActiveTab,
	dashboard,
	triggerIncomingCall,
}: UseFloatingDialActionsParams) {
	const handleDialDigit = (digit: string) => {
		setDialNumber((prev) => (prev.length < 18 ? prev + digit : prev));
	};

	const handleDialBackspace = () => setDialNumber((prev) => prev.slice(0, -1));

	const handleStartOutgoingCall = () => {
		if (!dialNumber.trim()) {
			dialInputRef.current?.focus();
			showToast("Введите номер телефона для набора", "warning");
			return;
		}
		const clean = normalizePhoneDigits(dialNumber);
		const e164 = clean.startsWith("7") ? `+${clean}` : clean.startsWith("8") ? `+7${clean.slice(1)}` : `+7${clean}`;
		const matchingPatient = resolvePatientFromPhone(dashboard?.patients, e164);

		triggerIncomingCall({
			phone: e164,
			patientId: matchingPatient?.id || null,
			patientName: matchingPatient?.fullName || "Исходящий вызов",
			provider: "mango",
			timestamp: new Date().toISOString(),
			status: "answered",
			callStartedAt: Date.now(),
		});

		showToast(`Исходящий вызов на номер ${formatPhoneDisplay(e164)}`, "success");
		setActiveTab("call");
	};

	return { handleDialDigit, handleDialBackspace, handleStartOutgoingCall };
}
