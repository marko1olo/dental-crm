import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	exportDoseJournalToCsv,
	generateDoseSheetHtml,
} from "../doseSheet/radiationDoseEngine.js";
import { RadiationDoseSheetForm } from "../../documents/forms/RadiationDoseSheetForm.js";
import { RadiationDoseSheetForm as RadiologyBridgeForm } from "../RadiationDoseSheetForm.js";
import { DicomViewerModal } from "../../imaging/DicomViewerModal.js";
import { ClinicalPhotoProtocolModal } from "../../photography/ClinicalPhotoProtocolModal.js";

const FORBIDDEN_SYNTHETIC_NAME = "Иванов Иван Иванович";

test("Wave 107: generateDoseSheetHtml по умолчанию не подставляет синтетическое имя 'Иванов Иван Иванович'", () => {
	const html = generateDoseSheetHtml([], {});
	assert.equal(html.includes(FORBIDDEN_SYNTHETIC_NAME), false);

	const htmlWithPatient = generateDoseSheetHtml([], {
		patientFullName: "Сидорова Анна Павловна",
	});
	assert.ok(htmlWithPatient.includes("Сидорова Анна Павловна"));
});

test("Wave 107: exportDoseJournalToCsv по умолчанию не подставляет синтетическое имя 'Иванов Иван Иванович'", () => {
	const csv = exportDoseJournalToCsv([], {});
	assert.equal(csv.includes(FORBIDDEN_SYNTHETIC_NAME), false);

	const csvWithPatient = exportDoseJournalToCsv([], {
		patientFullName: "Петров Василий Сергеевич",
	});
	assert.ok(csvWithPatient.includes("Петров Василий Сергеевич"));
});

test("Wave 199: канонический RadiationDoseSheetForm и DicomViewerModal рендерятся без синтетического ФИО", () => {
	assert.ok(RadiationDoseSheetForm);
	assert.equal(RadiologyBridgeForm, RadiationDoseSheetForm);

	const formHtml = renderToStaticMarkup(
		React.createElement(RadiationDoseSheetForm, {
			patientName: "Тестовый Пациент",
			studies: [],
		}),
	);
	const dicomHtml = renderToStaticMarkup(
		React.createElement(DicomViewerModal, {
			isOpen: true,
			onClose: () => {},
			patientName: "Тестовый Пациент",
		}),
	);
	const photoHtml = renderToStaticMarkup(
		React.createElement(ClinicalPhotoProtocolModal, {
			isOpen: true,
			onClose: () => {},
			patientName: "Тестовый Пациент",
		}),
	);

	for (const html of [formHtml, dicomHtml, photoHtml]) {
		assert.equal(html.includes(FORBIDDEN_SYNTHETIC_NAME), false);
	}
});
