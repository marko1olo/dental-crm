import { useMemo } from "react";
import type { TelephonyPatientLike } from "@dental/shared";
import type { IncomingCallPayload } from "../../../store/telephonyTypes";
import { formatPatientInitials, formatPhoneDisplay, getAvatarColor } from "../../../store/telephonyStore";
import { resolveCallAdvertisingAttribution, type CallAttribution } from "../telephonyAttribution";
import { isDemoShowcaseMode } from "../../../lib/demoMode";

export interface ResolvedCallerIdentityResult {
	callAttribution: CallAttribution | null;
	callerName: string;
	formattedPhone: string;
	initials: string;
	avatarColors: { bg: string; text: string };
	isKnownPatient: boolean;
	providerLabel: string;
}

export function useResolvedCallerIdentity(
	currentCall: IncomingCallPayload | null,
	resolvedPatient: TelephonyPatientLike | null,
): ResolvedCallerIdentityResult {
	const callAttribution = useMemo(() => {
		if (!currentCall) return null;
		return resolveCallAdvertisingAttribution(currentCall);
	}, [currentCall]);

	const callerName = useMemo(() => {
		if (resolvedPatient?.fullName) return resolvedPatient.fullName;
		if (currentCall?.patientName && currentCall.patientName.trim()) {
			return currentCall.patientName;
		}
		return "Неизвестный абонент";
	}, [resolvedPatient?.fullName, currentCall?.patientName]);

	const formattedPhone = useMemo(() => {
		if (currentCall?.phone) {
			return formatPhoneDisplay(currentCall.phone);
		}
		if (isDemoShowcaseMode() && resolvedPatient?.phone) {
			return formatPhoneDisplay(resolvedPatient.phone);
		}
		return "";
	}, [currentCall?.phone, resolvedPatient?.phone]);

	const initials = formatPatientInitials(callerName);
	const avatarColors = getAvatarColor(callerName);
	const isKnownPatient = Boolean(resolvedPatient);

	const providerLabel =
		currentCall?.provider === "sip"
			? "SIP-линия"
			: currentCall?.provider === "webrtc"
				? "WebRTC Софтфон"
				: currentCall?.provider === "local_pbx" || currentCall?.provider === "asterisk"
					? "Локальная АТС"
					: currentCall?.provider === "cloud_pbx" || currentCall?.provider === "mango" || currentCall?.provider === "uis" || currentCall?.provider === "zadarma"
						? "Облачная АТС"
						: "IP-Телефония";

	return {
		callAttribution,
		callerName,
		formattedPhone,
		initials,
		avatarColors,
		isKnownPatient,
		providerLabel,
	};
}
