import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Patient } from "@dental/shared";
import { PatientSearchAutocomplete } from "../PatientSearchAutocomplete.js";
import { PatientSearchDuplicateHint } from "../patientSearchAutocomplete/PatientSearchDuplicateHint.js";
import { PatientSearchResultRow } from "../patientSearchAutocomplete/PatientSearchResultRow.js";
import { PatientSearchDropdown } from "../patientSearchAutocomplete/PatientSearchDropdown.js";
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

describe("1. PatientSearchAutocomplete, Duplicate Hint & Touch Ergonomics", () => {
	it("renders search input with desktop h-8 ergonomics and proper testid", () => {
		const html = renderToStaticMarkup(
			<PatientSearchAutocomplete
				patients={samplePatients}
				onSelectPatient={() => {}}
				onCreatePatientQuick={() => {}}
				placeholder="Поиск пациента..."
			/>,
		);

		assert.ok(html.includes('data-testid="patient-search-autocomplete"'));
		assert.ok(html.includes('data-testid="patient-search-autocomplete-input"'));
		assert.ok(html.includes("h-8"));
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(html), false);
	});

	it("parseSearchQueryForQuickPatient parses name and phone without passport/SNILS", () => {
		const prefill1 = parseSearchQueryForQuickPatient("Кузнецов +79161234567");
		assert.strictEqual(prefill1.fullName, "Кузнецов");
		assert.ok(prefill1.phone.replace(/\D/g, "").includes("9161234567"));

		const prefill2 = parseSearchQueryForQuickPatient("Смирнов Олег");
		assert.strictEqual(prefill2.fullName, "Смирнов Олег");

		const prefill3 = parseSearchQueryForQuickPatient("89261112233");
		assert.strictEqual(prefill3.fullName, "");
		assert.ok(prefill3.phone.includes("926"));
	});

	it("renders PatientSearchDuplicateHint with >=44px mobile touch targets, cancel left of CTA, and no h-6 buttons", () => {
		const html = renderToStaticMarkup(
			<PatientSearchDuplicateHint
				potentialDuplicate={{
					patient: samplePatients[0]!,
					similarity: 0.92,
					explanation: "Совпадение по фамилии и телефону",
				}}
				onSelect={() => {}}
				onTriggerQuickCreate={() => {}}
			/>,
		);

		assert.ok(html.includes('data-testid="patient-search-duplicate-hint"'));
		assert.ok(html.includes("max-md:min-h-[44px]"));
		assert.strictEqual(html.includes("h-6 "), false, "Buttons must not be cramped to 24px (h-6)");
		const continueIdx = html.indexOf('data-testid="continue-quick-create-btn"');
		const openIdx = html.indexOf('data-testid="open-existing-patient-btn"');
		assert.ok(continueIdx > -1 && openIdx > -1);
		assert.ok(continueIdx < openIdx, "Secondary action must stay left of Primary CTA");
	});

	it("renders PatientSearchResultRow fuzzy badge & PatientSearchDropdown with >=44px mobile targets", () => {
		const rowHtml = renderToStaticMarkup(
			<PatientSearchResultRow
				item={{
					patient: samplePatients[0]!,
					score: 85,
					isFuzzy: true,
					suggestedName: "Иванов Иван",
					fullNameHighlights: [{ text: "Иванов Иван Иванович", isMatch: true }],
					phoneHighlights: [{ text: "+7 (916) 111-22-33", isMatch: false }],
				}}
				isSelected={true}
				onSelect={() => {}}
				onMouseEnter={() => {}}
			/>,
		);
		assert.ok(rowHtml.includes('data-testid="patient-search-fuzzy-badge"'));
		assert.ok(rowHtml.includes("max-md:min-h-[44px]"));

		const dropdownHtml = renderToStaticMarkup(
			<PatientSearchDropdown
				listRef={null}
				searchResults={[]}
				highlightedIndex={0}
				potentialDuplicate={null}
				quickPrefill={{ fullName: "Новый Пациент", phone: "" }}
				canQuickCreate={true}
				getSomaticBadge={() => null}
				onSelect={() => {}}
				onHighlight={() => {}}
				onTriggerQuickCreate={() => {}}
			/>,
		);
		assert.ok(dropdownHtml.includes('data-testid="patient-search-quick-create-btn"'));
		assert.ok(dropdownHtml.includes("max-md:min-h-[44px]"));
	});
});
