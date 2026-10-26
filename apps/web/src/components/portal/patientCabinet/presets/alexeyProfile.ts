import type { PatientPersonalCabinetData } from "../patientCabinetEngine";
import { ALEXEY_INVOICES } from "./alexeyInvoices";
import { ALEXEY_APPOINTMENTS } from "./alexeyAppointments";
import { ALEXEY_TREATMENT_PLANS } from "./alexeyTreatmentPlans";
import { ALEXEY_WARRANTIES } from "./alexeyWarranties";
import { ALEXEY_CONSENTS } from "./alexeyConsents";
import { ALEXEY_THREE_TIER_PLAN } from "./alexeyThreeTierPlan";

export const PATIENT_CABINET_PRESET_ALEXEY: PatientPersonalCabinetData = {
	patientId: "pat-8842",
	fullName: "Воронов Алексей Владимирович",
	phone: "+7 (999) 123-45-67",
	email: "alexey.voronov@example.com",
	birthDate: "1984-05-14",
	cardNumber: "043-8842",
	curatingDoctor: "Д-р Смирнов А. В. (Хирург-имплантолог, ортопед)",
	loyaltyBonusBalance: 12500,
	loyaltyTierRu: "Золотой (10%)",
	cashbackEarnedRub: 23500,
	familyBalanceRub: 84000,
	familyBonusPool: 18500,
	familyMembersCount: 2,
	familyMembers: [
		{
			id: "fam-member-alexey-spouse",
			fullName: "Воронова Екатерина Павловна",
			relationshipRu: "Супруг(а)",
			birthDate: "1987-03-22",
			phone: "+7 (999) 765-43-21",
			cardNumber: "043-8843",
			avatarInitials: "ЕВ",
			allowSpendFamilyBalance: true,
			allowBooking: true,
			nextAppointmentDateIso: "2026-09-12",
			nextAppointmentTimeRu: "14:00",
			nextAppointmentTitleRu: "Профессиональная гигиена и AirFlow",
			nextAppointmentDoctor: "Д-р Лебедева Е. М.",
		},
		{
			id: "fam-member-alexey-child",
			fullName: "Воронов Михаил Алексеевич",
			relationshipRu: "Сын",
			birthDate: "2016-08-10",
			cardNumber: "043-8844",
			avatarInitials: "МВ",
			allowSpendFamilyBalance: true,
			allowBooking: true,
			nextAppointmentDateIso: "2026-09-18",
			nextAppointmentTimeRu: "11:30",
			nextAppointmentTitleRu: "Детский профилактический осмотр",
			nextAppointmentDoctor: "Д-р Васильева Т. А.",
		},
	],
	dmsInsuranceName: "СОГАЗ ДМС Стоматология Премиум",
	dmsBalanceLimitRub: 150000,
	invoices: ALEXEY_INVOICES,
	appointments: ALEXEY_APPOINTMENTS,
	treatmentPlans: ALEXEY_TREATMENT_PLANS,
	warranties: ALEXEY_WARRANTIES,
	consents: ALEXEY_CONSENTS,
	threeTierModel: ALEXEY_THREE_TIER_PLAN,
	somaticRiskProfile: {
		hasCardiovascularRisk: true,
		hasSulfiteAllergy: false,
		hasLocalAnestheticsAllergy: false,
		hasBronchialAsthma: false,
		hasBleedingDisorder: false,
		hasDiabetes: false,
		isPregnantOrLactating: false,
		customNotes: "Контролируемая артериальная гипертензия, принимает ингибиторы АПФ.",
	},
	somaticAlerts: [
		{
			id: "alert_cardio",
			severity: "warning",
			title: "КАРДИОВАСКУЛЯРНЫЙ РИСК: Артериальная гипертензия",
			message: "Лимит эпинефрина: не более 0.04 мг. Контроль АД перед операцией.",
			recommendedAction: "Ультракаин Д-С 1:200 000 не более 4 карпул или Скандонест 3%.",
			category: "cardio",
		},
	],
	somaticRiskLevel: "moderate",
};

export const DEMO_PATIENT_CABINET = PATIENT_CABINET_PRESET_ALEXEY;
