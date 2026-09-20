import type { PatientAdministrativeProfile } from "@dental/shared";

export type PatientAdministrativeProfilePatch = {
	[K in keyof PatientAdministrativeProfile]?:
		| PatientAdministrativeProfile[K]
		| undefined;
};

function isClockTime(value: unknown): value is string {
	return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clockToMinutes(value: string): number {
	const [hours = "0", minutes = "0"] = value.split(":");
	return Number.parseInt(hours, 10) * 60 + Number.parseInt(minutes, 10);
}

function normalizeOptionalWeekdays(value: unknown): number[] {
	const rawDays = Array.isArray(value) ? value : [];
	return Array.from(
		new Set(
			rawDays
				.filter(
					(day): day is number => Number.isInteger(day) && day >= 0 && day <= 6,
				)
				.sort((left, right) => left - right),
		),
	);
}

function nullableTrimmed(value: string | null | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function normalizePatientAdministrativeProfile(
	input: PatientAdministrativeProfilePatch | null | undefined,
): PatientAdministrativeProfile | null {
	const preferredAppointmentStart = isClockTime(
		input?.preferredAppointmentStart,
	)
		? input.preferredAppointmentStart
		: null;
	const requestedPreferredAppointmentEnd = isClockTime(
		input?.preferredAppointmentEnd,
	)
		? input.preferredAppointmentEnd
		: null;
	const preferredAppointmentEnd =
		preferredAppointmentStart &&
		requestedPreferredAppointmentEnd &&
		clockToMinutes(requestedPreferredAppointmentEnd) >
			clockToMinutes(preferredAppointmentStart)
			? requestedPreferredAppointmentEnd
			: null;

	/*
	 * Уровень лояльности. БЫЛО: normalizePatientAdministrativeProfile
	 * собирал profile без loyaltyTier — даже после добавления поля в Zod
	 * schema PUT .../administrative-profile принимал tier, а normalize
	 * молча выбрасывал ключ → JSONB/in-memory без tier, после F5 UI
	 * показывал «стандарт». СТАЛО: whitelist enum + null.
	 */
	const rawTier = input?.loyaltyTier;
	const loyaltyTier =
		rawTier === "standard" ||
		rawTier === "silver" ||
		rawTier === "gold" ||
		rawTier === "platinum"
			? rawTier
			: rawTier === null
				? null
				: null;

	const profile: PatientAdministrativeProfile = {
		identityDocument: nullableTrimmed(input?.identityDocument),
		taxpayerInn: nullableTrimmed(input?.taxpayerInn),
		registrationAddress: nullableTrimmed(input?.registrationAddress),
		residentialAddress: nullableTrimmed(input?.residentialAddress),
		insurancePolicyNumber: nullableTrimmed(input?.insurancePolicyNumber),
		snils: nullableTrimmed(input?.snils),
		legalRepresentativeFullName: nullableTrimmed(
			input?.legalRepresentativeFullName,
		),
		legalRepresentativeRelationship: nullableTrimmed(
			input?.legalRepresentativeRelationship,
		),
		legalRepresentativeIdentityDocument: nullableTrimmed(
			input?.legalRepresentativeIdentityDocument,
		),
		legalRepresentativePhone: nullableTrimmed(input?.legalRepresentativePhone),
		preferredDocumentRecipient: nullableTrimmed(
			input?.preferredDocumentRecipient,
		),
		preferredAppointmentWeekdays: normalizeOptionalWeekdays(
			input?.preferredAppointmentWeekdays,
		),
		preferredAppointmentStart,
		preferredAppointmentEnd,
		preferredAppointmentNote: nullableTrimmed(input?.preferredAppointmentNote),
		dataProcessingBasisNote: nullableTrimmed(input?.dataProcessingBasisNote),
		orthodonticProgress: nullableTrimmed(input?.orthodonticProgress),
		loyaltyTier,
		curatorId: nullableTrimmed(input?.curatorId),
		curatorFullName: nullableTrimmed(input?.curatorFullName),
		curatorAssignedAt: nullableTrimmed(input?.curatorAssignedAt),
		curatorFunnelStage: input?.curatorFunnelStage ?? null,
		curatorCommissionPercent:
			typeof input?.curatorCommissionPercent === "number"
				? input.curatorCommissionPercent
				: null,
		curatorNotes: nullableTrimmed(input?.curatorNotes),
		curatorNextContactDate: nullableTrimmed(input?.curatorNextContactDate),
		isAnonymous: Boolean(input?.isAnonymous),
		anonymousCode: nullableTrimmed(input?.anonymousCode),
		decree659Compliance:
			(input?.decree659Compliance as Record<string, unknown> | null | undefined) ??
			null,
		gender: input?.gender ?? null,
		insuranceContractId: nullableTrimmed(input?.insuranceContractId),
	};

	const hasValue = Object.values(profile).some((value) =>
		Array.isArray(value) ? value.length > 0 : Boolean(value),
	);
	return hasValue ? profile : null;
}
