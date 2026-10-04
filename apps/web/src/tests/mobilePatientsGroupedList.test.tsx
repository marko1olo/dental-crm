/**
 * apps/web/src/tests/mobilePatientsGroupedList.test.tsx
 *
 * Automated verification of Mobile Patient Registry & Search (§2.3 Apple Health / iOS Settings HIG):
 * 1. 1-Row iOS Search Bar & Horizontal Filter Chips (All, Allergies, Debt, Lost, Matrix).
 * 2. Grouped Inset List Cards: single rounded card container, inset separators, avatar monogram 38px.
 * 3. Clinical Ergonomics: Russian FIO, age & phone, red allergy chip (⚠ Аллергия: ...).
 * 4. 1-Tap Quick Call: tel:${phone} with >=44x44px touch target.
 * 5. Natural Thumb Zone FAB: fixed bottom right "+ Новый пациент".
 */

import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import {
	MobilePatientsGroupedList,
	calculateAge,
	formatAgeRu,
	extractAllergy,
	extractSomaticNote,
} from "../components/patients/MobilePatientsGroupedList";
import type { Patient } from "@dental/shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "../..");

test("Mobile Patients HIG — calculateAge, formatAgeRu and extractAllergy clinical helpers", () => {
	// Age calculation
	const age38 = calculateAge("1988-04-12");
	assert.ok(typeof age38 === "number" && age38 >= 35 && age38 <= 40);

	assert.equal(formatAgeRu(1), "1 год");
	assert.equal(formatAgeRu(2), "2 года");
	assert.equal(formatAgeRu(5), "5 лет");
	assert.equal(formatAgeRu(11), "11 лет");
	assert.equal(formatAgeRu(21), "21 год");
	assert.equal(formatAgeRu(38), "38 лет");

	// Allergy extraction from clinical notes
	assert.equal(
		extractAllergy("Аллергия на лидокаин. Острая реакция в анамнезе."),
		"лидокаин",
	);
	assert.equal(
		extractAllergy("ВНИМАНИЕ: Аллергия на пенициллин. Пульпит 3.6."),
		"пенициллин",
	);
	assert.equal(
		extractAllergy("Аллергия на ультракаин и сульфиты."),
		"ультракаин и сульфиты",
	);
	assert.equal(
		extractAllergy("Гипертоническая болезнь II ст. Кариес 1.6, 2.4"),
		null,
	);
	assert.equal(extractAllergy(null), null);

	// Somatic note extraction
	assert.equal(
		extractSomaticNote("Гипертоническая болезнь II ст."),
		"Гипертоническая болезнь II ст.",
	);
});

test("Mobile Patients HIG — MobilePatientsGroupedList renders Apple Health Grouped Inset Card structure", () => {
	const samplePatients: Patient[] = [
		{
			id: "pat-1",
			organizationId: "org-1",
			status: "active",
			fullName: "Смирнова Анна Сергеевна",
			phone: "+79161234567",
			birthDate: "1988-04-12",
			gender: "female",
			administrativeProfile: null,
			email: null,
			notes: "Аллергия на лидокаин. Острая реакция.",
			balanceRub: 0,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
		{
			id: "pat-2",
			organizationId: "org-1",
			status: "active",
			fullName: "Кузнецов Михаил Викторович",
			phone: "+79159998877",
			birthDate: "1975-11-20",
			gender: "male",
			administrativeProfile: null,
			email: null,
			notes: "Сахарный диабет 2 типа",
			balanceRub: -3500,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		},
	];

	const markup = renderToStaticMarkup(
		React.createElement(MobilePatientsGroupedList, {
			patients: samplePatients,
			selectedPatientId: "pat-1",
			onSelectPatient: () => {},
			onCreatePatient: () => {},
			onOpenTactileSearch: () => {},
			query: "",
			onQueryChange: () => {},
			onClearQuery: () => {},
			money: (amt: number) => `${amt} ₽`,
		}),
	);

	// 1. Grouped Inset Card Container
	assert.ok(
		markup.includes("mobile-grouped-inset-card"),
		"Must render unified .mobile-grouped-inset-card container",
	);

	// 2. 1-Row iOS Search Bar
	assert.ok(
		markup.includes("mobile-patients-search-input"),
		"Must render 1-row search input",
	);

	// 3. Filter Chips
	assert.ok(
		markup.includes("mobile-patients-chips-scroller"),
		"Must render horizontal filter chips scroller",
	);
	assert.ok(markup.includes("Все"), "Filter chips must include 'Все'");
	assert.ok(
		markup.includes("С аллергией"),
		"Filter chips must include 'С аллергией'",
	);
	assert.ok(
		markup.includes("С долгом"),
		"Filter chips must include 'С долгом'",
	);
	assert.ok(
		markup.includes("Матрица"),
		"Filter chips must include 'Матрица'",
	);

	// 4. Clinical Row details: Russian FIO & Avatar
	assert.ok(
		markup.includes("Смирнова Анна Сергеевна"),
		"Full Russian name must be rendered without ellipsis truncation",
	);
	assert.ok(
		markup.includes("Кузнецов Михаил Викторович"),
		"Full Russian name must be rendered without ellipsis truncation",
	);
	assert.ok(
		markup.includes("patient-avatar"),
		"Each patient row must render PatientAvatar monogram",
	);

	// 5. Red Allergy Chip
	assert.ok(
		markup.includes("mobile-patient-allergy-chip"),
		"Must render .mobile-patient-allergy-chip for allergic patient",
	);
	assert.ok(
		markup.includes("Аллергия: лидокаин"),
		"Must display extracted allergen 'Аллергия: лидокаин'",
	);

	// 6. Debt Chip
	assert.ok(
		markup.includes("mobile-patient-debt-chip"),
		"Must render .mobile-patient-debt-chip for debtor patient",
	);

	// 7. 1-Tap Quick Call Button
	assert.ok(
		markup.includes("mobile-patient-call-btn"),
		"Must render 1-tap quick call button with min 44x44px target",
	);
	assert.ok(
		markup.includes("href=\"tel:+79161234567\""),
		"Quick call button must have tel: link",
	);

	// 8. Natural Thumb Zone FAB
	assert.ok(
		markup.includes("mobile-patients-fab"),
		"Must render Natural Thumb Zone FAB (+ Новый пациент)",
	);
	assert.ok(
		markup.includes("Новый пациент"),
		"FAB must display 'Новый пациент'",
	);
});

test("Mobile Patients HIG — mobile-patients-list.css tokens and invariants", () => {
	const cssContent = fs.readFileSync(
		path.join(webRoot, "src/styles/modules/mobile-patients-list.css"),
		"utf8",
	);

	// 1. Grouped Inset Border Radius 16px
	assert.ok(
		cssContent.includes("border-radius: 16px"),
		"Grouped inset card must enforce 16px radius per Apple Health HIG",
	);

	// 2. Row min-height >= 56px
	assert.ok(
		cssContent.includes("min-height: 56px"),
		"Patient row must enforce min-height: 56px",
	);

	// 3. Quick Call Touch Target 44x44px
	assert.ok(
		cssContent.includes("min-width: 44px") && cssContent.includes("min-height: 44px"),
		"Quick call button must enforce 44x44px touch target (Doctor in gloves mandate)",
	);

	// 4. Inset Separator (left: 64px)
	assert.ok(
		cssContent.includes("left: 64px"),
		"Must implement 64px inset separator (matching avatar + gap offset)",
	);

	// 5. 0px horizontal drift protection
	assert.ok(
		cssContent.includes("overflow-x: clip") || cssContent.includes("overflow-x: hidden"),
		"Must enforce 0px horizontal drift protection",
	);

	// 6. FAB in thumb zone (fixed, bottom, z-index)
	assert.ok(
		cssContent.includes(".mobile-patients-fab") && cssContent.includes("position: fixed"),
		"FAB must be fixed in the bottom thumb zone",
	);
});
