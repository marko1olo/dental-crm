import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	createDefaultPassportRecord,
	parseImplantBarcode,
	parseStockDimensions,
	getBoneDensityByToothFdi,
	DEFAULT_CANONICAL_IMPLANT_STOCK,
	DEFAULT_CANONICAL_CONSUMABLES,
} from "../implantQuickPresets";
import { IMPLANT_TORQUE_SPECS } from "../implantTorqueCatalog";
import { ImplantPassportCard, AnatomicalJawArchSchema } from "../ImplantPassportCard";
import { ImplantPassportModal } from "../ImplantPassportModal";
import { ImplantProtocolTab } from "../ImplantProtocolTab";
import { ImplantEconomicsSection } from "../ImplantEconomicsSection";
import { ImplantConsumablesSelector } from "../ImplantConsumablesSelector";
import { ImplantWarehouseSelector } from "../ImplantWarehouseSelector";

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

	it("19. parseStockDimensions extracts diameter, length, and brand from warehouse nomenclature", () => {
		const osstem = parseStockDimensions("Имплантат Osstem TS III SA Ø4.0x10мм");
		assert.equal(osstem.brand, "Osstem");
		assert.equal(osstem.diameterMm, 4.0);
		assert.equal(osstem.lengthMm, 10.0);

		const nobel = parseStockDimensions("Имплантат Nobel Biocare Parallel CC Ø4.3x11.5мм");
		assert.equal(nobel.brand, "Nobel Biocare");
		assert.equal(nobel.diameterMm, 4.3);
		assert.equal(nobel.lengthMm, 11.5);

		const straumann = parseStockDimensions("Имплантат Straumann BLX Roxolid SLActive Ø3.5x10мм");
		assert.equal(straumann.brand, "Straumann");
		assert.equal(straumann.diameterMm, 3.5);
		assert.equal(straumann.lengthMm, 10.0);

		const dentium = parseStockDimensions("Имплантат Dentium SuperLine SLA Ø4.5x10мм");
		assert.equal(dentium.brand, "Dentium");
		assert.equal(dentium.diameterMm, 4.5);
		assert.equal(dentium.lengthMm, 10.0);

		const empty = parseStockDimensions("");
		assert.deepEqual(empty, {});
	});

	it("20. DEFAULT_CANONICAL_IMPLANT_STOCK contains standard sizes across major implant brands", () => {
		assert.ok(DEFAULT_CANONICAL_IMPLANT_STOCK.length >= 8, "Stock must have at least 8 items");

		const brands = DEFAULT_CANONICAL_IMPLANT_STOCK.map((item) => parseStockDimensions(item.name).brand);
		assert.ok(brands.includes("Osstem"), "Must have Osstem stock");
		assert.ok(brands.includes("Dentium"), "Must have Dentium stock");
		assert.ok(brands.includes("Straumann"), "Must have Straumann stock");
		assert.ok(brands.includes("Nobel Biocare"), "Must have Nobel Biocare stock");

		// All items must have LOT, expiration date, SKU, and unitCostRub
		for (const item of DEFAULT_CANONICAL_IMPLANT_STOCK) {
			assert.ok(item.lotNumber, `Item ${item.name} must have LOT`);
			assert.ok(item.expirationDate, `Item ${item.name} must have expirationDate`);
			assert.ok(item.sku, `Item ${item.name} must have SKU`);
			assert.ok(Number(item.unitCostRub) > 0, `Item ${item.name} must have positive cost`);
		}
	});

	it("21. ImplantProtocolTab renders 1-click standard surgical protocol preset banner", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("banner-standard-protocol-preset"), "Must render standard protocol preset banner");
		assert.ok(html.includes("btn-apply-standard-protocol"), "Must render 1-click standard protocol button");
		assert.ok(html.includes("Стандартный хирургический протокол"), "Must show protocol name");
		assert.ok(html.includes("1 клик"), "Must highlight 1-click speed");
		assert.ok(html.includes("NaCl 0.9%"), "Must specify saline cooling");
		assert.ok(html.includes("Викрил 4-0"), "Must specify suture material");
	});

	it("22. ImplantProtocolTab renders tactile quick torque buttons for gloved operation", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
			/>,
		);

		assert.ok(html.includes("btn-quick-torque-15"), "Must have 15 N*cm button");
		assert.ok(html.includes("btn-quick-torque-25"), "Must have 25 N*cm button");
		assert.ok(html.includes("btn-quick-torque-35"), "Must have 35 N*cm button");
		assert.ok(html.includes("btn-quick-torque-45"), "Must have 45 N*cm button");
		assert.ok(html.includes("btn-quick-torque-50"), "Must have 50 N*cm button");
	});

	it("23. AnatomicalJawArchSchema renders full 32 teeth dental formula with highlighted implant site", () => {
		const html = renderToString(<AnatomicalJawArchSchema selectedFdi={46} brand="Osstem" diameterMm={4.0} lengthMm={10.0} />);

		assert.ok(html.includes("anatomical-jaw-arch"), "Must render container");
		assert.ok(html.includes("ВЕРХНЯЯ ЧЕЛЮСТЬ (MAXILLA)"), "Must show maxilla label");
		assert.ok(html.includes("НИЖНЯЯ ЧЕЛЮСТЬ (MANDIBULA)"), "Must show mandibula label");
		assert.ok(html.includes("ПРАВО (R)"), "Must show right side marker");
		assert.ok(html.includes("ЛЕВО (L)"), "Must show left side marker");
		assert.ok(html.includes("Имплантат #46"), "Must show highlighted tooth badge");
		assert.ok(html.includes("Ø4.0×10мм") || html.includes("4.0"), "Must show dimensions in schema");
	});

	it("24. ImplantPassportCard renders messenger sharing buttons for WhatsApp and Telegram", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 46,
			brand: "Osstem",
			patientName: "Алексеев Д. М.",
		});

		const html = renderToString(<ImplantPassportCard data={record} />);

		assert.ok(html.includes("btn-share-whatsapp"), "Must have WhatsApp share button");
		assert.ok(html.includes("btn-share-telegram"), "Must have Telegram share button");
		assert.ok(html.includes("anatomical-jaw-arch"), "Card must include anatomical jaw arch");
	});

	it("25. ImplantEconomicsSection renders transparent financial breakdown for solo surgeon", () => {
		const html = renderToString(
			<ImplantEconomicsSection
				operationPriceRub={45000}
				implantCostRub={12500}
				consumablesCostRub={4500}
				doctorGrossMarginRub={28000}
			/>,
		);

		assert.ok(html.includes("doctor-economics-block"), "Must render economics container");
		assert.ok(html.includes("input-operation-price"), "Must render operation price input");
		assert.ok(html.includes("45000"), "Must show operation price");
		assert.ok(/12[\s\u00a0\u202f]?500/.test(html), "Must show fixture cost");
		assert.ok(/4[\s\u00a0\u202f]?500/.test(html), "Must show consumables cost");
		assert.ok(html.includes("doctor-net-margin"), "Must render doctor net margin element");
		assert.ok(/28[\s\u00a0\u202f]?000/.test(html), "Must show doctor net income");
		assert.ok(html.includes("Без сетевых поборов"), "Must emphasize solo doctor autonomy (Mandate 8n)");
	});

	it("26. ImplantConsumablesSelector renders bone graft, membrane and suture selection when GBR is performed and hides when not performed", () => {
		const hiddenHtml = renderToString(
			<ImplantConsumablesSelector
				isGbrPerformed={false}
				stockConsumables={DEFAULT_CANONICAL_CONSUMABLES}
			/>,
		);
		assert.equal(hiddenHtml, "", "Must return empty string when GBR is not performed");

		const activeHtml = renderToString(
			<ImplantConsumablesSelector
				isGbrPerformed={true}
				stockConsumables={DEFAULT_CANONICAL_CONSUMABLES}
				selectedGraftId="inv-bio-oss-05"
				selectedMembraneId="inv-bio-gide-1622"
				selectedSutureId="inv-vicryl-40"
			/>,
		);
		assert.ok(activeHtml.includes("gbr-consumables-block"), "Must render GBR consumables container");
		assert.ok(activeHtml.includes("select-graft-material"), "Must have graft material selector");
		assert.ok(activeHtml.includes("select-membrane-material"), "Must have membrane selector");
		assert.ok(activeHtml.includes("select-suture-material"), "Must have suture selector");
		assert.ok(activeHtml.includes("Geistlich Bio-Oss"), "Must list Bio-Oss bone graft");
		assert.ok(activeHtml.includes("Geistlich Bio-Gide"), "Must list Bio-Gide membrane");
		assert.ok(activeHtml.includes("Викрил 4-0"), "Must list Vicryl suture");
	});

	it("27. ImplantWarehouseSelector renders available inventory batches with stock counts and LOT numbers", () => {
		const html = renderToString(
			<ImplantWarehouseSelector
				stockItems={DEFAULT_CANONICAL_IMPLANT_STOCK}
				selectedStockItemId="inv-oss-4010"
				lotNumber="24C1208"
				catalogArticle="TS3S4010S"
			/>,
		);

		assert.ok(html.includes("Партия со склада клиники"), "Must show warehouse stock title");
		assert.ok(html.includes("stock-item-inv-oss-4010"), "Must render Osstem stock button");
		assert.ok(html.includes("stock-item-inv-strau-3510"), "Must render Straumann stock button");
		assert.ok(html.includes("stock-item-inv-nobel-4311"), "Must render Nobel stock button");
		assert.ok(html.includes("LOT: 24C1208"), "Must show LOT number");
		assert.ok(html.includes("шт."), "Must show stock quantity units");
	});

	it("28. 1-click express surgical protocol defaults to 4.0x10 mm size, Misch bone density, and 35 N*cm torque", () => {
		const record = createDefaultPassportRecord({
			toothFdi: 46,
			brand: "Osstem",
		});

		assert.equal(record.diameterMm, 4.0, "Express standard diameter must be 4.0 mm");
		assert.equal(record.lengthMm, 10.0, "Express standard length must be 10.0 mm");
		assert.equal(record.torqueNcm, 35, "Express standard torque must be 35 N*cm");
		assert.equal(record.boneDensity, "D2", "Tooth 46 must default to D2 density");
		assert.equal(record.capType, "fdm", "Default cap type must be FDM");
		assert.equal(record.isqDay0, 72, "Default ISQ stability must be 72");
	});

	it("29. ImplantProtocolTab renders 4 distinct 1-click clinical protocol presets", () => {
		const html = renderToString(
			<ImplantProtocolTab
				toothFdi={46}
				handleToothSelect={() => {}}
				boneDensity="D2"
				setBoneDensity={() => {}}
				scannedBarcode=""
				setScannedBarcode={() => {}}
				handleApplyBarcode={() => {}}
				isGbrPerformed={false}
				setIsGbrPerformed={() => {}}
				capType="fdm"
				setCapType={() => {}}
				isIsqEnabled={false}
				setIsIsqEnabled={() => {}}
				selectedBrand="Osstem"
				handleBrandSelect={() => {}}
				diameterMm={4.0}
				setDiameterMm={() => {}}
				lengthMm={10.0}
				setLengthMm={() => {}}
				torqueNcm={35}
				setTorqueNcm={() => {}}
				lotNumber="24C1208"
				setLotNumber={() => {}}
				catalogArticle="TS3S4010S"
				setCatalogArticle={() => {}}
				serialNumber="SN-884210"
				setSerialNumber={() => {}}
				isOverdraftActive={false}
			/>,
		);

		assert.ok(html.includes("btn-apply-standard-protocol"), "Must have standard protocol preset");
		assert.ok(html.includes("btn-apply-immediate-protocol"), "Must have immediate loading protocol preset");
		assert.ok(html.includes("btn-apply-twostage-protocol"), "Must have two-stage cover screw protocol preset");
		assert.ok(html.includes("btn-apply-gbr-protocol"), "Must have GBR bone grafting protocol preset");
		assert.ok(html.includes("Немедленная нагрузка"), "Must show immediate loading text");
		assert.ok(html.includes("Двухэтапная заглушка"), "Must show two-stage text");
		assert.ok(html.includes("Костная пластика (НКР)"), "Must show GBR text");
	});

	it("30. ImplantIsqControls supports 1..100 scale and 1-click norm preset button 72", () => {
		const html = renderToString(
			<ImplantPassportModal
				isOpen={true}
				onClose={() => {}}
				initialTooth={46}
				initialTab="isq"
			/>,
		);

		assert.ok(html.includes('min="1"'), "Must allow min ISQ = 1");
		assert.ok(html.includes('max="100"'), "Must allow max ISQ = 100");
		assert.ok(html.includes("btn-isq-preset-72"), "Must render 1-click norm preset button for ISQ 72");
		assert.ok(html.includes("Норма ISQ 72 (Оптимум)"), "Must render norm ISQ text");
	});

	it("31. GBR bone grafting protocol and passport reflect Bio-Oss and Bio-Gide without emojis", () => {
		const data = {
			...createDefaultPassportRecord({
				toothFdi: 36,
				brand: "Straumann",
				patientName: "Александров К. В.",
			}),
			boneGraftMaterial: "Костный графт Geistlich Bio-Oss",
			membraneUsed: "Коллагеновая мембрана Geistlich Bio-Gide",
			sutureMaterial: "Шовный материал Ethicon Викрил 4-0",
		};

		const html = renderToString(<ImplantPassportCard data={data} />);
		assert.ok(html.includes("Straumann"), "Must show Straumann");
		assert.ok(html.includes("Паспорт имплантата DENTE"), "Must render title");
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(html), false, "Must contain zero emojis");
	});
});
