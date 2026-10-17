import { useMemo } from "react";
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
	// biome-ignore lint/suspicious/noExplicitAny: patient like compatibility
	resolvedPatient: any | null,
): ResolvedCallerIdentityResult {
	const callAttribution = useMemo(() => {
		if (!currentCall) return null;
		return resolveCallAdvertisingAttribution(currentCall);
	}, [currentCall]);

	const callerName = useMemo(() => {
		if (resolvedPatient?.fullName) return resolvedPatient.fullName;
		if (isDemoShowcaseMode()) {
			return "Смирнова Анна Сергеевна";
		}
		return currentCall?.patientName || "Неизвестный номер";
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
		currentCall?.provider === "mango"
			? "Mango Telecom"
			: currentCall?.provider === "uis"
				? "UIS / CoMagic"
				: currentCall?.provider === "asterisk"
					? "Asterisk SIP"
					: currentCall?.provider === "zadarma"
						? "Zadarma PBX"
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
