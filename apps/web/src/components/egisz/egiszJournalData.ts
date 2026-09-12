/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD DOCUMENTS JOURNAL DATA & TYPES — DENTE DENTAL CRM
 * Statutory Journal Data Baseline & Registry Models for Russian Ministry of Health
 * Compliant with Order 947n, Order 804n, HL7 CDA R2 and Federal Law 63-FZ
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
	DEFAULT_EGISZ_CLINIC_PRESET,
	DEFAULT_EGISZ_DOCTOR_PRESET,
	type EgiszDentalCdaPayload,
	type EgiszDentalSemdCode,
	type GostSignatureInfo,
	SAMPLE_043U_PATIENT_PRESET,
	SAMPLE_DENTAL_SEMD_105_PRESET,
} from "./egiszRemdEngine";

export type RemdDocumentStatus = "draft" | "signed" | "sent" | "registered" | "error";

export interface RemdValidationError {
	errorCode: string;
	errorCategory: "frmr" | "frmo" | "804n" | "icd10" | "crypto" | "schema" | "patient";
	errorMessage: string;
	actionableHint: string;
	occurredAt: string;
}

export interface RemdRegistrationInfo {
	remdDocId: string;
	regNumber: string;
	registeredAt: string;
	registryOid: string;
	documentHashGost: string;
	channel: string;
}

export interface RemdDocumentRecord {
	id: string;
	documentUuid: string;
	docTypeCode: EgiszDentalSemdCode | "1151156";
	docTypeName: string;
	createdAt: string;
	updatedAt: string;
	encounterDate: string;
	patient: {
		id: string;
		fullName: string;
		birthDate: string;
		snils?: string | undefined;
		cardNumber: string;
		polisOms?: string | undefined;
	};
	doctor: {
		id: string;
		fullName: string;
		snils: string;
		position: string;
		specialty: string;
	};
	clinic: {
		name: string;
		oid: string;
		ogrn: string;
		inn: string;
	};
	status: RemdDocumentStatus;
	doctorSignature?: GostSignatureInfo | undefined;
	moSignature?: GostSignatureInfo | undefined;
	cdaPayload?: EgiszDentalCdaPayload | undefined;
	registrationInfo?: RemdRegistrationInfo | undefined;
	validationError?: RemdValidationError | undefined;
}

/**
 * Realistic clinical records baseline per DENTE Clinical Realism Law
 */
export const SAMPLE_REMD_JOURNAL_RECORDS: RemdDocumentRecord[] = [
	{
		id: "REMD-REC-001",
		documentUuid: "DOC-105-2026-08419",
		docTypeCode: "105",
		docTypeName: "Протокол консультации стоматолога (СЭМД 105)",
		createdAt: "2026-08-28T09:15:00+03:00",
		updatedAt: "2026-08-28T09:30:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-001",
			fullName: "Соколова Анна Владимировна",
			birthDate: "1988-06-14",
			snils: "123-456-789 64",
			cardNumber: "К-2026/0841",
			polisOms: "7754123456789012",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "registered",
		doctorSignature: {
			signatureBase64: "U0VNRF8xMDVfRE9DVE9SX1NJR05BVFVSRQ==",
			certificateSerialNumber: "00E4A28B12345678",
			certificateSubject: "CN=Иванов Сергей Владимирович, SNILS=123-456-789 64, O=ООО \"Стоматологический Центр ДЕНТЕ Премиум\", C=RU",
			certificateIssuer: "CN=Головной Удостоверяющий Центр Минцифры РФ, C=RU",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2027-12-31T23:59:59.000Z",
			signedAt: "2026-08-28T09:30:00+03:00",
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		},
		moSignature: {
			signatureBase64: "U0VNRF8xMDVfTU9fU0lHTkFUVVJFCg==",
			certificateSerialNumber: "00B17F9A11577461",
			certificateSubject: "CN=ООО \"Стоматологический Центр ДЕНТЕ Премиум\", OGRN=1157746123457, C=RU",
			certificateIssuer: "CN=Федеральное Казначейство, C=RU",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2027-12-31T23:59:59.000Z",
			signedAt: "2026-08-28T09:31:00+03:00",
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		},
		cdaPayload: SAMPLE_DENTAL_SEMD_105_PRESET,
		registrationInfo: {
			remdDocId: "REMD-2026-08419-RU",
			regNumber: "РЭМД-77-2026-99120",
			registeredAt: "2026-08-28T09:32:15+03:00",
			registryOid: "1.2.643.5.1.13.13.11.1527",
			documentHashGost: "9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08",
			channel: "EGISZ_INTEGRATION_GATEWAY_V3",
		},
	},
	{
		id: "REMD-REC-002",
		documentUuid: "DOC-303-2026-08422",
		docTypeCode: "303",
		docTypeName: "Протокол стоматологического лечения (СЭМД 303)",
		createdAt: "2026-08-28T10:45:00+03:00",
		updatedAt: "2026-08-28T11:00:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-002",
			fullName: "Пациент клиники",
			birthDate: "1979-11-23",
			snils: "112-233-445 95",
			cardNumber: "К-2026/0842",
			polisOms: "7754987654321098",
		},
		doctor: {
			id: "DOC-002",
			fullName: "Смирнова Елена Александровна",
			snils: "112-233-445 00",
			position: "Врач-стоматолог-хирург",
			specialty: "Стоматология хирургическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "error",
		doctorSignature: undefined,
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "303",
			documentUuid: "DOC-303-2026-08422",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Пациент клиники",
				patientSnils: "112-233-445 95",
				cardNumber: "К-2026/0842",
			},
			doctor: {
				...DEFAULT_EGISZ_DOCTOR_PRESET,
				doctorFullName: "Смирнова Елена Александровна",
				doctorSnils: "112-233-445 00",
				doctorPosition: "Врач-стоматолог-хирург",
			},
		},
		validationError: {
			errorCode: "ERR_FRMR_SNILS_NOT_FOUND",
			errorCategory: "frmr",
			errorMessage: "СНИЛС врача (112-233-445 00) не найден в Федеральном регистре медицинских работников (ФРМР).",
			actionableHint: "1. Проверьте правильность ввода СНИЛС врача в справочнике сотрудников клиники. 2. Убедитесь, что сотрудник зарегистрирован в регистре ФРМР Минздрава РФ с актуальным профилем. 3. Исправьте данные врача и повторите подписание.",
			occurredAt: "2026-08-28T11:02:10+03:00",
		},
	},
	{
		id: "REMD-REC-003",
		documentUuid: "DOC-303-2026-08425",
		docTypeCode: "303",
		docTypeName: "Протокол стоматологического лечения (СЭМД 303)",
		createdAt: "2026-08-28T12:00:00+03:00",
		updatedAt: "2026-08-28T12:15:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-003",
			fullName: "Кузнецов Михаил Петрович",
			birthDate: "1992-03-05",
			snils: "145-678-901 23",
			cardNumber: "К-2026/0845",
			polisOms: "7754332211009988",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "signed",
		doctorSignature: {
			signatureBase64: "U0VNRF8zMDNfRE9DVE9SX1NJR05BVFVSRQ==",
			certificateSerialNumber: "00E4A28B12345678",
			certificateSubject: "CN=Иванов Сергей Владимирович, SNILS=123-456-789 64, O=ООО \"Стоматологический Центр ДЕНТЕ Премиум\", C=RU",
			certificateIssuer: "CN=Головной Удостоверяющий Центр Минцифры РФ, C=RU",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2027-12-31T23:59:59.000Z",
			signedAt: "2026-08-28T12:10:00+03:00",
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		},
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "303",
			documentUuid: "DOC-303-2026-08425",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Кузнецов Михаил Петрович",
				cardNumber: "К-2026/0845",
			},
		},
	},
	{
		id: "REMD-REC-004",
		documentUuid: "DOC-302-2026-08428",
		docTypeCode: "302",
		docTypeName: "Консультация стоматолога (СЭМД 302)",
		createdAt: "2026-08-28T13:30:00+03:00",
		updatedAt: "2026-08-28T13:40:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-004",
			fullName: "Морозова Ольга Николаевна",
			birthDate: "1985-09-17",
			snils: "156-789-012 34",
			cardNumber: "К-2026/0848",
		},
		doctor: {
			id: "DOC-002",
			fullName: "Смирнова Елена Александровна",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-ортопед",
			specialty: "Стоматология ортопедическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "sent",
		doctorSignature: {
			signatureBase64: "U0VNRF8zMDJfRE9DVE9SX1NJR05BVFVSRQ==",
			certificateSerialNumber: "00E4A28B11223344",
			certificateSubject: "CN=Смирнова Елена Александровна, SNILS=123-456-789 64, O=ООО \"Стоматологический Центр ДЕНТЕ Премиум\", C=RU",
			certificateIssuer: "CN=Головной Удостоверяющий Центр Минцифры РФ, C=RU",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2027-12-31T23:59:59.000Z",
			signedAt: "2026-08-28T13:38:00+03:00",
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		},
		moSignature: {
			signatureBase64: "U0VNRF8zMDJfTU9fU0lHTkFUVVJFCg==",
			certificateSerialNumber: "00B17F9A11577461",
			certificateSubject: "CN=ООО \"Стоматологический Центр ДЕНТЕ Премиум\", OGRN=1157746123457, C=RU",
			certificateIssuer: "CN=Федеральное Казначейство, C=RU",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2027-12-31T23:59:59.000Z",
			signedAt: "2026-08-28T13:39:00+03:00",
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		},
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "302",
			documentUuid: "DOC-302-2026-08428",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Морозова Ольга Николаевна",
				cardNumber: "К-2026/0848",
			},
		},
	},
	{
		id: "REMD-REC-005",
		documentUuid: "DOC-106-2026-08431",
		docTypeCode: "106",
		docTypeName: "Выписной эпикриз (СЭМД 106)",
		createdAt: "2026-08-28T14:10:00+03:00",
		updatedAt: "2026-08-28T14:10:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-005",
			fullName: "Васильев Дмитрий Андреевич",
			birthDate: "1995-12-01",
			snils: "167-890-123 45",
			cardNumber: "К-2026/0851",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "draft",
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "106",
			documentUuid: "DOC-106-2026-08431",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Васильев Дмитрий Андреевич",
				cardNumber: "К-2026/0851",
			},
		},
	},
	{
		id: "REMD-REC-006",
		documentUuid: "DOC-303-2026-08435",
		docTypeCode: "303",
		docTypeName: "Протокол стоматологического лечения (СЭМД 303)",
		createdAt: "2026-08-27T16:00:00+03:00",
		updatedAt: "2026-08-27T16:20:00+03:00",
		encounterDate: "2026-08-27",
		patient: {
			id: "PAT-006",
			fullName: "Попова Татьяна Сергеевна",
			birthDate: "2001-07-29",
			snils: "178-901-234 56",
			cardNumber: "К-2026/0835",
		},
		doctor: {
			id: "DOC-002",
			fullName: "Смирнова Елена Александровна",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "error",
		doctorSignature: undefined,
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "303",
			documentUuid: "DOC-303-2026-08435",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Попова Татьяна Сергеевна",
				cardNumber: "К-2026/0835",
			},
			procedures: [],
		},
		validationError: {
			errorCode: "ERR_804N_SERVICE_CODE_MISSING",
			errorCategory: "804n",
			errorMessage: "Для протокола стоматологического вмешательства (СЭМД 303) обязателен минимум один код услуги по Номенклатуре 804н.",
			actionableHint: "1. Откройте протокол лечения пациента. 2. Добавьте оказанную номенклатурную услугу (например: A16.07.002.001 - Восстановление зуба пломбой). 3. Переподпишите документ УКЭП.",
			occurredAt: "2026-08-27T16:22:45+03:00",
		},
	},
	{
		id: "REMD-REC-007",
		documentUuid: "DOC-105-2026-08438",
		docTypeCode: "105",
		docTypeName: "Протокол консультации стоматолога (СЭМД 105)",
		createdAt: "2026-08-27T11:20:00+03:00",
		updatedAt: "2026-08-27T11:40:00+03:00",
		encounterDate: "2026-08-27",
		patient: {
			id: "PAT-007",
			fullName: "Григорьев Артем Павлович",
			birthDate: "1983-04-19",
			snils: "189-012-345 67",
			cardNumber: "К-2026/0838",
			polisOms: "7754445566778899",
		},
		doctor: {
			id: "DOC-001",
			fullName: "Иванов Сергей Владимирович",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ Премиум"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "registered",
		doctorSignature: {
			signatureBase64: "U0VNRF8xMDVfRE9DVE9SX1NJR05BVFVSRQ==",
			certificateSerialNumber: "00E4A28B12345678",
			certificateSubject: "CN=Иванов Сергей Владимирович, SNILS=123-456-789 64, O=ООО \"Стоматологический Центр ДЕНТЕ Премиум\", C=RU",
			certificateIssuer: "CN=Головной Удостоверяющий Центр Минцифры РФ, C=RU",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2027-12-31T23:59:59.000Z",
			signedAt: "2026-08-27T11:39:00+03:00",
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		},
		moSignature: {
			signatureBase64: "U0VNRF8xMDVfTU9fU0lHTkFUVVJFCg==",
			certificateSerialNumber: "00B17F9A11577461",
			certificateSubject: "CN=ООО \"Стоматологический Центр ДЕНТЕ Премиум\", OGRN=1157746123457, C=RU",
			certificateIssuer: "CN=Федеральное Казначейство, C=RU",
			validFrom: "2026-01-01T00:00:00.000Z",
			validTo: "2027-12-31T23:59:59.000Z",
			signedAt: "2026-08-27T11:40:00+03:00",
			algorithmOid: "1.2.643.7.1.1.1.1",
			digestAlgorithmOid: "1.2.643.7.1.1.2.2",
		},
		cdaPayload: {
			...SAMPLE_DENTAL_SEMD_105_PRESET,
			docTypeCode: "105",
			documentUuid: "DOC-105-2026-08438",
			patient: {
				...SAMPLE_043U_PATIENT_PRESET,
				patientFullName: "Григорьев Артем Павлович",
				cardNumber: "К-2026/0838",
			},
		},
		registrationInfo: {
			remdDocId: "REMD-2026-08438-RU",
			regNumber: "РЭМД-77-2026-99411",
			registeredAt: "2026-08-27T11:42:00+03:00",
			registryOid: "1.2.643.5.1.13.13.11.1527",
			documentHashGost: "A1B2C3D4E5F67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0",
			channel: "EGISZ_INTEGRATION_GATEWAY_V3",
		},
	},
];
