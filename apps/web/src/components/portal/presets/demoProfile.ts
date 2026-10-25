import type { PatientPortalProfile } from "../patientPortalTypes";

export const SAMPLE_PORTAL_PROFILE: PatientPortalProfile = {
	patientId: "PAT-2026-0891",
	fullName: "Павлова Светлана Игоревна",
	phone: "+7 (926) 555-12-34",
	email: "svetlana.pavlova@example.com",
	birthDate: "1988-06-14",
	cardNumber: "043/у-2026/891",
	curatingDoctor: "Д-р Смирнов Алексей Петрович",
	curatingDoctorSpecialty: "Врач-стоматолог терапевт-эндодонтист",
	curatingDoctorAvatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=200&q=80",
	depositBalanceRub: 14500,
	loyaltyBonusRub: 4200,
	loyaltyTier: "Золотой статус (10%)",
	cashbackPercent: 10,
	dmsPolicy: {
		insurerName: "АО «СОГАЗ» Стоматология Премиум",
		policyNumber: "СГЗ-77-991283",
		coverageLimitRub: 150000,
		validUntilIso: "2026-12-31",
	},
};
