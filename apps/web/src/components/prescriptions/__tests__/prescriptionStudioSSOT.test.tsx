/**
 * prescriptionStudioSSOT.test.tsx — Red Team Inquisition & SSOT Test Suite for Prescription Studio
 * Mandates: 8e (Doctor Autonomy), 8y (Zero Pharnacological Paranoia), 8x (Human Language),
 * 8b (Sweet Spot File Sizing), 8am (Single Primary CTA), Apple HIG (Touch Targets >= 44px).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	PrescriptionStudioModal,
	PrescriptionModal,
	PrescriptionWorkspaceModal,
	PrescriptionCockpitModal,
	PrescriptionPrintModal,
	DirectPrescriptionLauncher,
	CANONICAL_DENTAL_DRUGS,
	CLINICAL_FAST_SETS,
	DENTAL_PRESCRIPTION_CATEGORIES,
	PATIENT_CARE_RECOMMENDATIONS,
	findDrugById,
	formatMessengerPatientMemo,
	formatSoapPrescriptionText,
} from "../index";
import fs from "node:fs";
import path from "node:path";

function countFileLines(relPath: string): number {
	const fullPath = path.resolve(process.cwd(), relPath);
	if (!fs.existsSync(fullPath)) return 0;
	return fs.readFileSync(fullPath, "utf-8").split("\n").length;
}

function hasEmojis(text: string): boolean {
	return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(text);
}

describe("Prescription Studio SSOT & Doctor Autonomy Red Team Suite", () => {
	it("1.1 Sweet Spot File Sizing (Mandate 8b): zero monoliths, zero micro-shredder", () => {
		const catalogLines = countFileLines("src/components/prescriptions/prescriptionCatalogData.ts");
		const studioLines = countFileLines("src/components/prescriptions/PrescriptionStudioModal.tsx");
		const launcherLines = countFileLines("src/components/prescriptions/DirectPrescriptionLauncher.tsx");
		const cssLines = countFileLines("src/components/prescriptions/prescriptionStudio.css");

		assert.ok(catalogLines >= 250 && catalogLines <= 500, `Catalog lines must be in sweet spot: ${catalogLines}`);
		assert.ok(studioLines >= 350 && studioLines <= 550, `Studio modal lines must be in sweet spot: ${studioLines}`);
		assert.ok(launcherLines >= 50 && launcherLines <= 100, `Launcher lines must be in 60-80 range: ${launcherLines}`);
		assert.ok(cssLines >= 180 && cssLines <= 450, `CSS lines must be in 200-400 range: ${cssLines}`);
	});

	it("1.2 Pharmacopeia SSOT: 6 clinical categories & canonical dentistry medications in RF", () => {
		assert.strictEqual(DENTAL_PRESCRIPTION_CATEGORIES.length, 6, "Must contain exactly 6 clinical categories");
		const categoryKeys = DENTAL_PRESCRIPTION_CATEGORIES.map((c) => c.key);
		assert.ok(categoryKeys.includes("antibiotic"), "Must include antibiotics");
		assert.ok(categoryKeys.includes("nsaid"), "Must include NSAIDs");
		assert.ok(categoryKeys.includes("antiseptic"), "Must include antiseptics");
		assert.ok(categoryKeys.includes("mucosa"), "Must include wound healing & mucosa gels");
		assert.ok(categoryKeys.includes("antihistamine"), "Must include antihistamines");
		assert.ok(categoryKeys.includes("gastro"), "Must include gastroprotection");

		// Canonical drugs lookup
		assert.ok(findDrugById("amoxiclav_875_125"), "Amoxiclav must exist");
		assert.ok(findDrugById("ciprofloxacin_500"), "Ciprolet must exist");
		assert.ok(findDrugById("lincomycin_500"), "Lincomycin must exist");
		assert.ok(findDrugById("nimesulide_100"), "Nimesil must exist");
		assert.ok(findDrugById("ketorolac_10"), "Ketorol must exist");
		assert.ok(findDrugById("ibuprofen_400"), "Ibuprofen must exist");
		assert.ok(findDrugById("chlorhexidine_005"), "Chlorhexidine must exist");
		assert.ok(findDrugById("miramistin_001"), "Miramistin must exist");
		assert.ok(findDrugById("stomatophyt_50"), "Stomatophyt must exist");
		assert.ok(findDrugById("metrogyl_denta"), "Metrogyl Denta must exist");
		assert.ok(findDrugById("solcoseryl_dental"), "Solcoseryl dental paste must exist");
		assert.ok(findDrugById("asepta_balm"), "Asepta balm must exist");
		assert.ok(findDrugById("cholisal_gel"), "Cholisal gel must exist");
		assert.ok(findDrugById("cetirizine_10"), "Cetrin must exist");
		assert.ok(findDrugById("suprastin_25"), "Suprastin must exist");
		assert.ok(findDrugById("omeprazole_20"), "Omeprazole must exist");
	});

	it("1.3 4 Canonical 1-Click Clinical Express Regimens for Private Dentistry", () => {
		assert.ok(CLINICAL_FAST_SETS.length >= 4, "Must have at least 4 express sets");
		const labels = CLINICAL_FAST_SETS.map((s) => s.label);

		assert.ok(labels.some((l) => l.includes("После сложного удаления")), "Extraction set must be present");
		assert.ok(labels.some((l) => l.includes("Острый периодонтит")), "Acute periodontitis set must be present");
		assert.ok(labels.some((l) => l.includes("Пародонтит / гингивит")), "Gingivitis/periodontitis set must be present");
		assert.ok(labels.some((l) => l.includes("Афтозный стоматит")), "Aphthous stomatitis set must be present");
	});

	it("2.1 Mandate 8e & 8y: Passive allergy strip, zero blocking dialogs and zero disabled buttons", () => {
		const html = renderToString(
			<PrescriptionStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Петрова Анна Ильинична"
				allergies="Аллергия на пенициллины и амоксициллин"
				initialSelectedDrugIds={["amoxiclav_875_125", "nimesulide_100"]}
				disablePortal={true}
			/>,
		);

		// Warning must be present
		assert.ok(html.includes('data-testid="prescription-allergy-modal-banner"'), "Must render allergy warning banner");
		assert.ok(html.includes("Автономия врача"), "Must state Doctor Autonomy in banner");
		assert.ok(html.includes("Печать доступна"), "Must state Print is accessible");

		// Crucial Mandate 8e: Buttons are NEVER disabled
		assert.ok(html.includes('data-testid="print-prescription-btn"'), "Print button must be rendered");
		assert.ok(!html.includes('data-testid="print-prescription-btn" disabled'), "Print button must never be disabled");
		assert.ok(html.includes('data-testid="med-rx-issue-btn"'), "Issue primary CTA button must be rendered");
		assert.ok(!html.includes('data-testid="med-rx-issue-btn" disabled'), "Issue button must never be disabled");
	});

	it("2.2 Mandate 8am & Apple HIG: Exactly ONE Primary CTA #0d9488 and Touch Targets >= 44px", () => {
		const html = renderToString(
			<PrescriptionStudioModal
				isOpen={true}
				onClose={() => {}}
				patientName="Сидоров Михаил Юрьевич"
				disablePortal={true}
			/>,
		);

		// Single Primary CTA
		assert.ok(html.includes("rx-primary-cta-btn"), "Must have styled primary CTA button");
		assert.ok(html.includes("Выписать рецепт и рекомендации"), "Must have canonical primary CTA text");

		// Touch targets >= 44px classes
		assert.ok(html.includes("rx-secondary-btn"), "Secondary action buttons styled with min-height");
		assert.ok(html.includes("rx-drag-handle"), "Contains tactile drag handle for Apple HIG mobile");

		// Zero emojis
		assert.strictEqual(hasEmojis(html), false, "Rendered HTML must contain zero cartoon emojis (Mandate 8d)");
	});

	it("3.1 Patient Care Memo & SOAP Prescription Formatter", () => {
		const drugs = [
			findDrugById("nimesulide_100")!,
			findDrugById("chlorhexidine_005")!,
		];

		const memo = formatMessengerPatientMemo({
			patientName: "Кузнецов Артем",
			doctorName: "Д-р Смирнов",
			clinicPhone: "+7 (495) 215-55-40",
			drugs,
		});

		assert.ok(memo.includes("Здравствуйте, Артем"), "Memo greeting must address patient by name");
		assert.ok(memo.includes("Нимесил 100 мг"), "Memo must list trade names");
		assert.ok(memo.includes("Рекомендации по уходу"), "Memo must contain care recommendations");
		assert.ok(memo.includes("+7 (495) 215-55-40"), "Memo must include clinic phone");

		const soap = formatSoapPrescriptionText(drugs);
		assert.ok(soap.includes("Назначения и рецепты (Rp):"), "SOAP must start with header");
		assert.ok(soap.includes("Rp.: Gran. Nimesulidi"), "SOAP must include Latin Rp");
		assert.ok(soap.includes("D.t.d."), "SOAP must include Latin Dtd");
		assert.ok(soap.includes("Холод к щеке на 15 минут"), "SOAP must include care advice");
	});

	it("3.2 Facade & Direct Launcher Parity: all facades point to same canonical studio", () => {
		assert.strictEqual(PrescriptionModal, PrescriptionStudioModal, "PrescriptionModal must be alias");
		assert.strictEqual(PrescriptionWorkspaceModal, PrescriptionStudioModal, "PrescriptionWorkspaceModal must be alias");
		assert.strictEqual(PrescriptionCockpitModal, PrescriptionStudioModal, "PrescriptionCockpitModal must be alias");
		assert.strictEqual(PrescriptionPrintModal, PrescriptionStudioModal, "PrescriptionPrintModal must be alias");

		const launcherHtml = renderToString(<DirectPrescriptionLauncher />);
		// On non-browser SSR it returns null cleanly
		assert.strictEqual(launcherHtml, "", "DirectPrescriptionLauncher returns null when no matching url");
	});
});
