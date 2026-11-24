import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSurgeryMaterials } from "../../services/treatmentConsumables/surgeryWriteoff/surgeryMaterialBuilder.js";

describe("surgeryMaterialBuilder — Precision Graft & Membrane Deduction (SEV-2)", () => {
	it("does NOT deduct barrier membrane when membrane is 'none' or 'Без мембраны'", () => {
		const materials = buildSurgeryMaterials({
			category: "sinus_gbr",
			graft: "Bio-Oss 0.5г",
			membrane: "none",
		});

		const membrane = materials.find((m) => m.category === "Костная пластика" && m.patterns.includes("bio-gide"));
		assert.equal(membrane, undefined, "Bio-Gide membrane must NOT be deducted when membrane is 'none'");

		const graft = materials.find((m) => m.defaultName.includes("Bio-Oss"));
		assert.ok(graft, "Bio-Oss graft should be present");
	});

	it("does NOT deduct membrane for closed sinus lift when membrane is not specified", () => {
		const materials = buildSurgeryMaterials({
			category: "sinus_gbr",
			protocolId: "surgery_sinus_lift_closed",
			graft: "Bio-Oss 0.5г",
		});

		const membrane = materials.find((m) => m.defaultName.includes("Bio-Gide") || m.defaultName.includes("Мембрана"));
		assert.equal(membrane, undefined, "Membrane should not be deducted for closed sinus lift by default");
	});

	it("deducts Cerabone when graft is 'Cerabone 0.5 г'", () => {
		const materials = buildSurgeryMaterials({
			category: "sinus_gbr",
			graft: "Cerabone 0.5 г (Ксенографт)",
			membrane: "Bio-Gide 25x25 мм",
		});

		const cerabone = materials.find((m) => m.defaultName.includes("Cerabone"));
		assert.ok(cerabone, "Cerabone must be deducted");
		assert.equal(cerabone?.defaultCost, "7800.00");

		const bioOss = materials.find((m) => m.defaultName.includes("Bio-Oss"));
		assert.equal(bioOss, undefined, "Bio-Oss must NOT be deducted when Cerabone is chosen");
	});

	it("deducts SureOss allograft when graft is 'SureOss'", () => {
		const materials = buildSurgeryMaterials({
			category: "sinus_gbr",
			graft: "SureOss (Аллографт)",
			membrane: "Без мембраны",
		});

		const sureoss = materials.find((m) => m.defaultName.includes("SureOss"));
		assert.ok(sureoss, "SureOss must be deducted");
		assert.equal(sureoss?.defaultCost, "8900.00");

		const membrane = materials.find((m) => m.defaultName.includes("Мембрана") || m.defaultName.includes("Bio-Gide"));
		assert.equal(membrane, undefined, "Membrane must NOT be deducted when 'Без мембраны'");
	});

	it("deducts bone scraper when graft is 'Аутокость'", () => {
		const materials = buildSurgeryMaterials({
			category: "sinus_gbr",
			graft: "Аутокость (костный скребок)",
			membrane: "none",
		});

		const scraper = materials.find((m) => m.defaultName.includes("костный скребок"));
		assert.ok(scraper, "Bone scraper must be deducted for autograft");
	});

	it("deducts Jason pericardial membrane when selected", () => {
		const materials = buildSurgeryMaterials({
			category: "sinus_gbr",
			graft: "Bio-Oss 0.5г",
			membrane: "Jason мембрана",
			hasPins: true,
		});

		const jason = materials.find((m) => m.defaultName.includes("Jason"));
		assert.ok(jason, "Jason membrane must be deducted");
		assert.equal(jason?.defaultCost, "11200.00");

		const pins = materials.find((m) => m.defaultName.includes("Пины титановые"));
		assert.ok(pins, "Pins should be present when hasPins is true");
	});

	it("deducts Prolene 6-0 and blade #15C for mucogingival perio surgery (CTG)", () => {
		const materials = buildSurgeryMaterials({
			category: "perio_surgery",
			protocolId: "surgery_mucogingival_ctg",
			sutureMaterial: "Prolene 6-0",
		});

		const suture = materials.find((m) => m.defaultName.includes("Prolene 6-0"));
		assert.ok(suture, "Prolene 6-0 micro-suture must be present");

		const blade = materials.find((m) => m.defaultName.includes("#15C"));
		assert.ok(blade, "Micro-surgical blade #15C must be present for CTG");
	});

	it("deducts rubber drainage strip for emergency periostotomy", () => {
		const materials = buildSurgeryMaterials({
			category: "emergency",
			protocolId: "surgery_periostotomy",
		});

		const drainage = materials.find((m) => m.defaultName.includes("Резиновый ленточный выпускник"));
		assert.ok(drainage, "Rubber drainage must be present for emergency periostotomy");
	});

	it("does NOT deduct sutures or Alveogyl for simple forceps extraction with tampons (SEV-1.3, SEV-2.3)", () => {
		const materials = buildSurgeryMaterials({
			category: "extraction",
			protocolId: "surgery_extraction_simple",
			hemostatics: ["tampon"],
		});

		const suture = materials.find((m) => m.category === "Шовный материал");
		assert.equal(suture, undefined, "Simple extraction without suture options must NOT deduct suture");

		const alvogyl = materials.find((m) => m.patterns.includes("альвожил"));
		assert.equal(alvogyl, undefined, "Tampon hemostasis must NOT deduct Alveogyl");

		const tampon = materials.find((m) => m.defaultName.includes("Марлевые тампоны"));
		assert.ok(tampon, "Sterile tampons must be deducted");
	});

	it("deducts Parasorb Cone and sutures for socket preservation (SEV-2.1)", () => {
		const materials = buildSurgeryMaterials({
			category: "extraction",
			protocolId: "surgery_socket_preservation",
		});

		const cone = materials.find((m) => m.defaultName.includes("Parasorb Cone"));
		assert.ok(cone, "Parasorb Cone must be deducted for socket preservation");
		assert.equal(cone?.defaultCost, "1600.00");

		const suture = materials.find((m) => m.category === "Шовный материал");
		assert.ok(suture, "Suture must be deducted for socket preservation");
	});

	it("deducts Alveogyl paste for alveolitis curettage (SEV-2.1)", () => {
		const materials = buildSurgeryMaterials({
			category: "emergency",
			protocolId: "surgery_alveolitis_curettage",
		});

		const alvogyl = materials.find((m) => m.defaultName.includes("Альвожил"));
		assert.ok(alvogyl, "Alveogyl paste must be deducted for alveolitis curettage");
		assert.equal(alvogyl?.defaultCost, "280.00");
	});
});
