import type React from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../../../lib/safeLocalStorage";
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

	const handleStartOutgoingCall = async () => {
		if (!dialNumber.trim()) {
			dialInputRef.current?.focus();
			showToast("Введите номер телефона для набора", "warning");
			return;
		}
		const clean = normalizePhoneDigits(dialNumber);
		const e164 = clean.startsWith("7") ? `+${clean}` : clean.startsWith("8") ? `+7${clean.slice(1)}` : `+7${clean}`;
		const matchingPatient = resolvePatientFromPhone(dashboard?.patients, e164);

		try {
			const res = await fetch("/api/telephony/outbound-call", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-dente-staff-token": readDenteStaffToken(),
					"x-dente-clinic-token": readDenteClinicToken(),
				},
				body: JSON.stringify({
					phone: e164,
					patientId: matchingPatient?.id || undefined,
					patientName: matchingPatient?.fullName || "Исходящий вызов",
				}),
			});

			const data = (await res.json().catch(() => null)) as {
				success?: boolean;
				message?: string;
				provider?: string;
				status?: string;
			} | null;

			if (!res.ok || data?.success === false) {
				showToast(data?.message || "АТС не подключена: вызов не отправлен", "warning");
				return;
			}

			triggerIncomingCall({
				phone: e164,
				patientId: matchingPatient?.id || null,
				patientName: matchingPatient?.fullName || "Исходящий вызов",
				provider: data?.provider || "mango",
				timestamp: new Date().toISOString(),
				status: "dialing",
				callStartedAt: Date.now(),
			});

			showToast(`Вызов направлен в АТС: ${formatPhoneDisplay(e164)}`, "success");
			setActiveTab("call");
		} catch {
			showToast("Сетевой сбой при отправке вызова в АТС", "danger");
		}
	};

	return { handleDialDigit, handleDialBackspace, handleStartOutgoingCall };
}
