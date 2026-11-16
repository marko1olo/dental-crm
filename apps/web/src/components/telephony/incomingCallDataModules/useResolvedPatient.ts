import { useMemo } from "react";
import type { Dashboard, TelephonyPatientLike } from "@dental/shared";
import type { CallerLookupResult, IncomingCallPayload } from "../../../store/telephonyTypes";
import { resolvePatientFromPhone } from "../../../store/telephonyStore";
import { isDemoShowcaseMode, getDemoShowcasePatients } from "../../../lib/demoMode";
import { getOrCreatePatientFastIndex } from "./patientFastPhoneIndex";

export function useResolvedPatient(
	serverLookup: CallerLookupResult | null,
	currentCall: IncomingCallPayload | null,
	dashboard: Dashboard | undefined,
): TelephonyPatientLike | null {
	return useMemo(() => {
		if (serverLookup?.found && serverLookup.patient) {
			return serverLookup.patient;
		}

		if (!currentCall) return null;

		if (dashboard?.patients && dashboard.patients.length > 0) {
			const fastIndex = getOrCreatePatientFastIndex(dashboard.patients);

			if (currentCall.patientId) {
				const found = fastIndex.byId.get(currentCall.patientId);
				if (found) return found;
			}

			if (currentCall.phone) {
				const clean = currentCall.phone.replace(/\D/g, "");
				if (clean.length >= 10) {
					const nat10 = clean.slice(-10);
					const foundByNat = fastIndex.byNational10.get(nat10);
					if (foundByNat) return foundByNat;
				}
				if (clean.length >= 7) {
					const foundByClean = fastIndex.byCleanDigits.get(clean);
					if (foundByClean) return foundByClean;
				}
			}

			const foundByPhone = resolvePatientFromPhone(dashboard.patients, currentCall.phone);
			if (foundByPhone) return foundByPhone;
		}

		// Если абонент не найден в базе — возвращаем null (честный неизвестный абонент, DEF-TEL-01)
		return null;
	}, [serverLookup, currentCall, dashboard?.patients]);
}
