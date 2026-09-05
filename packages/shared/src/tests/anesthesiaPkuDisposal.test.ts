import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	ANESTHESIA_PKU_PRESETS,
	calculateDefaultCarpuleExpirationDate,
	create1ClickAnesthesiaPkuDisposalRecord,
	generateAnesthesiaPkuDisposalAct,
	generateAnesthesiaPkuDisposalHtml,
	validateCarpuleExpirationDate,
} from "../anesthesia/pkuDisposal.js";

describe("Anesthesia PKU Carpule Disposal Engine (SanPiN 3.3686-21 / Mandate 8e)", () => {
	describe("1. Presets Catalog & Sin 7 Compliance (No Emojis in Official Records)", () => {
		it("provides standard dental presets (Ultracain, Septanest, Scandonest, Broken)", () => {
			assert.ok(ANESTHESIA_PKU_PRESETS.ultracain_ds_forte_1);
			assert.ok(ANESTHESIA_PKU_PRESETS.septanest_100_1);
			assert.ok(ANESTHESIA_PKU_PRESETS.scandonest_3_1);
			assert.ok(ANESTHESIA_PKU_PRESETS.damaged_broken_1);
		});

		it("contains zero raw emojis in preset titles, labels, or notesRu (Sin 7)", () => {
			for (const [key, preset] of Object.entries(ANESTHESIA_PKU_PRESETS)) {
				assert.equal(
					/⚡|★|✔|🔴|🟢|🟡/.test(preset.shortLabelRu),
					false,
					`Preset ${key} shortLabelRu must not contain raw emojis`
				);
				assert.equal(
					/⚡|★|✔|🔴|🟢|🟡/.test(preset.notesRu),
					false,
					`Preset ${key} notesRu must not contain raw emojis`
				);
			}
		});
	});

	describe("2. 1-Click Disposal Record Generation (create1ClickAnesthesiaPkuDisposalRecord)", () => {
		it("generates complete Ultracain disposal record in 1 click with default values", () => {
			const record = create1ClickAnesthesiaPkuDisposalRecord("ultracain_ds_forte_1");

			assert.ok(record.id.startsWith("pku_an_"));
			assert.ok(record.recordNumber.includes("ПКУ-АН-"));
			assert.equal(record.drugId, "articaine_4_epi_100k");
			assert.equal(record.drugNameRu, "Ультракаин Д-С форте");
			assert.equal(record.carpulesUsedCount, 1);
			assert.equal(record.carpulesDisposedCount, 1);
			assert.equal(record.volumeMlTotal, 1.7);
			assert.equal(record.wasteClass, "class_b_hazardous");
			assert.equal(record.disinfectionMethod, "chemical_disinfection");
			assert.equal(record.disinfectantNameRu, "Аламинол 3%");
			assert.equal(record.disinfectantExposureMinutes, 60);
			assert.equal(record.assistantSignatureConfirmed, true);
		});

		it("generates Scandonest cardio disposal record for patients with cardiovascular risks", () => {
			const record = create1ClickAnesthesiaPkuDisposalRecord("scandonest_3_1", {
				patientFullName: "Иванов Иван Иванович",
				doctorFullName: "Д-р Смирнов А.П.",
			});

			assert.equal(record.drugId, "mepivacaine_3_plain");
			assert.equal(record.patientFullName, "Иванов Иван Иванович");
			assert.equal(record.doctorFullName, "Д-р Смирнов А.П.");
			assert.equal(record.disposalReason, "used_in_procedure");
		});

		it("generates broken/damaged carpule disposal record with correct reason", () => {
			const record = create1ClickAnesthesiaPkuDisposalRecord("damaged_broken_1");

			assert.equal(record.disposalReason, "damaged_broken");
			assert.equal(record.carpulesUsedCount, 0);
			assert.equal(record.carpulesDisposedCount, 1);
		});
	});

	describe("3. Expiration Date Calculations & Validation", () => {
		it("calculates default expiration offset (+2 years from reference)", () => {
			const refDate = new Date("2026-05-15");
			const exp = calculateDefaultCarpuleExpirationDate(2, refDate);
			assert.equal(exp, "2028-05");
		});

		it("validates carpule expiration correctly", () => {
			const validRes = validateCarpuleExpirationDate("2028-12", "2026-09-01");
			assert.equal(validRes.isExpired, false);
			assert.equal(validRes.warningRu, null);

			const expiredRes = validateCarpuleExpirationDate("2025-01", "2026-09-01");
			assert.equal(expiredRes.isExpired, true);
			assert.ok(expiredRes.warningRu?.includes("ИСТЁК"));
		});
	});

	describe("4. Official SanPiN 3.3686-21 Act & HTML Generation (Mandate 8e item 10)", () => {
		it("generates plain-text official Act containing single-nurse clearance statement", () => {
			const record = create1ClickAnesthesiaPkuDisposalRecord("ultracain_ds_forte_1");
			const act = generateAnesthesiaPkuDisposalAct(record);

			assert.ok(act.includes("АКТ СПИСАНИЯ И УТИЛИЗАЦИИ МЕСТНЫХ АНЕСТЕТИКОВ"));
			assert.ok(act.includes("СанПиН 3.3686-21"));
			assert.ok(act.includes("комиссия из 3 человек не требуется"));
			assert.ok(act.includes("[ЭЦП ПОДТВЕРЖДЕНА В 1 КЛИК]"));
			assert.equal(/⚡|★|✔|🔴|🟢|🟡/.test(act), false, "Official Act must not contain emojis");
		});

		it("generates statutory HTML document with clean print styles", () => {
			const record = create1ClickAnesthesiaPkuDisposalRecord("septanest_100_1");
			const html = generateAnesthesiaPkuDisposalHtml(record);

			assert.ok(html.includes("sanpin-pku-act-document"));
			assert.ok(html.includes("Септанест 1:100 000"));
			assert.ok(html.includes("без комиссии из 3 человек"));
		});
	});
});
