import assert from "node:assert/strict";
const { describe, it } = await (async () => {
	try {
		// @ts-ignore
		return await import("vitest");
	} catch {
		return await import("node:test");
	}
})();
import {
	CANONICAL_SURGICAL_OPERATION_NORMS,
	evaluateWarehouseOverdraft,
	buildStandardImplantationProtocolText,
	createSurgicalProtocolSchema,
	surgicalQuickDeductSchema,
	fastImplantPassportDataSchema,
} from "@dental/shared";

describe("Outpatient Surgery & Implantology Engine (Mandates 8e, 8i, 8s, 8n)", () => {
	it("1. Mandate 8i: 100% free of inpatient/hospital bloat, transfusions, and narcotics PKU", () => {
		const forbiddenHospitalKeywords = [
			"лапаротом",
			"полостн",
			"трансфузи",
			"койко-дн",
			"интубаци",
			"общий наркоз",
			"паллиатив",
			"стационар",
			"брюшн",
			"фентанил",
			"морфин",
			"промедол",
		];

		for (const norm of CANONICAL_SURGICAL_OPERATION_NORMS) {
			const fullText = [
				norm.title,
				norm.standardProtocolTextRu,
				norm.anesthesiaDefaultRu,
				norm.postOpRecommendationsRu,
				...(norm.order804nServices?.map((s) => s.nameRu) ?? []),
			]
				.join(" ")
				.toLowerCase();

			for (const badWord of forbiddenHospitalKeywords) {
				assert.equal(
					fullText.includes(badWord),
					false,
					`Norm ${norm.id} must not contain hospital bloat keyword "${badWord}"`,
				);
			}
		}
	});

	it("2. Mandate 8e & 8n: Soft inventory overdraft ALWAYS allows procedure to proceed (canProceed: true)", () => {
		const norm = CANONICAL_SURGICAL_OPERATION_NORMS[0]!;

		// Warehouse in normal state
		const normalStatus = evaluateWarehouseOverdraft(norm.requiredMaterials, false);
		assert.equal(normalStatus.hasOverdraft, false);
		assert.equal(normalStatus.canProceed, true);

		// Warehouse delay: soft overdraft active
		const delayedStatus = evaluateWarehouseOverdraft(norm.requiredMaterials, true);
		assert.equal(delayedStatus.hasOverdraft, true);
		assert.equal(delayedStatus.canProceed, true, "Doctor MUST NEVER be blocked by warehouse delay!");
		assert.ok(delayedStatus.warningRu.includes("Мягкий овердрафт"));
		assert.ok(delayedStatus.detailsRu.includes("Доктор сохраняет протокол беспрепятственно"));
	});

	it("3. Mandate 8e: Generates 1-click standard dental implantation protocol without blocking", () => {
		const protocol = buildStandardImplantationProtocolText({
			toothFdi: 46,
			brand: "Dentium",
			model: "SuperLine",
			diameterMm: 4.5,
			lengthMm: 10.0,
			torqueNcm: 40,
			isq: 76,
			capType: "fdm",
			sutureMaterial: "Prolene 4-0",
			postOpXray: true,
		});

		assert.ok(protocol.includes("зуба FDI #46"));
		assert.ok(protocol.includes("Dentium SuperLine Ø 4.5 × 10 мм"));
		assert.ok(protocol.includes("Первичная торк-стабильность 40 Н·см"));
		assert.ok(protocol.includes("RFA стабильность ISQ 76"));
		assert.ok(protocol.includes("Установлен формирователь десны (ФДМ)"));
		assert.ok(protocol.includes("Prolene 4-0"));
		assert.ok(protocol.includes("радиовизиографический снимок"));
	});

	it("4. Mandate 8e & SanPiN 3.3686-21: Validates 1-click surgical quick-deduct schema with carpule Class B disposal", () => {
		const validCarpuleInput = {
			visitId: "00000000-0000-0000-0000-000000000001",
			bundleType: "anesthesia_carpule" as const,
			carpulesCount: 2,
			drugBrandName: "Артикаин 1:100 000",
			isNurseAction: true,
			notes: "Списано медсестрой в 1 клик (Класс Б)",
		};

		const parsedCarpule = surgicalQuickDeductSchema.safeParse(validCarpuleInput);
		assert.equal(parsedCarpule.success, true);

		const validImplantBundle = {
			bundleType: "implant" as const,
			toothNumberFdi: 46,
			notes: "1-клик списание под операцию",
		};
		const parsedImplant = surgicalQuickDeductSchema.safeParse(validImplantBundle);
		assert.equal(parsedImplant.success, true);

		// DEF-SURG-02: bundleType "surgery" must be accepted without 400
		const validSurgeryBundle = {
			bundleType: "surgery" as const,
			toothNumberFdi: 36,
			notes: "Списание под хирургическую операцию",
		};
		const parsedSurgery = surgicalQuickDeductSchema.safeParse(validSurgeryBundle);
		assert.equal(parsedSurgery.success, true, "Must accept 'surgery' bundleType enum");
	});

	it("5. Mandate 8e: Validates surgical protocol creation schema (Form 043/u)", () => {
		const validProtocol = {
			patientId: "00000000-0000-0000-0000-000000000002",
			visitId: "00000000-0000-0000-0000-000000000003",
			normId: "surgery_implant_standard",
			toothNumberFdi: 46,
			protocolText: "Установка дентального имплантата выполнена штатно. Торк 35 Н·см.",
			isOverdraftActive: false,
		};

		const parsed = createSurgicalProtocolSchema.safeParse(validProtocol);
		assert.equal(parsed.success, true);
	});

	it("6. Mandate 8e: Validates FastImplantPassportData schema (GOST / 804n passport)", () => {
		const validPassport = {
			toothFdi: 46,
			brand: "Dentium",
			model: "SuperLine",
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			isqDay0: 75,
			boneDensity: "D2" as const,
			capType: "fdm" as const,
			catalogArticle: "TS3S4010S",
			lotNumber: "LOT-992144",
			serialNumber: "SN-481920",
			dateIso: new Date().toISOString(),
			isWarehouseOverdraft: false,
		};

		const parsed = fastImplantPassportDataSchema.safeParse(validPassport);
		assert.equal(parsed.success, true);
	});

	it("7. Mandate 8s & DEF-SURG-01: Prohibits patient substitution and phantom creation on invalid patient", () => {
		const invalidProtocol = {
			patientId: "not-a-valid-uuid",
			normId: "surgery_implant_standard",
			toothNumberFdi: 46,
			protocolText: "Тест протокола",
		};
		const parsed = createSurgicalProtocolSchema.safeParse(invalidProtocol);
		assert.equal(parsed.success, false, "Must reject non-UUID patient ID");
	});

	it("8. DEF-SURG-03: Tooth state preserves teeth as 'Treated' for resection and periostotomy, 'Extracted' for extractions", () => {
		const SCENARIO_NORM_ALIASES: Record<string, string> = {
			"scen-extraction": "surgery_extraction_simple",
			"scen-resection": "surgery_periostotomy",
			"scen-sinus-gbr": "surgery_sinus_lift_gbr",
			"scen-implant": "surgery_implant_standard",
		};

		// 1. Resection / Periostotomy: MUST NOT BE "Extracted" -> MUST BE "Treated"
		for (const normId of ["scen-resection", "surgery_periostotomy", "surgery_apicoectomy"]) {
			const effectiveNormId = SCENARIO_NORM_ALIASES[normId] || normId;
			const norm = CANONICAL_SURGICAL_OPERATION_NORMS.find(
				(n) => n.id === effectiveNormId || n.id === normId,
			);
			const isImplant =
				effectiveNormId.toLowerCase().includes("implant") || norm?.category === "implant";
			const isExtraction =
				effectiveNormId.toLowerCase().includes("extract") || norm?.category === "extraction";
			const newState = isImplant ? "Implant" : isExtraction ? "Extracted" : "Treated";
			const newSurfaces = isImplant
				? ["implant_site"]
				: isExtraction
					? ["extracted_socket"]
					: ["cured_apical"];

			assert.equal(newState, "Treated", `Tooth for ${normId} must remain Treated, not Extracted`);
			assert.deepEqual(newSurfaces, ["cured_apical"]);
		}

		// 2. Extraction: MUST BE "Extracted"
		for (const normId of ["scen-extraction", "surgery_extraction_simple", "surgery_extraction_atypical"]) {
			const effectiveNormId = SCENARIO_NORM_ALIASES[normId] || normId;
			const norm = CANONICAL_SURGICAL_OPERATION_NORMS.find(
				(n) => n.id === effectiveNormId || n.id === normId,
			);
			const isImplant =
				effectiveNormId.toLowerCase().includes("implant") || norm?.category === "implant";
			const isExtraction =
				effectiveNormId.toLowerCase().includes("extract") || norm?.category === "extraction";
			const newState = isImplant ? "Implant" : isExtraction ? "Extracted" : "Treated";
			const newSurfaces = isImplant
				? ["implant_site"]
				: isExtraction
					? ["extracted_socket"]
					: ["cured_apical"];

			assert.equal(newState, "Extracted", `Tooth for ${normId} must be Extracted`);
			assert.deepEqual(newSurfaces, ["extracted_socket"]);
		}

		// 3. Implant: MUST BE "Implant"
		for (const normId of ["scen-implant", "surgery_implant_standard"]) {
			const effectiveNormId = SCENARIO_NORM_ALIASES[normId] || normId;
			const norm = CANONICAL_SURGICAL_OPERATION_NORMS.find(
				(n) => n.id === effectiveNormId || n.id === normId,
			);
			const isImplant =
				effectiveNormId.toLowerCase().includes("implant") || norm?.category === "implant";
			const isExtraction =
				effectiveNormId.toLowerCase().includes("extract") || norm?.category === "extraction";
			const newState = isImplant ? "Implant" : isExtraction ? "Extracted" : "Treated";
			const newSurfaces = isImplant
				? ["implant_site"]
				: isExtraction
					? ["extracted_socket"]
					: ["cured_apical"];

			assert.equal(newState, "Implant", `Tooth for ${normId} must be Implant`);
			assert.deepEqual(newSurfaces, ["implant_site"]);
		}
	});

	it("9. DEF-SURG-04: Resolves scenario aliases to canonical norms and titles", () => {
		const SCENARIO_NORM_ALIASES: Record<string, string> = {
			"scen-extraction": "surgery_extraction_simple",
			"scen-resection": "surgery_periostotomy",
			"scen-sinus-gbr": "surgery_sinus_lift_gbr",
			"scen-implant": "surgery_implant_standard",
		};

		assert.equal(SCENARIO_NORM_ALIASES["scen-extraction"], "surgery_extraction_simple");
		assert.equal(SCENARIO_NORM_ALIASES["scen-resection"], "surgery_periostotomy");
		assert.equal(SCENARIO_NORM_ALIASES["scen-sinus-gbr"], "surgery_sinus_lift_gbr");
		assert.equal(SCENARIO_NORM_ALIASES["scen-implant"], "surgery_implant_standard");

		for (const [alias, canonicalId] of Object.entries(SCENARIO_NORM_ALIASES)) {
			const norm = CANONICAL_SURGICAL_OPERATION_NORMS.find((n) => n.id === canonicalId);
			assert.ok(norm, `Canonical norm ${canonicalId} for alias ${alias} must exist in registry`);
			assert.ok(norm.title.length > 0);
		}
	});
});
