import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Patient } from "@dental/shared";
import { matchesPatientSearch } from "../utils/patientSearchUtils";
import { CRITICAL_ALLERGEN_PATTERNS } from "../hooks/appLogic/appLogicModules/useAppEmergencyHandlers";
import { viewFromHash } from "../utils/routeUtils";

describe("Patient Logic & App Modules Decomposition Tests", () => {
	const mockPatients: any[] = [
		{
			id: "018f1a2b-3c4d-7e8f-9a0b-1c2d3e4f5a6b",
			fullName: "Иванов Иван Иванович",
			birthDate: "1985-04-12",
			phone: "+7 (999) 111-22-33",
			gender: "male",
			createdAt: "2026-01-01T10:00:00Z",
			updatedAt: "2026-01-01T10:00:00Z",
			notes: "Аллергия на пенициллин и новокаин",
			administrativeProfile: {
				balanceRub: -4500,
				loyaltyTier: "standard",
			} as any,
		},
		{
			id: "018f1a2b-3c4d-7e8f-9a0b-1c2d3e4f5a6c",
			fullName: "Петрова Анна Сергеевна",
			birthDate: "1992-08-25",
			phone: "+7 (916) 444-55-66",
			gender: "female",
			cardNumber: "КАРТА-1024",
			createdAt: "2026-02-01T10:00:00Z",
			updatedAt: "2026-02-01T10:00:00Z",
			notes: "Непереносимость латекса",
			administrativeProfile: {
				balanceRub: 12000,
				loyaltyTier: "vip",
			} as any,
		},
		{
			id: "018f1a2b-3c4d-7e8f-9a0b-1c2d3e4f5a6d",
			fullName: "Сидоров Алексей Михайлович",
			birthDate: "2015-11-03",
			phone: "",
			gender: "male",
			createdAt: "2026-03-01T10:00:00Z",
			updatedAt: "2026-03-01T10:00:00Z",
			administrativeProfile: {
				balanceRub: 0,
				loyaltyTier: "standard",
				legalRepresentativeFullName: "Сидорова Елена Викторовна",
				legalRepresentativePhone: "+7 (903) 777-88-99",
			} as any,
		},
	];

	describe("1. Patient Search & Filter (matchesPatientSearch)", () => {
		it("находит пациента по ФИО в прямом и обратном порядке", () => {
			assert.equal(matchesPatientSearch(mockPatients[0]!, "Иванов Иван"), true);
			assert.equal(matchesPatientSearch(mockPatients[0]!, "Иван Иванов"), true);
			assert.equal(matchesPatientSearch(mockPatients[0]!, "Петрова"), false);
		});

		it("находит пациента по последним цифрам телефона", () => {
			assert.equal(matchesPatientSearch(mockPatients[0]!, "2233"), true);
			assert.equal(matchesPatientSearch(mockPatients[1]!, "5566"), true);
			assert.equal(matchesPatientSearch(mockPatients[1]!, "9999"), false);
		});

		it("находит пациента по номеру карты", () => {
			assert.equal(matchesPatientSearch(mockPatients[1]!, "1024"), true);
			assert.equal(matchesPatientSearch(mockPatients[1]!, "КАРТА"), true);
		});

		it("находит ребенка по телефону или ФИО законного представителя", () => {
			assert.equal(matchesPatientSearch(mockPatients[2]!, "8899"), true);
			assert.equal(matchesPatientSearch(mockPatients[2]!, "Сидорова Елена"), true);
		});

		it("фильтрует должников по балансу < 0", () => {
			const debtors = mockPatients.filter(
				(p) => (p.administrativeProfile?.balanceRub ?? 0) < 0,
			);
			assert.equal(debtors.length, 1);
			assert.equal(debtors[0]!.fullName, "Иванов Иван Иванович");
		});
	});

	describe("2. Emergency Triage Allergen Detection (Mandate 8e)", () => {
		it("распознает критические аллергены: пенициллин и новокаин", () => {
			const notes = mockPatients[0]!.notes ?? "";
			const matches = CRITICAL_ALLERGEN_PATTERNS.filter((pattern) =>
				pattern.test(notes),
			).map((pattern) => notes.match(pattern)?.[0]);

			assert.ok(matches.length >= 2);
			assert.ok(matches.some((m) => /пенициллин/i.test(m!)));
			assert.ok(matches.some((m) => /новокаин/i.test(m!)));
		});

		it("распознает аллергию на латекс", () => {
			const notes = mockPatients[1]!.notes ?? "";
			const hasLatex = CRITICAL_ALLERGEN_PATTERNS.some((pattern) =>
				pattern.test(notes),
			);
			assert.equal(hasLatex, true);
		});

		it("возвращает пустой список предупреждений для пациента без аллергоанамнеза", () => {
			const notes = mockPatients[2]!.notes ?? "";
			const matches = CRITICAL_ALLERGEN_PATTERNS.filter((pattern) =>
				pattern.test(notes),
			);
			assert.equal(matches.length, 0);
		});
	});

	describe("3. Navigation Sync & Routing (viewFromHash)", () => {
		it("разрешает базовый хеш в представление пациентов", () => {
			assert.equal(viewFromHash("#patients"), "patients");
		});

		it("разрешает хеш расписания", () => {
			assert.equal(viewFromHash("#schedule"), "schedule");
		});

		it("разрешает хеш настроек и вложенных вкладок", () => {
			assert.equal(viewFromHash("#settings/clinic"), "settings");
		});

		it("безопасно обрабатывает пустой хеш, возвращая вид по умолчанию", () => {
			assert.equal(viewFromHash(""), "shift");
		});
	});
});
