import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Patient } from "@dental/shared";
import { PatientSearchAutocomplete } from "../PatientSearchAutocomplete.js";
import { parseSearchQueryForQuickPatient } from "../../schedule/patientSearchEngine.js";

const samplePatients: Patient[] = [
	{
		id: "pat-1",
		organizationId: "org-1",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (916) 111-22-33",
		birthDate: "1985-05-15",
		status: "active",
		balanceRub: 3500,
		allergies: "Аллергия на пенициллин",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	},
];

describe("1. PatientSearchAutocomplete Component & Fast Intake", () => {
	it("renders search input with 32px desktop ergonomics and proper testid", () => {
		const html = renderToString(
			React.createElement(PatientSearchAutocomplete, {
				patients: samplePatients,
				onSelectPatient: () => {},
				onCreatePatientQuick: () => {},
				placeholder: "Поиск пациента...",
			}),
		);

		assert.ok(html.includes('data-testid="patient-search-autocomplete"'));
		assert.ok(html.includes('data-testid="patient-search-autocomplete-input"'));
		assert.ok(html.includes("h-8"));
	});

	it("parseSearchQueryForQuickPatient parses name and phone for 5-second intake without passport/SNILS", () => {
		const prefill1 = parseSearchQueryForQuickPatient("Кузнецов +79161234567");
		assert.strictEqual(prefill1.fullName, "Кузнецов");
		assert.ok(prefill1.phone.replace(/\D/g, "").includes("9161234567"));

		const prefill2 = parseSearchQueryForQuickPatient("Смирнов Олег");
		assert.strictEqual(prefill2.fullName, "Смирнов Олег");

		const prefill3 = parseSearchQueryForQuickPatient("89261112233");
		assert.strictEqual(prefill3.fullName, "");
		assert.ok(prefill3.phone.includes("926"));
	});

	it("guarantees ZERO cartoon emojis in PatientSearchAutocomplete source code (Mandate 8d)", () => {
		const candidatePaths = [
			path.resolve(process.cwd(), "apps/web/src/components/patients/PatientSearchAutocomplete.tsx"),
			path.resolve(process.cwd(), "src/components/patients/PatientSearchAutocomplete.tsx"),
		];
		const filePath = candidatePaths.find((p) => fs.existsSync(p)) ?? candidatePaths[0]!;
		const source = fs.readFileSync(filePath, "utf-8");
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(source), false, "PatientSearchAutocomplete must not contain cartoon emojis");
	});
});
