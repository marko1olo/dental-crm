import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	DENTAL_ANESTHETICS_CATALOG,
	buildDisposalParamsFromQueue,
	calculateQueueStats,
	computeGtinCheckDigit,
	createCarpuleQueueItem,
	findAnestheticByDrugKey,
	findAnestheticsByClinicalId,
	formatSeniorNurseDisposalActData,
	generateMdlpSchema10560Payload,
	generateSeniorNurseDisposalActHtml,
	isValidGtinChecksum,
	normalizeDataMatrixSeparators,
	parseMdlpDataMatrix,
	parseMdlpExpirationDate,
	recognizeDentalMedication,
	sortQueueByFefo,
} from "../mdlp/index.js";
import {
	ANESTHESIA_DRUG_CATALOG,
	ANESTHESIA_DRUGS,
	getClinicalDrugForMdlpGtin,
	getClinicalSpecForMdlp,
	getMdlpInfoForAnesthesiaDrug,
} from "../anesthesia/index.js";

describe("MDLP / Chestny Znak Suite (packages/shared/src/tests/mdlp.test.ts)", () => {
	test("1.1 GTIN Modulo 10 checksum verification", () => {
		assert.strictEqual(isValidGtinChecksum("03664798000016"), true);
		assert.strictEqual(isValidGtinChecksum("03664798000023"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000014"), true);
		assert.strictEqual(isValidGtinChecksum("03400930000038"), true);
		assert.strictEqual(isValidGtinChecksum("04046719000012"), true);
		assert.strictEqual(isValidGtinChecksum("03664798000019"), false);
	});

	test("1.2 Dental Anesthetics Catalog recognition", () => {
		assert.strictEqual(
			recognizeDentalMedication("03664798000016")?.tradeName,
			"Ультракаин® Д-С форте",
		);
		assert.strictEqual(
			recognizeDentalMedication("03400930000014")?.tradeName,
			"Септанест с адреналином 1:100 000",
		);
		assert.strictEqual(
			recognizeDentalMedication("03400930000038")?.tradeName,
			"Скандонест 3% без вазоконстриктора",
		);
		assert.strictEqual(
			recognizeDentalMedication("04046719000012")?.tradeName,
			"Убистезин",
		);
		assert.strictEqual(
			recognizeDentalMedication("04607008360035")?.tradeName,
			"Артикаин Бинергия с адреналином",
		);
		assert.strictEqual(
			recognizeDentalMedication("08470001234567")?.tradeName,
			"Артикаин ИНИБСА (Артикаин 4% с эпинефрином)",
		);
	});

	test("1.3 GS1 DataMatrix parser with \\x1d and <GS> separators", () => {
		const raw =
			"0103664798000016211A2B3C4D5E6F7<GS>17280531<GS>10LOT2026<GS>91ABCD<GS>92SIG1234567890abcdefghijklmnopqrstuvwxyz1234";
		const parsed = parseMdlpDataMatrix(raw);

		assert.strictEqual(parsed.isValid, true);
		assert.strictEqual(parsed.gtin, "03664798000016");
		assert.strictEqual(parsed.serialNumber, "1A2B3C4D5E6F7");
		assert.strictEqual(parsed.expirationDate, "2028-05-31");
		assert.strictEqual(parsed.series, "LOT2026");
		assert.strictEqual(parsed.recognizedDrug?.id, "ultracain-ds-forte");
	});

	test("1.4 Schema 10560 XML Document Generation", () => {
		const doc = generateMdlpSchema10560Payload({
			subjectId: "00000000123456",
			docNum: "DOC-804N",
			docDate: "2026-08-25",
			items: [
				{
					sgtin: "036647980000161A2B3C4D5E6F7",
					gtin: "03664798000016",
					serialNumber: "1A2B3C4D5E6F7",
					costRub: 450,
				},
			],
		});

		assert.strictEqual(doc.actionId, 10560);
		assert(doc.xmlContent.includes('<withdrawal action_id="10560">'));
		assert(doc.xmlContent.includes("<sgtin>036647980000161A2B3C4D5E6F7</sgtin>"));
		assert(doc.xmlContent.includes("<cost>450.00</cost>"));
	});

	test("1.5 Carpule Queue and FEFO Sort", () => {
		const item1 = createCarpuleQueueItem(
			"010366479800001621SN1\x1d17281231\x1d91ABCD\x1d92SIG1",
		);
		const item2 = createCarpuleQueueItem(
			"010366479800001621SN2\x1d17260930\x1d91ABCD\x1d92SIG2",
		);

		const sorted = sortQueueByFefo([item1, item2]);
		assert.strictEqual(sorted[0]?.expirationDate, "2026-09-30");
	});

	test("1.6 Senior Nurse Disposal Act HTML Output", () => {
		const item = createCarpuleQueueItem(
			"010366479800001621SN1\x1d17280531\x1d91ABCD\x1d92SIG1",
			{ costRub: 450 },
		);
		const actData = formatSeniorNurseDisposalActData({ items: [item] });
		const html = generateSeniorNurseDisposalActHtml(actData);

		assert(html.includes("АКТ СПИСАНИЯ ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ"));
		assert(html.includes("Ультракаин® Д-С форте"));
	});

	test("1.7 Bidirectional lookup between clinical Anesthesia and statutory MDLP catalogs", () => {
		// Look up MDLP entry from clinical key
		const ultracainMdlp = getMdlpInfoForAnesthesiaDrug("ultracain_ds_forte");
		assert.ok(ultracainMdlp);
		assert.strictEqual(ultracainMdlp.id, "ultracain-ds-forte");
		assert.strictEqual(ultracainMdlp.clinicalDrugId, "articaine_4_epi_100k");

		const scandonestMdlp = getMdlpInfoForAnesthesiaDrug("scandonest_3");
		assert.ok(scandonestMdlp);
		assert.strictEqual(scandonestMdlp.id, "scandonest-3-plain");
		assert.strictEqual(scandonestMdlp.clinicalDrugId, "mepivacaine_3_plain");

		// Look up by clinical drug ID
		const articaine100kMatches = findAnestheticsByClinicalId("articaine_4_epi_100k");
		assert.ok(articaine100kMatches.length >= 3);
		assert.ok(articaine100kMatches.some((d) => d.id === "ultracain-ds-forte"));
		assert.ok(articaine100kMatches.some((d) => d.id === "septanest-1-100000"));
		assert.ok(articaine100kMatches.some((d) => d.id === "ubistesin-forte"));

		// Look up by drug key
		const foundByKey = findAnestheticByDrugKey("septanest_100");
		assert.ok(foundByKey);
		assert.strictEqual(foundByKey.id, "septanest-1-100000");
	});

	test("1.8 SSOT pharmacological parity between ANESTHESIA_DRUG_CATALOG and ANESTHESIA_DRUGS", () => {
		// Verify ANESTHESIA_DRUGS is strictly synchronized with clinical pharmacology specs
		assert.strictEqual(
			ANESTHESIA_DRUGS.ultracain_ds_forte.concentrationPct,
			ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k.activeConcentrationPercent,
		);
		assert.strictEqual(
			ANESTHESIA_DRUGS.ultracain_ds_forte.mgPerCarpule,
			ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k.mgActivePerCarpule,
		);
		assert.strictEqual(
			ANESTHESIA_DRUGS.ultracain_ds_forte.epinephrineMgPerCarpule,
			ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k.mgEpiPerCarpule,
		);
		assert.strictEqual(
			ANESTHESIA_DRUGS.ultracain_ds_forte.maxDoseMgPerKg,
			ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k.maxDoseMgPerKgAdult,
		);

		// Scandonest (plain mepivacaine) adrenaline-free verification
		assert.strictEqual(ANESTHESIA_DRUGS.scandonest_3.isAdrenalineFree, true);
		assert.strictEqual(ANESTHESIA_DRUGS.scandonest_3.containsSulfites, false);
		assert.strictEqual(ANESTHESIA_DRUGS.scandonest_3.epinephrineMgPerCarpule, 0);
		assert.strictEqual(
			ANESTHESIA_DRUGS.scandonest_3.mgPerCarpule,
			ANESTHESIA_DRUG_CATALOG.mepivacaine_3_plain.mgActivePerCarpule,
		);
	});

	test("1.9 Clinical drug resolution from GTIN DataMatrix barcode and MDLP ID", () => {
		// Ultracain DS forte GTIN -> Articaine 4% 1:100k spec
		const specFromGtin = getClinicalDrugForMdlpGtin("03664798000016");
		assert.ok(specFromGtin);
		assert.strictEqual(specFromGtin.id, "articaine_4_epi_100k");
		assert.strictEqual(specFromGtin.activeConcentrationPercent, 4.0);

		// Spec from MDLP ID
		const specFromId = getClinicalSpecForMdlp("scandonest-3-plain");
		assert.ok(specFromId);
		assert.strictEqual(specFromId.id, "mepivacaine_3_plain");
		assert.strictEqual(specFromId.isAdrenalineFree, true);

		// Non-existent GTIN returns null
		assert.strictEqual(getClinicalDrugForMdlpGtin("99999999999999"), null);
	});

	test("1.10 Recognition of Russian registered Lidocaine and Bupivacaine carpules", () => {
		const lidoPlain = recognizeDentalMedication("04601234567800");
		assert.ok(lidoPlain);
		assert.strictEqual(lidoPlain.id, "lidocaine-2-plain");
		assert.strictEqual(lidoPlain.clinicalDrugId, "lidocaine_2_plain");

		const marcaine = recognizeDentalMedication("07321420000018");
		assert.ok(marcaine);
		assert.strictEqual(marcaine.id, "marcaine-adrenaline");
		assert.strictEqual(marcaine.clinicalDrugId, "bupivacaine_05_epi_200k");
	});
});
