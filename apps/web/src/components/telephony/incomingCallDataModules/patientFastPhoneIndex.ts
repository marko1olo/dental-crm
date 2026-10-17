export interface PatientFastPhoneIndex<T> {
	byId: Map<string, T>;
	byNational10: Map<string, T>;
	byCleanDigits: Map<string, T>;
}

// biome-ignore lint/suspicious/noExplicitAny: generic index cache
const patientFastIndexCache = new WeakMap<object, PatientFastPhoneIndex<any>>();

export function getOrCreatePatientFastIndex<
	T extends {
		id: string;
		phone?: string | null;
		administrativeProfile?: { legalRepresentativePhone?: string | null } | null;
	},
>(patientsList: readonly T[]): PatientFastPhoneIndex<T> {
	const cached = patientFastIndexCache.get(patientsList);
	if (cached) return cached;

	const byId = new Map<string, T>();
	const byNational10 = new Map<string, T>();
	const byCleanDigits = new Map<string, T>();

	for (let i = 0; i < patientsList.length; i++) {
		const p = patientsList[i];
		if (!p) continue;
		if (p.id) byId.set(p.id, p);

		const candidatePhones = [
			p.phone,
			p.administrativeProfile?.legalRepresentativePhone,
		];

		for (const raw of candidatePhones) {
			if (!raw || typeof raw !== "string") continue;
			const clean = raw.replace(/\D/g, "");
			if (clean.length >= 7) {
				if (!byCleanDigits.has(clean)) {
					byCleanDigits.set(clean, p);
				}
				if (clean.length >= 10) {
					const nat10 = clean.slice(-10);
					if (!byNational10.has(nat10)) {
						byNational10.set(nat10, p);
					}
				}
			}
		}
	}

	const index = { byId, byNational10, byCleanDigits };
	patientFastIndexCache.set(patientsList, index);
	return index;
}
