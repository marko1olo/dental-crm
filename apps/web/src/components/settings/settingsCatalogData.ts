/**
 * apps/web/src/components/settings/settingsCatalogData.ts
 *
 * DENTE Dental CRM — Канонический каталог данных, типов и пресетов настроек клиники (SSOT).
 * Архитектура Sweet Spot (Мандаты 8b 300–380 строк, 8e, 8n, 8x, 8wy).
 * Без бюрократических блокировок: софт для врача, а не врач для софта.
 */

export type ClinicLegalEntityType = "ooo" | "ip" | "self_employed";

export interface ClinicSettingsRequisites {
	clinicName: string;
	legalName: string;
	entityType: ClinicLegalEntityType;
	inn: string;
	kpp?: string;
	ogrn: string;
	medicalLicenseNumber: string;
	medicalLicenseIssuedAt?: string;
	legalAddress: string;
	actualAddress: string;
	phone: string;
	email: string;
	website?: string;
	signatoryName: string;
	signatoryTitle: string;
	bankName: string;
	bik: string;
	checkingAccount: string;
	corrAccount?: string;
}

export interface ClinicOperatingHours {
	weekdayHours: string;
	weekendHours: string;
	workdayStart: string;
	workdayEnd: string;
	workingDays: number[];
	slotDurationMinutes: number;
	sanitaryIntervalMinutes: number;
}

export interface ClinicChair {
	id: string;
	name: string;
	color: string;
	hasXraySensor: boolean;
	hasMicroscope: boolean;
	hasSurgeryKit: boolean;
	isActive: boolean;
}

export interface ClinicStaffMember {
	id: string;
	fullName: string;
	role: "doctor" | "administrator" | "assistant" | "manager";
	specialty: "therapist" | "orthopedist" | "surgeon" | "orthodontist" | "hygienist" | "universal";
	phone: string;
	email: string;
	isActive: boolean;
}

export interface ClinicIntegrations {
	whatsappEnabled: boolean;
	telegramEnabled: boolean;
	botToken?: string;
	fiscalRegisterType: "atol" | "shtrih" | "cloud" | "none";
	fiscalRegisterStatus: "connected" | "disconnected" | "ready";
	egiszStatus: "connected" | "ready" | "pending";
	egiszOid: string;
}

export interface ClinicStudioSettings {
	requisites: ClinicSettingsRequisites;
	schedule: ClinicOperatingHours;
	chairs: ClinicChair[];
	staff: ClinicStaffMember[];
	integrations: ClinicIntegrations;
	lastUpdatedIso?: string;
}

export const ROLE_LABELS: Record<string, string> = {
	doctor: "Врач-стоматолог",
	administrator: "Администратор",
	assistant: "Ассистент врача",
	manager: "Управляющий клиники",
};

export const SPECIALTY_LABELS: Record<string, string> = {
	therapist: "Терапевт",
	orthopedist: "Ортопед",
	surgeon: "Хирург-имплантолог",
	orthodontist: "Ортодонт",
	hygienist: "Гигиенист",
	universal: "Стоматолог общей практики",
};

export const DEFAULT_CHAIRS_PRESET: readonly ClinicChair[] = [
	{
		id: "chair-1",
		name: "Кресло 1 (Терапия)",
		color: "#0d9488",
		hasXraySensor: true,
		hasMicroscope: true,
		hasSurgeryKit: false,
		isActive: true,
	},
	{
		id: "chair-2",
		name: "Кресло 2 (Ортопедия и хирургия)",
		color: "#0284c7",
		hasXraySensor: true,
		hasMicroscope: false,
		hasSurgeryKit: true,
		isActive: true,
	},
	{
		id: "chair-3",
		name: "Кресло 3 (Гигиена и профилактика)",
		color: "#8b5cf6",
		hasXraySensor: false,
		hasMicroscope: false,
		hasSurgeryKit: false,
		isActive: true,
	},
];

export const DEFAULT_STAFF_PRESET: readonly ClinicStaffMember[] = [
	{
		id: "staff-1",
		fullName: "Воронов Александр Владимирович",
		role: "doctor",
		specialty: "universal",
		phone: "+7 (999) 111-22-33",
		email: "voronov@dente-clinic.ru",
		isActive: true,
	},
	{
		id: "staff-2",
		fullName: "Смирнова Елена Сергеевна",
		role: "doctor",
		specialty: "therapist",
		phone: "+7 (999) 222-33-44",
		email: "smirnova@dente-clinic.ru",
		isActive: true,
	},
	{
		id: "staff-3",
		fullName: "Кузнецова Анна Павловна",
		role: "assistant",
		specialty: "hygienist",
		phone: "+7 (999) 333-44-55",
		email: "assistant@dente-clinic.ru",
		isActive: true,
	},
	{
		id: "staff-4",
		fullName: "Соколова Марина Игоревна",
		role: "administrator",
		specialty: "universal",
		phone: "+7 (999) 444-55-66",
		email: "reception@dente-clinic.ru",
		isActive: true,
	},
];

export const STANDARD_CLINIC_PRESET_RF: ClinicStudioSettings = {
	requisites: {
		clinicName: "Стоматология ДЕНТЕ",
		legalName: "ООО \"Денте Клиник\"",
		entityType: "ooo",
		inn: "7701123456",
		kpp: "770101001",
		ogrn: "1237700123456",
		medicalLicenseNumber: "Л041-01137-77/00345678",
		medicalLicenseIssuedAt: "2024-03-15",
		legalAddress: "г. Москва, ул. Клиническая, д. 12, стр. 1, офис 101",
		actualAddress: "г. Москва, ул. Клиническая, д. 12, стр. 1",
		phone: "+7 (495) 777-88-99",
		email: "info@dente-clinic.ru",
		website: "https://dente-clinic.ru",
		signatoryName: "Воронов Александр Владимирович",
		signatoryTitle: "Главный врач",
		bankName: "ПАО Сбербанк г. Москва",
		bik: "044525225",
		checkingAccount: "40702810438000012345",
		corrAccount: "30101810400000000225",
	},
	schedule: {
		weekdayHours: "09:00–21:00",
		weekendHours: "10:00–18:00",
		workdayStart: "09:00",
		workdayEnd: "21:00",
		workingDays: [1, 2, 3, 4, 5, 6, 7],
		slotDurationMinutes: 30,
		sanitaryIntervalMinutes: 10,
	},
	chairs: [...DEFAULT_CHAIRS_PRESET],
	staff: [...DEFAULT_STAFF_PRESET],
	integrations: {
		whatsappEnabled: true,
		telegramEnabled: true,
		botToken: "dente_clinic_bot_token_secured",
		fiscalRegisterType: "atol",
		fiscalRegisterStatus: "ready",
		egiszStatus: "connected",
		egiszOid: "1.2.643.5.1.13.13.12.2.77.9876",
	},
	lastUpdatedIso: new Date().toISOString(),
};

export const SOLO_DOCTOR_PRESET_RF: ClinicStudioSettings = {
	requisites: {
		clinicName: "Кабинет доктора Воронова",
		legalName: "ИП Воронов Александр Владимирович",
		entityType: "ip",
		inn: "770198765432",
		kpp: "",
		ogrn: "324774600123456",
		medicalLicenseNumber: "Л041-01137-77/00987654",
		medicalLicenseIssuedAt: "2024-06-01",
		legalAddress: "г. Москва, Ленинградский пр-т, д. 45, к. 2",
		actualAddress: "г. Москва, Ленинградский пр-т, д. 45, к. 2",
		phone: "+7 (999) 111-22-33",
		email: "dr.voronov@dente.ru",
		website: "https://dr-voronov.dente.ru",
		signatoryName: "Воронов Александр Владимирович",
		signatoryTitle: "Врач-стоматолог (ИП)",
		bankName: "АО Т-Банк",
		bik: "044525974",
		checkingAccount: "40802810800000012345",
		corrAccount: "30101810145250000974",
	},
	schedule: {
		weekdayHours: "10:00–20:00",
		weekendHours: "Выходной",
		workdayStart: "10:00",
		workdayEnd: "20:00",
		workingDays: [1, 2, 3, 4, 5],
		slotDurationMinutes: 45,
		sanitaryIntervalMinutes: 15,
	},
	chairs: [
		{
			id: "chair-solo",
			name: "Кресло доктора",
			color: "#0d9488",
			hasXraySensor: true,
			hasMicroscope: true,
			hasSurgeryKit: true,
			isActive: true,
		},
	],
	staff: [
		{
			id: "staff-solo",
			fullName: "Воронов Александр Владимирович",
			role: "doctor",
			specialty: "universal",
			phone: "+7 (999) 111-22-33",
			email: "dr.voronov@dente.ru",
			isActive: true,
		},
	],
	integrations: {
		whatsappEnabled: true,
		telegramEnabled: true,
		botToken: "solo_bot_token",
		fiscalRegisterType: "atol",
		fiscalRegisterStatus: "ready",
		egiszStatus: "ready",
		egiszOid: "1.2.643.5.1.13.13.12.2.77.1122",
	},
	lastUpdatedIso: new Date().toISOString(),
};

export const ENTERPRISE_CLINIC_PRESET_RF: ClinicStudioSettings = {
	...STANDARD_CLINIC_PRESET_RF,
	requisites: {
		...STANDARD_CLINIC_PRESET_RF.requisites,
		clinicName: "Стоматологический центр ДЕНТЕ",
		legalName: 'ООО "Денте Групп"',
		inn: "7701998877",
	},
	chairs: [
		...DEFAULT_CHAIRS_PRESET,
		{ id: "chair-4", name: "Кресло 4 (Ортодонтия)", color: "#f59e0b", hasXraySensor: true, hasMicroscope: false, hasSurgeryKit: false, isActive: true },
		{ id: "chair-5", name: "Кресло 5 (Имплантация)", color: "#ec4899", hasXraySensor: true, hasMicroscope: true, hasSurgeryKit: true, isActive: true },
	],
};

const STORAGE_KEY = "dente_clinic_studio_settings";

export function loadClinicStudioSettings(): ClinicStudioSettings {
	if (typeof window === "undefined") {
		return { ...STANDARD_CLINIC_PRESET_RF };
	}
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed === "object" && parsed.requisites) {
				return {
					...STANDARD_CLINIC_PRESET_RF,
					...parsed,
					requisites: { ...STANDARD_CLINIC_PRESET_RF.requisites, ...parsed.requisites },
					schedule: { ...STANDARD_CLINIC_PRESET_RF.schedule, ...parsed.schedule },
					chairs: Array.isArray(parsed.chairs) && parsed.chairs.length > 0 ? parsed.chairs : STANDARD_CLINIC_PRESET_RF.chairs,
					staff: Array.isArray(parsed.staff) && parsed.staff.length > 0 ? parsed.staff : STANDARD_CLINIC_PRESET_RF.staff,
					integrations: { ...STANDARD_CLINIC_PRESET_RF.integrations, ...parsed.integrations },
				};
			}
		}
	} catch {
		// fallback to standard preset
	}
	return { ...STANDARD_CLINIC_PRESET_RF };
}

export function saveClinicStudioSettings(settings: ClinicStudioSettings): void {
	if (typeof window === "undefined") return;
	try {
		const updated = {
			...settings,
			lastUpdatedIso: new Date().toISOString(),
		};
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
		window.dispatchEvent(
			new CustomEvent("dente:clinic-settings-updated", {
				detail: updated,
			}),
		);
	} catch (e) {
		console.warn("[settingsCatalogData] Failed to save clinic studio settings to localStorage:", e);
	}
}

export interface SoftValidationNotice {
	field: string;
	message: string;
	isWarningOnly: true;
}

export function validateRequisitesSoft(req: Partial<ClinicSettingsRequisites>): SoftValidationNotice[] {
	const notices: SoftValidationNotice[] = [];
	if (!req.clinicName || req.clinicName.trim().length === 0) {
		notices.push({ field: "clinicName", message: "Рекомендуется указать название клиники для бланков", isWarningOnly: true });
	}
	if (!req.inn || req.inn.trim().length === 0) {
		notices.push({ field: "inn", message: "ИНН не заполнен (потребуется для фискальных чеков)", isWarningOnly: true });
	}
	if (!req.phone || req.phone.trim().length === 0) {
		notices.push({ field: "phone", message: "Телефон клиники отображается в шапке распечаток", isWarningOnly: true });
	}
	return notices;
}

export function formatInnHint(inn: string | undefined): string {
	if (!inn) return "ИНН не указан";
	const clean = inn.trim().replace(/\D/g, "");
	if (clean.length === 12) return "Форма: ИП (12 знаков)";
	if (clean.length === 10) return "Форма: Юрлицо (10 знаков)";
	return `ИНН: ${clean.length} знаков`;
}

export function exportClinicSettingsJson(settings: ClinicStudioSettings): string {
	return JSON.stringify(settings, null, 2);
}
