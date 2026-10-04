import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	createDefaultPassportRecord,
	parseImplantBarcode,
	getBoneDensityByToothFdi,
} from "../implantQuickPresets";
import { IMPLANT_TORQUE_SPECS } from "../implantTorqueCatalog";
import { ImplantPassportCard } from "../ImplantPassportCard";
import { ImplantPassportModal } from "../ImplantPassportModal";

describe("Implant Passport Module & Zero-Bureaucracy Cockpit", () => {
	it("1. Preset catalog contains standard systems with 35 N/cm default torque", () => {
		const brands = FAST_IMPLANT_SYSTEM_PRESETS.map((p) => p.brand);
		assert.ok(brands.includes("Osstem"), "Must have Osstem");
		assert.ok(brands.includes("Straumann"), "Must have Straumann");
		assert.ok(brands.includes("Nobel Biocare"), "Must have Nobel Biocare");
		assert.ok(brands.includes("Dentium"), "Must have Dentium");

		for (const preset of FAST_IMPLANT_SYSTEM_PRESETS) {
			assert.equal(preset.defaultTorqueNcm, 35, `Preset ${preset.brand} must default to 35 N/cm`);
			assert.ok(preset.defaultDiameterMm >= 3.5, `Preset ${preset.brand} diameter valid`);
			assert.ok(preset.defaultLengthMm >= 8.0, `Preset ${preset.brand} length valid`);
		}
	});

	it("2. createDefaultPassportRecord builds valid passport data without blocking fields", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 46,
			brand: "Osstem",
			patientName: "Сидоров А. В.",
			patientId: "PAT-001",
			doctorName: "Др. Громов",
		});

		assert.equal(record.toothFdi, 46);
		assert.equal(record.brand, "Osstem");
		assert.equal(record.torqueNcm, 35);
		assert.ok(record.lotNumber.includes("LOT-"));
		assert.ok(record.serialNumber.includes("SN-"));
		assert.equal(record.patientName, "Сидоров А. В.");
	});

	it("3. ImplantPassportCard renders complete clinical passport view", () => {
		const data = createDefaultPassportRecord({
			toothFdi: 46,
			brand: "Osstem",
			patientName: "Сидоров А. В.",
		});

		const html = renderToString(<ImplantPassportCard data={data} />);

		assert.ok(html.includes("Паспорт имплантата DENTE"));
		assert.ok(html.includes("46"), "Must show FDI tooth number");
		assert.ok(html.includes("Osstem"), "Must show brand");
		assert.ok(html.includes("35 Н·см") || html.includes("35 Н/см"), "Must show 35 N*cm torque");
		assert.ok(html.includes("Сидоров А. В."), "Must show patient name");
		assert.ok(html.includes("btn-copy-passport-card"), "Must have copy button");
	});

	it("4. ImplantPassportModal renders without certificate blocks and with soft overdraft", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
				patientName="Сидоров А. В."
			/>,
		);

		assert.ok(html.includes("implant-passport-modal"), "Must render modal container");
		assert.ok(html.includes("Паспорт дентального имплантата"), "Must show title");
		assert.ok(html.includes("46"), "Must show tooth number");
		assert.ok(html.includes("btn-system-Osstem"), "Must have Osstem system button");
		assert.ok(html.includes("btn-system-Straumann"), "Must have Straumann system button");
		assert.ok(html.includes("select-diameter"), "Must have diameter selector");
		assert.ok(html.includes("select-length"), "Must have length selector");
		assert.ok(html.includes("select-torque"), "Must have torque selector");
		assert.ok(html.includes("btn-save-implant-passport"), "Must have Save passport button");
		assert.ok(html.includes("btn-passport-insert-diary"), "Must have Insert into diary button");

		// Zero-bureaucracy law: NO mandatory certificate block or disabled buttons
		assert.ok(!html.includes("disabled"), "Action buttons must NOT be disabled");
	});

	it("5. ImplantPassportModal returns empty string when isOpen is false", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={false}
				onClose={() => {}}
			/>,
		);

		assert.equal(html, "");
	});

	it("6. Fast implant presets include capType, ISQ 72, and top 4 implant brands", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 36,
			brand: "Dentium",
			patientName: "Иванов И. И.",
		});

		assert.equal(record.isqDay0, 72, "Default ISQ must be 72");
		assert.equal(record.torqueNcm, 35, "Default torque must be 35 N/cm");
		assert.equal(record.capType, "fdm", "Default capType must be fdm (формирователь десны)");

		const systems = FAST_IMPLANT_SYSTEM_PRESETS.map((s) => s.brand);
		assert.deepEqual(
			systems.slice(0, 4),
			["Osstem", "Dentium", "Straumann", "Nobel Biocare"],
			"Top 4 brands must be Osstem, Dentium, Straumann, Nobel Biocare",
		);
	});

	it("7. ImplantPassportModal renders capType toggle buttons and min-h-[48px] touch targets", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={36}
				patientName="Иванов И. И."
			/>,
		);

		assert.ok(html.includes("btn-cap-type-fdm"), "Must have ФДМ toggle button");
		assert.ok(html.includes("btn-cap-type-plug"), "Must have Заглушка toggle button");
		assert.ok(html.includes("min-h-[48px]"), "Must enforce >= 48px touch targets for gloved operation");
		assert.ok(html.includes("ISQ"), "Must display ISQ field");
		assert.ok(html.includes("72"), "Must show default ISQ value 72");

		// Zero emojis in ImplantPassportModal
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "ImplantPassportModal must not contain emojis");
	});

	it("8. ImplantPassportCard renders capType, ISQ 72, and zero emojis", () => {
		const record = {
			...createDefaultPassportRecord({
				toothFdi: 46,
				brand: "Straumann",
				patientName: "Сидоров А. В.",
				capType: "plug",
				isqDay0: 74,
			}),
			isWarehouseOverdraft: true,
		};

		const html = renderToString(<ImplantPassportCard data={record} />);

		assert.ok(html.includes("Винт-заглушка (2 этапа)"), "Must render plug cap type");
		assert.ok(html.includes("74"), "Must render ISQ value");
		assert.ok(html.includes("min-h-[48px]"), "Must have 48px action buttons");

		// Verify zero emoji in ImplantPassportCard (specifically AlertTriangle SVG icon instead of raw emoji warning)
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "ImplantPassportCard must not contain emojis");
		assert.ok(
			html.includes("lucide-triangle-alert") || html.includes("lucide-alert-triangle"),
			"Must render Lucide AlertTriangle vector icon",
		);
		assert.ok(html.includes("мягкий овердрафт склада"), "Must display soft overdraft notice");
	});

	it("9. ImplantPassportModal renders compact brand toolbar per Hick's Law (1 row 32-36px)", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("implant-brand-toolbar"), "Must render 1-row brand toolbar");
		assert.ok(html.includes("implant-system-pill"), "Must use compact system pills");
		assert.ok(html.includes('role="toolbar"'), "Must have accessible role toolbar");
	});

	it("10. ImplantPassportModal enforces Miller's Law (<= 2 action buttons in footer)", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("implant-passport-actions"), "Must render footer action bar");
		assert.ok(html.includes("Печать паспорта"), "Must render primary Print passport button");
		assert.ok(html.includes("В дневник приёма"), "Must render primary Insert into diary button");
		assert.ok(!html.includes("043/у"), "Must NOT contain Soviet Form 043/u bird language (Mandate 8x/8y)");

		// Count direct action buttons in footer
		const footerMatch = html.match(/<footer class="implant-passport-actions"[^>]*>([\s\S]*?)<\/footer>/);
		assert.ok(footerMatch, "Must have footer");
		const footerHtml = String(footerMatch?.[1] ?? "");
		const buttonCount = (footerHtml.match(/<button/g) || []).length;
		assert.ok(buttonCount <= 2, `Footer must have at most 2 action buttons (Miller's Law), found ${buttonCount}`);
	});

	it("11. ImplantPassportCard renders QR-code verification and min-w-0 truncation", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 21,
			brand: "Nobel Biocare",
			patientName: "Константинопольский-Длиннофамильный Александр Владимирович",
			doctorId: "DOC-SURG-77",
		});

		const html = renderToString(<ImplantPassportCard data={record} />);

		assert.ok(html.includes("passport-qr-verification"), "Must render QR-code verification block");
		assert.ok(html.includes("QR VERIFIED"), "Must show QR VERIFIED indicator");
		assert.ok(html.includes("truncate"), "Must use truncate class for safe overflow");
		assert.ok(html.includes("min-w-0"), "Must use min-w-0 class for grid child containment");
	});

	it("12. createDefaultPassportRecord supports doctorId and custom articles", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 14,
			brand: "Dentium",
			doctorId: "DOC-IMPL-007",
			catalogArticle: "FX4010",
		});

		assert.equal(record.doctorId, "DOC-IMPL-007");
		assert.equal(record.catalogArticle, "FX4010");
		assert.equal(record.toothFdi, 14);
	});

	it("13. Ankylos system preset and torque specifications are canonical and accurate", () => {
		const ankylos = FAST_IMPLANT_SYSTEM_PRESETS.find((p) => p.brand === "Ankylos");
		assert.ok(ankylos, "Ankylos must be present in FAST_IMPLANT_SYSTEM_PRESETS");
		assert.equal(ankylos.model, "C/X TissueCare");
		assert.equal(ankylos.defaultDiameterMm, 4.5);
		assert.equal(ankylos.defaultLengthMm, 11.0);
		assert.equal(ankylos.defaultTorqueNcm, 35);

		const torqueSpec = IMPLANT_TORQUE_SPECS.ankylos;
		assert.ok(torqueSpec, "Ankylos must have factory torque specification in IMPLANT_TORQUE_SPECS");
		assert.ok(torqueSpec.screwdriverDefault.includes("Hex 1.0 mm"));
		assert.equal(torqueSpec.torqueFinalScrewNcm, 15);
		assert.ok(torqueSpec.connectionSafetyNotes.includes("конус Морзе 5.7°"));
		assert.ok(torqueSpec.connectionSafetyNotes.includes("холодной сварки"));
	});

	it("14. parseImplantBarcode parses GS1 DataMatrix (01/10/21) and delimited barcodes", () => {
		const gs1 = parseImplantBarcode("(01)04012345678901(10)LOT-2026-AK(21)SN-998877");
		assert.equal(gs1.article, "REF-678901");
		assert.equal(gs1.lot, "LOT-2026-AK");
		assert.equal(gs1.serial, "SN-998877");

		const slash = parseImplantBarcode("A-B110-CX / LOT-ANK-001 / SN-1234");
		assert.equal(slash.article, "A-B110-CX");
		assert.equal(slash.lot, "LOT-ANK-001");
		assert.equal(slash.serial, "SN-1234");

		const empty = parseImplantBarcode("");
		assert.equal(empty.rawBarcode, "");
		assert.equal(empty.article, undefined);
	});

	it("15. getBoneDensityByToothFdi determines anatomical Misch bone density (D1..D4)", () => {
		assert.equal(getBoneDensityByToothFdi(41), "D1", "Lower anterior teeth must be D1 dense bone");
		assert.equal(getBoneDensityByToothFdi(46), "D2", "Lower posterior teeth must be D2");
		assert.equal(getBoneDensityByToothFdi(21), "D3", "Upper anterior/premolar teeth must be D3");
		assert.equal(getBoneDensityByToothFdi(17), "D4", "Upper tuberosity/second molar must be D4 soft bone");
		assert.equal(getBoneDensityByToothFdi(28), "D4", "Upper third molar must be D4");
	});

	it("16. ImplantPassportModal renders interactive tooth selector, barcode scanner, and Ankylos", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("btn-system-Ankylos"), "Must render Ankylos system button");
		assert.ok(html.includes("select-tooth-fdi"), "Must render FDI tooth dropdown");
		assert.ok(html.includes("input-tooth-fdi"), "Must render FDI tooth number input");
		assert.ok(html.includes("btn-quick-tooth-16"), "Must render quick tooth button #16");
		assert.ok(html.includes("btn-quick-tooth-46"), "Must render quick tooth button #46");
		assert.ok(html.includes("input-barcode-scanner"), "Must render packaging barcode scanner input");
		assert.ok(html.includes("btn-scan-barcode"), "Must render barcode scan button");
	});

	it("17. ImplantPassportModal renders interactive ISQ controls and clinical interpretation", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
				initialTab="isq"
			/>,
		);

		assert.ok(html.includes("input-isq-day0"), "Must render numeric ISQ Day 0 input");
		assert.ok(html.includes("slider-isq-day0"), "Must render ISQ range slider");
		assert.ok(html.includes("btn-isq-preset-55"), "Must render ISQ 55 preset button");
		assert.ok(html.includes("btn-isq-preset-68"), "Must render ISQ 68 preset button");
		assert.ok(html.includes("btn-isq-preset-75"), "Must render ISQ 75 preset button");
		assert.ok(html.includes("isq-interpretation-badge"), "Must render clinical interpretation badge");
	});

	it("18. ImplantPassportCard renders printable patient warranty certificate with barcode and blister sticker area", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 36,
			brand: "Ankylos",
			patientName: "Кузнецов П. В.",
			patientId: "PAT-0099",
			doctorName: "Др. Васильев",
			catalogArticle: "A-B110-CX",
		});

		const html = renderToString(<ImplantPassportCard data={record} />);

		assert.ok(html.includes("passport-barcode-svg"), "Must render vector SVG barcode");
		assert.ok(html.includes("Место для наклейки со стерильной упаковки"), "Must render dedicated blister sticker frame");
		assert.ok(html.includes("Гарантийные обязательства клиники"), "Must render official warranty clause");
		assert.ok(html.includes("Подпись хирурга-имплантолога"), "Must render surgeon signature block");
		assert.ok(html.includes("Подпись пациента"), "Must render patient signature block");
		assert.ok(html.includes("М.П."), "Must render clinic official stamp placeholder");
		assert.ok(html.includes("36 — Первый моляр нижней челюсти слева"), "Must render anatomical tooth description");
	});
});
