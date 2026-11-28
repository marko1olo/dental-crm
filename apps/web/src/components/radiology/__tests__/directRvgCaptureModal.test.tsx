/**
 * directRvgCaptureModal.test.tsx
 *
 * Runtime Behavioral Test Suite for Direct RVG Capture Modal & VisioGraphy Workstation.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";

import { DirectRvgCaptureModal } from "../DirectRvgCaptureModal";
import { DirectRvgProjectionSelector } from "../DirectRvgProjectionSelector";
import { DirectRvgFdiSelector } from "../DirectRvgFdiSelector";
import { DirectRvgSensorTelemetryHeader } from "../DirectRvgSensorTelemetryHeader";
import { DirectRvgFooter } from "../DirectRvgFooter";
import { SENSOR_MODELS } from "../directRvgTypes";

describe("Direct RVG Capture Modal & Clinical VisioGraphy Workstation", () => {
	describe("1. Total Eradication of Manual Exposure Inputs & Physics Clutter", () => {
		it("renders DirectRvgCaptureModal with Auto-Trigger status and zero manual exposure seconds inputs", () => {
			const modalHtml = renderToString(
				React.createElement(DirectRvgCaptureModal, {
					isOpen: true,
					onClose: () => {},
					patientName: "Тест Пациент",
					doctorName: "Лечащий врач",
				}),
			);

			assert.equal(modalHtml.includes('data-testid="rvg-exposure-select"'), false);
			assert.equal(modalHtml.includes("0.06 с (быстрая)"), false);
			assert.equal(modalHtml.includes("напряжение на трубке"), false);
			assert.equal(modalHtml.includes("мА·с"), false);
			assert.ok(modalHtml.includes("Датчик готов к захвату (Auto-Trigger)") || modalHtml.includes("Auto-Trigger"));
		});
	});

	describe("2. 1-Click Anatomical & Patient Category Presets", () => {
		it("verifies patient category is rendered cleanly in DirectRvgFdiSelector without duplicate in projection selector", () => {
			const selectorHtml = renderToString(
				React.createElement(DirectRvgProjectionSelector, {
					projectionType: "periapical",
					onSelectProjectionType: () => {},
					anatomicalZone: "molar",
				}),
			);
			assert.equal(selectorHtml.includes('data-testid="rvg-patient-category-presets"'), false);

			const fdiHtml = renderToString(
				React.createElement(DirectRvgFdiSelector, {
					selectedTeeth: ["16"],
					onToothToggle: () => {},
					primaryTooth: "16",
					primaryToothName: "Зуб 16",
					patientCategory: "adult",
				}),
			);
			assert.ok(fdiHtml.includes("Взрослый (11–48)"));
			assert.ok(fdiHtml.includes("Детский (51–85)"));
		});

		it("renders 3 anatomical zone presets (Резцы / Премоляры / Моляры) and Auto-Trigger card", () => {
			const html = renderToString(
				React.createElement(DirectRvgProjectionSelector, {
					projectionType: "periapical",
					onSelectProjectionType: () => {},
					patientCategory: "adult",
					anatomicalZone: "molar",
				}),
			);

			assert.ok(html.includes('data-testid="rvg-zone-incisor"'));
			assert.ok(html.includes('data-testid="rvg-zone-premolar"'));
			assert.ok(html.includes('data-testid="rvg-zone-molar"'));
			assert.ok(html.includes("Резцы / Клыки"));
			assert.ok(html.includes("Премоляры"));
			assert.ok(html.includes("Моляры"));
			assert.ok(html.includes('data-testid="rvg-auto-trigger-status"'));
			assert.ok(html.includes("АВТОПОДЖИГ"));
			assert.ok(html.includes("Датчик подключен · Ожидание снимка"));
			assert.equal(html.includes("кремниевой матрицей"), false);
		});
	});

	describe("3. 1-Click Clinical Action Workflows in DirectRvgFooter", () => {
		it("renders all 4 essential doctor actions: EMR, Plan, Lab, DICOM", () => {
			const html = renderToString(
				React.createElement(DirectRvgFooter, {
					selectedTeeth: ["16"],
					calculatedDoseMicrosv: 3.0,
					isSaving: false,
					onExportDicom: () => {},
					onSendToLab: () => {},
					onSaveToEmr: () => {},
					onSendToPlan: () => {},
				}),
			);

			assert.ok(html.includes('data-testid="rvg-save-emr-btn"'));
			assert.ok(html.includes('data-testid="rvg-send-plan-btn"'));
			assert.ok(html.includes('data-testid="rvg-send-lab-btn"'));
			assert.ok(html.includes('data-testid="rvg-export-dicom-btn"'));
			assert.ok(html.includes("Прикрепить снимок к зубу и карте визита"));
			assert.ok(html.includes("В план лечения"));
			assert.ok(html.includes("В лабораторию (ЗТЛ)"));
		});
	});

	describe("4. Sensor Telemetry Header & Capture Triggers", () => {
		it("renders DirectRvgSensorTelemetryHeader with Auto-Trigger status badge and disk upload", () => {
			const html = renderToString(
				React.createElement(DirectRvgSensorTelemetryHeader, {
					patientName: "Иванов И.И.",
					patientCardNumber: "ЭМК-2026/891",
					doctorName: "Д-р Смирнов А.В.",
					sensorStatus: "ready",
					acquisitionProgress: 0,
					selectedSensorModel: "vatech_ezsensor_hd",
					onSelectSensorModel: () => {},
					availableSensors: SENSOR_MODELS.map((s) => ({
						id: s.id,
						name: s.name,
						resolution: s.resolution,
						pixelSpacing: s.pixelSpacing,
					})),
					onTriggerCapture: () => {},
				}),
			);

			assert.ok(html.includes('data-testid="rvg-sensor-status-banner"'));
			assert.ok(html.includes("Датчик готов (Auto-Trigger)"));
			assert.ok(html.includes('data-testid="rvg-trigger-exposure-btn"'));
			assert.equal(html.includes("напряжение на трубке"), false);
		});
	});
});
