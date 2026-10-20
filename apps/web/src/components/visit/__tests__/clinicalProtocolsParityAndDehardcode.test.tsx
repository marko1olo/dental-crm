import assert from "node:assert/strict";
import { describe, it  } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ClinicalAllPresetsGrid } from "../presets/ClinicalAllPresetsGrid.js";
import { ClinicalQuickPresetsBar } from "../ClinicalQuickPresetsBar.js";
import { CLINICAL_SPECIALTY_SECTIONS } from "../clinicalSpecialtySections.js";
import { THERAPY_SOAP_PRESETS } from "../presets/therapyPresets.js";
import { CLINICAL_SOAP_PRESETS } from "../clinicalSoapPresets.js";

describe("Clinical Protocols Parity & De-hardcoded Materials Specification", () => {
	it("ClinicalAllPresetsGrid: renders unambiguous express preset chips and Ministry of Health registry link", () => {
		const html = renderToString(
			<ClinicalAllPresetsGrid
				currentTooth={16}
				onSelectPreset={() => {}}
				onOpenProtocolsCatalog={() => {}}
			/>,
		);

		// Strip SSR comments for clean text matching
		const cleanHtml = html.replace(/<!--.*?-->/g, "");

		// Category chip must say 'Все экспресс-шаблоны' instead of ambiguous 'Все шаблоны'
		assert.ok(
			cleanHtml.includes("Все экспресс-шаблоны"),
			"Must include 'Все экспресс-шаблоны' category chip",
		);

		// Counter must specify 'экспресс-шаблонов'
		assert.ok(
			cleanHtml.includes("экспресс-шаблонов"),
			"Must mention 'экспресс-шаблонов' in counter line",
		);
		assert.ok(
			cleanHtml.includes(`из ${CLINICAL_SOAP_PRESETS.length} экспресс-шаблонов`),
			`Must state total count as ${CLINICAL_SOAP_PRESETS.length} express presets`,
		);

		// Counter line must explain link to the full 1 142 protocols registry
		assert.ok(
			cleanHtml.includes("Полный поиск по 1 142 федеральным протоколам"),
			"Must reference the full 1 142 federal protocols",
		);
		assert.ok(
			cleanHtml.includes("Реестре Минздрава РФ"),
			"Must reference the Ministry of Health registry",
		);
		assert.ok(
			cleanHtml.includes('data-testid="btn-grid-link-protocols-catalog"'),
			"Must render data-testid='btn-grid-link-protocols-catalog' link button",
		);
	});

	it("ClinicalQuickPresetsBar: resolves 1142 vs 44/45 dissonance with distinct button titles and tab labels", () => {
		const html = renderToString(
			<ClinicalQuickPresetsBar
				activeTooth={16}
				onSelectPreset={() => {}}
				onOpenTemplatesModal={() => {}}
			/>,
		);
		const cleanHtml = html.replace(/<!--.*?-->/g, "");

		// Header button must clearly designate Ministry of Health Registry (1 142 protocols)
		assert.ok(
			cleanHtml.includes("Реестр протоколов (1 142)"),
			"Header button must say 'Реестр протоколов (1 142)'",
		);
		assert.ok(
			cleanHtml.includes('data-testid="btn-open-soap-templates-modal-bar"'),
			"Header button must keep data-testid='btn-open-soap-templates-modal-bar'",
		);

		// Segmented bar tab must say 'Экспресс-шаблоны SOAP (45)'
		assert.ok(
			cleanHtml.includes(`Экспресс-шаблоны SOAP (${CLINICAL_SOAP_PRESETS.length})`),
			`Segmented bar tab must say 'Экспресс-шаблоны SOAP (${CLINICAL_SOAP_PRESETS.length})'`,
		);

		// Dissonance elimination check: 'Все шаблоны (1 142)' must NOT appear in the markup
		assert.ok(
			!cleanHtml.includes("Все шаблоны (1 142)"),
			"Ambiguous 'Все шаблоны (1 142)' must be eliminated",
		);
	});

	it("CLINICAL_SPECIALTY_SECTIONS: subtexts use universal clinical descriptions without raw commercial lock-in", () => {
		const therapySection = CLINICAL_SPECIALTY_SECTIONS.find(
			(s) => s.id === "therapy",
		);
		assert.ok(therapySection, "Therapy section must exist");

		const cariesMedium = therapySection.items.find(
			(i) => i.presetId === "caries_medium",
		);
		assert.ok(cariesMedium);
		assert.equal(
			cariesMedium.subtext,
			"Препарирование + Светоотверждаемый нанокомпозит",
			"Must use universal clinical descriptor instead of raw Estelite",
		);

		const cariesIcon = therapySection.items.find(
			(i) => i.presetId === "caries_initial_icon",
		);
		assert.ok(cariesIcon);
		assert.equal(
			cariesIcon.subtext,
			"Инфильтрация полимером без препарирования",
			"Must use non-invasive polymer infiltration clinical terminology",
		);

		const wedgeDefect = therapySection.items.find(
			(i) => i.presetId === "wedge_defect_cervical",
		);
		assert.ok(wedgeDefect);
		assert.equal(
			wedgeDefect.subtext,
			"Текучий гибридный композит + полировка",
			"Must use clinical terminology instead of Beautifil Flow brand",
		);
	});

	it("THERAPY_SOAP_PRESETS: material deduction lists provide universal clinical categories with dosage", () => {
		const mediumPreset = THERAPY_SOAP_PRESETS.find(
			(p) => p.id === "caries_medium",
		);
		assert.ok(mediumPreset?.materialsToDeduct);
		const compositeMat = mediumPreset.materialsToDeduct.find(
			(m) => m.category === "composite",
		);
		assert.ok(compositeMat);
		assert.ok(
			compositeMat.name.includes("Светоотверждаемый наногибридный композит"),
			"Material name must specify clinical category",
		);

		const iconPreset = THERAPY_SOAP_PRESETS.find(
			(p) => p.id === "caries_initial_icon",
		);
		assert.ok(iconPreset?.materialsToDeduct);
		const iconMat = iconPreset.materialsToDeduct[0];
		assert.ok(
			iconMat?.name.includes("Система полимерной инфильтрации"),
			"Icon material must indicate polymer infiltration system group",
		);

		const desensPreset = THERAPY_SOAP_PRESETS.find(
			(p) => p.id === "cold_hot_sensitivity",
		);
		assert.ok(desensPreset?.materialsToDeduct);
		const desensMat = desensPreset.materialsToDeduct.find(
			(m) => m.category === "adhesive",
		);
		assert.ok(
			desensMat?.name.includes("Десенситайзер твердых тканей"),
			"Desensitizer material must specify clinical category",
		);
	});
});
