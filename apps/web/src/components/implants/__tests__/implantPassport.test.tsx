import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	FAST_IMPLANT_SYSTEM_PRESETS,
	createDefaultPassportRecord,
} from "../implantQuickPresets";
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
		assert.ok(html.includes("В карту 043/у"), "Must render primary Insert into 043/u button");

		// Count direct action buttons in footer
		const footerMatch = html.match(/<footer class="implant-passport-actions"[^>]*>([\s\S]*?)<\/footer>/);
		assert.ok(footerMatch, "Must have footer");
		const buttonCount = (footerMatch[1].match(/<button/g) || []).length;
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
});
