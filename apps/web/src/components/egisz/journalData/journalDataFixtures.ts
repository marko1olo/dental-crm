/**
 * journalDataFixtures.ts — Clean test fixtures for REMD Document Records
 */

import type { RemdDocumentRecord } from "./journalDataTypes";

export function createFixtureRemdRecord(
	overrides?: Partial<RemdDocumentRecord>,
): RemdDocumentRecord {
	return {
		id: "REMD-FIXTURE-001",
		documentUuid: "DOC-105-2026-FIXTURE",
		docTypeCode: "105",
		docTypeName: "Протокол консультации стоматолога (СЭМД 105)",
		createdAt: "2026-08-28T09:15:00+03:00",
		updatedAt: "2026-08-28T09:30:00+03:00",
		encounterDate: "2026-08-28",
		patient: {
			id: "PAT-FIXTURE",
			fullName: "Тестовый Пациент",
			birthDate: "1988-06-14",
			snils: "123-456-789 64",
			cardNumber: "К-2026/0841",
		},
		doctor: {
			id: "DOC-FIXTURE",
			fullName: "Тестовый Врач",
			snils: "123-456-789 64",
			position: "Врач-стоматолог-терапевт",
			specialty: "Стоматология терапевтическая",
		},
		clinic: {
			name: 'ООО "Стоматологический Центр ДЕНТЕ"',
			oid: "1.2.643.5.1.13.13.12.2.77.10425",
			ogrn: "1157746123457",
			inn: "7701234560",
		},
		status: "registered",
		...overrides,
	};
}
