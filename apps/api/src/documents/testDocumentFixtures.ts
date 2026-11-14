import {
	type ClinicProfile,
	type CreateDocumentInput,
	type GeneratedDocument,
	type Patient,
	type Payment,
	type TaxPaymentSnapshot,
	type TaxXmlSourceSnapshot,
	type TreatmentPlanItem,
	type Visit,
	patientAdministrativeProfileSchema,
} from "@dental/shared";

export function createTestPayment(overrides: Partial<Payment> = {}): Payment {
	return {
		id: "00000000-0000-0000-0000-000000000001",
		organizationId: "00000000-0000-0000-0000-000000000000",
		patientId: "00000000-0000-0000-0000-000000000002",
		visitId: null,
		documentId: null,
		amountRub: 1000,
		method: "card",
		status: "paid",
		paidAt: "2024-05-15T12:00:00.000Z",
		createdAt: "2024-05-15T12:00:00.000Z",
		note: null,
		taxDeductionCode: "1",
		payerFullName: "Иванов Иван Иванович",
		payerInn: "123456789012",
		payerBirthDate: "1990-01-01",
		payerRelationship: "self",
		...overrides,
	};
}

export function createTestPatient(overrides: Partial<Patient> = {}): Patient {
	return {
		id: "00000000-0000-0000-0000-000000000002",
		organizationId: "00000000-0000-0000-0000-000000000000",
		status: "active",
		fullName: "Иванов Иван Иванович",
		birthDate: "1990-01-01",
		gender: "male",
		phone: "+79991234567",
		email: "patient@example.com",
		notes: null,
		weightKg: null,
		isAnonymous: false,
		anonymousCode: null,
		administrativeProfile: patientAdministrativeProfileSchema.parse({
			taxpayerInn: "123456789012",
			identityDocument: "Паспорт 11 22 333444 выдан 01.01.2010",
		}),
		balanceRub: 0,
		balanceKopecks: 0,
		createdAt: "2024-05-15T12:00:00.000Z",
		updatedAt: "2024-05-15T12:00:00.000Z",
		...overrides,
	};
}

export function createTestClinicProfile(overrides: Partial<ClinicProfile> = {}): ClinicProfile {
	return {
		organizationId: "00000000-0000-0000-0000-000000000000",
		clinicName: "Тестовая Клиника",
		legalName: "ООО Стоматология",
		inn: "7701234567",
		kpp: "770101001",
		ogrn: "1234567890123",
		address: "г. Москва, ул. Ленина, д. 10",
		phone: "+74951234567",
		email: "clinic@example.com",
		website: "https://clinic.example.com",
		medicalLicenseNumber: "ЛО-77-01-012345",
		medicalLicenseIssuedAt: "2020-01-01",
		medicalLicenseIssuer: "Департамент здравоохранения г. Москвы",
		bankDetails: "р/с 40702810000000000001 в ПАО Сбербанк",
		signatoryName: "Петров Петр Петрович",
		signatoryTitle: "Главный врач",
		mode: "solo_doctor",
		timezone: "Europe/Moscow",
		defaultVisitMinutes: 30,
		scheduleDefaults: {
			workdayStart: "09:00",
			workdayEnd: "21:00",
			appointmentBufferMinutes: 0,
			workingDays: [1, 2, 3, 4, 5, 6],
		},
		networkEnabled: false,
		egiszEnabled: false,
		updatedAt: "2024-05-15T12:00:00.000Z",
		...overrides,
	};
}

export function createTestGeneratedDocument(overrides: Partial<GeneratedDocument> = {}): GeneratedDocument {
	return {
		id: "00000000-0000-0000-0000-000000000010",
		organizationId: "00000000-0000-0000-0000-000000000000",
		patientId: "00000000-0000-0000-0000-000000000002",
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Справка об оплате медицинских услуг для налогового вычета",
		status: "draft",
		issuedAt: "2024-05-15T12:00:00.000Z",
		totalAmountRub: 1000,
		taxYear: 2024,
		taxPayerInn: "123456789012",
		payload: {
			taxPaymentSelection: { selectedPaymentIds: ["00000000-0000-0000-0000-000000000001"] },
		},
		...overrides,
	};
}

export function createTestVisit(overrides: Partial<Visit> = {}): Visit {
	return {
		id: "00000000-0000-0000-0000-000000000020",
		organizationId: "00000000-0000-0000-0000-000000000000",
		patientId: "00000000-0000-0000-0000-000000000002",
		appointmentId: null,
		status: "signed",
		revision: 1,
		complaint: "Жалоб нет",
		anamnesis: "Без особенностей",
		objectiveStatus: "Слизистая чистая",
		diagnosis: "К02.1 Кариес дентина",
		treatmentPlan: null,
		doctorSummary: "Лечение завершено",
		createdAt: "2024-05-15T10:00:00.000Z",
		updatedAt: "2024-05-15T11:00:00.000Z",
		...overrides,
	};
}

export function createTestTreatmentPlanItem(overrides: Partial<TreatmentPlanItem> = {}): TreatmentPlanItem {
	return {
		id: "00000000-0000-0000-0000-000000000030",
		organizationId: "00000000-0000-0000-0000-000000000000",
		patientId: "00000000-0000-0000-0000-000000000002",
		visitId: null,
		serviceId: "srv-1",
		snapshotServiceName: "Лечение кариеса",
		toothCode: "16",
		quantity: 1,
		unitPriceRub: 2500,
		discountRub: 0,
		notes: null,
		status: "completed",
		plannedDoctorUserId: null,
		plannedChairId: null,
		...overrides,
	};
}

export function createTestTaxPaymentSnapshot(overrides: Partial<TaxPaymentSnapshot> = {}): TaxPaymentSnapshot {
	const p = createTestPayment();
	return {
		createdAt: "2024-05-15T12:00:00.000Z",
		taxYear: 2024,
		taxPayerInn: "123456789012",
		paymentIds: [p.id],
		fiscalReceiptKeys: ["rec-1"],
		payments: [p],
		...overrides,
	};
}

export function createTestCreateDocumentInput(overrides: Partial<CreateDocumentInput> = {}): CreateDocumentInput {
	return {
		patientId: "00000000-0000-0000-0000-000000000002",
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Справка об оплате медицинских услуг",
		payload: {},
		...overrides,
	};
}

export function createTestTaxXmlSourceSnapshot(overrides: Partial<TaxXmlSourceSnapshot> = {}): TaxXmlSourceSnapshot {
	return {
		createdAt: "2024-05-15T12:00:00.000Z",
		patient: createTestPatient(),
		clinicProfile: createTestClinicProfile(),
		payments: [createTestPayment()],
		...overrides,
	};
}
