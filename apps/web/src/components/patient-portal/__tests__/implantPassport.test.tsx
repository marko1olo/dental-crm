import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	ImplantPassportWidget,
	DEFAULT_PRESET_IMPLANT_PASSPORT,
	type PatientImplantPassportProfile,
} from "../ImplantPassportWidget.js";

describe("ImplantPassportWidget (Electronic Implant & Prosthetic Passport)", () => {
	it("renders passport header, passport number, lifetime warranty badge, and totals", () => {
		const html = renderToString(
			<ImplantPassportWidget data={DEFAULT_PRESET_IMPLANT_PASSPORT} />,
		);

		assert.ok(html.includes("Электронный паспорт имплантов"));
		assert.ok(html.includes("IMP-2026-9481-RU"));
		assert.ok(html.includes("Пожизненная гарантия"));
		assert.ok(html.includes("2 ед."));
		assert.ok(html.includes("2 коронки"));
		assert.ok(html.includes("Верифицированы"));
	});

	it("renders surgical implant specs: FDI tooth, brand, SN, LOT, torque, ISQ, and surgeon", () => {
		const html = renderToString(
			<ImplantPassportWidget data={DEFAULT_PRESET_IMPLANT_PASSPORT} />,
		);

		// Tooth 46 Straumann
		assert.ok(html.includes("46"));
		assert.ok(html.includes("Straumann (Швейцария)"));
		assert.ok(html.includes("BLX SLActive"));
		assert.ok(html.includes("SN-981248019"));
		assert.ok(html.includes("LOT-884210"));
		assert.ok(html.includes("Ø 4.5 × 10 мм") || html.includes("4.5 × 10"));
		assert.ok(html.includes("45 N·cm"));
		assert.ok(html.includes("82"));
		assert.ok(html.includes("Д-р Смирнов К.М."));

		// Tooth 16 Nobel Biocare
		assert.ok(html.includes("16"));
		assert.ok(html.includes("Nobel Biocare (Швеция/Швейцария)"));
		assert.ok(html.includes("NobelActive"));
		assert.ok(html.includes("SN-774192083"));
		assert.ok(html.includes("40 N·cm"));
		assert.ok(html.includes("78"));
	});

	it("renders prosthetic crown details: E.max/Zirconia material, VITA shade, and lab technician", () => {
		const html = renderToString(
			<ImplantPassportWidget data={DEFAULT_PRESET_IMPLANT_PASSPORT} />,
		);

		assert.ok(html.includes("Коронка на винтовой фиксации"));
		assert.ok(html.includes("Диоксид циркония Katana"));
		assert.ok(html.includes("VITA A2"));
		assert.ok(html.includes("DenteLab"));
		assert.ok(html.includes("Воронов А.В."));
		assert.ok(html.includes("Гарантия до 15 августа 2036"));
	});

	it("renders custom implant passport data accurately", () => {
		const customProfile: PatientImplantPassportProfile = {
			patientId: "pat-custom-77",
			patientFullName: "Соколова Елена Викторовна",
			passportNumber: "IMP-2026-SOKOLOVA",
			issuedDateRu: "01.09.2026",
			totalImplantsCount: 1,
			totalProstheticsCount: 1,
			implants: [
				{
					id: "imp-custom-36",
					toothFdi: "36",
					brand: "osstem",
					brandNameRu: "Osstem (Южная Корея)",
					brandCountryRu: "Южная Корея",
					modelLine: "TS III SA",
					serialNumber: "SN-OSSTEM-99912",
					lotBatchNumber: "LOT-KOR-330",
					diameterMm: 4.0,
					lengthMm: 11.5,
					platformTypeRu: "Внутренний конус Морзе 11°",
					insertionTorqueNcm: 38,
					isqStability: 76,
					isqClassificationRu: "Высокая",
					installedDateIso: "2026-08-01",
					installedDateRu: "1 августа 2026",
					surgeonFullName: "Д-р Кузнецов Д.О.",
					clinicName: 'ООО "Стоматологическая клиника ДЕНТЕ"',
					manufacturerWarrantyType: "lifetime_international",
					manufacturerWarrantyLabelRu: "Международная гарантия Osstem",
					factoryVerifyUrl: "https://verify.osstem.com/sn/99912",
					certificateDigestSha256: "aabbccddeeff00112233445566778899",
					hasProstheticCrown: false,
				},
			],
			warrantySchedule: [],
		};

		const html = renderToString(
			<ImplantPassportWidget data={customProfile} />,
		);

		assert.ok(html.includes("IMP-2026-SOKOLOVA"));
		assert.ok(html.includes("Osstem (Южная Корея)"));
		assert.ok(html.includes("TS III SA"));
		assert.ok(html.includes("SN-OSSTEM-99912"));
		assert.ok(html.includes("38 N·cm"));
		assert.ok(html.includes("1 ед."));
	});
});
