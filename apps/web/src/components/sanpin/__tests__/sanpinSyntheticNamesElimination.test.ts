import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generateSanpinShiftAutopilotBundle } from "@dental/shared";
import {
	createQuickClassBWasteRecord,
	createQuickClassGWasteRecord,
} from "../waste/medicalWasteEngine.js";
import { SanpinRegisters } from "../SanpinRegisters";
import { SterilizationBatchCycleModal } from "../SterilizationBatchCycleModal";
import { SanPinSterilizationJournal } from "../SanPinSterilizationJournal";
import { CleaningControlTab } from "../CleaningControlTab";

const BANNED_SYNTHETIC_NAMES = [
	"Иванова О.С.",
	"Иванова М. П.",
	"Смирнова Анна Викторовна",
	"Петрова Елена Сергеевна",
	"Иванова Ольга Николаевна",
	"Смирнова О. И.",
	"Иванова Е. С.",
	"Иванова Е.С.",
];

describe("SanPiN Registers — Synthetic Names Elimination & Regulatory Roles Verification (Wave 105)", () => {
	it("verifies rendered SanPiN screens contain zero banned synthetic names", () => {
		const renderedScreens = [
			renderToStaticMarkup(React.createElement(SanpinRegisters)),
			renderToStaticMarkup(React.createElement(SterilizationBatchCycleModal, { isOpen: true, onClose: () => {} })),
			renderToStaticMarkup(React.createElement(SanPinSterilizationJournal)),
			renderToStaticMarkup(React.createElement(CleaningControlTab)),
		];

		for (const html of renderedScreens) {
			for (const banned of BANNED_SYNTHETIC_NAMES) {
				assert.equal(html.includes(banned), false, `Rendered output must not contain banned synthetic name "${banned}"`);
			}
		}
	});

	it("verifies regulatory statutory roles are used as clean defaults", () => {
		const bundle = generateSanpinShiftAutopilotBundle();
		assert.equal(bundle.operatorFullName, "Медсестра ЦСО");
		assert.equal(bundle.headNurseFullName, "Главная медсестра");

		const wasteB = createQuickClassBWasteRecord();
		assert.equal(wasteB.operatorStaffFullName, "Медсестра процедурного кабинета");
		assert.equal(wasteB.operatorStaffPosition, "Медсестра процедурного кабинета");

		const wasteG = createQuickClassGWasteRecord();
		assert.equal(wasteG.operatorStaffFullName, "Старшая медицинская сестра");
		assert.equal(wasteG.operatorStaffPosition, "Старшая медицинская сестра");
	});
});
