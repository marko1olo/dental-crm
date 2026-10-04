/**
 * directRvgCaptureModal.test.tsx
 *
 * Targeted Red Team Test Suite for Direct RVG Capture Modal:
 * 1. Complete eradication of manual exposure seconds and physics clutter.
 * 2. Real clinical Auto-Trigger (детектирование рентгеновского импульса кремниевой матрицей).
 * 3. 1-click anatomical presets (Резцы / Премоляры / Моляры, Взрослый / Детский).
 * 4. Clinical projection angles (Прицельный, Bite-wing, Окклюзионный).
 * 5. 1-click doctor actions (В карту EMR, В план лечения, В лабораторию ЗТЛ, Экспорт DICOM).
 * 6. Zero fake progress simulation delays (no setTimeout 30ms simulators).
 *
 * Mandate 8e: Doctor Autonomy (Zero Friction, Instant Capture <50ms).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	DirectRvgProjectionSelector,
	type AnatomicalZone,
	type PatientCategory,
} from "../DirectRvgProjectionSelector";
import { DirectRvgFdiSelector } from "../DirectRvgFdiSelector";
import { DirectRvgSensorTelemetryHeader } from "../DirectRvgSensorTelemetryHeader";
import { DirectRvgFooter } from "../DirectRvgFooter";
import { PROJECTION_TYPES, SENSOR_MODELS } from "../directRvgTypes";

const webSrcRoot = path.join(import.meta.dirname, "../../..");

function readSource(relativePath: string): string {
	return readFileSync(path.join(webSrcRoot, relativePath), "utf8");
}

describe("Direct RVG Capture Modal & Clinical VisioGraphy Workstation", () => {
	describe("1. Total Eradication of Manual Exposure Inputs & Physics Clutter", () => {
		it("ensures DirectRvgProjectionSelector has zero manual seconds select or slider inputs", () => {
			const selectorSrc = readSource("components/radiology/DirectRvgProjectionSelector.tsx");
			assert.ok(!selectorSrc.includes('data-testid="rvg-exposure-select"'), "Must NOT contain rvg-exposure-select");
			assert.ok(!selectorSrc.includes("0.06 с (быстрая)"), "Must NOT contain hardcoded seconds options");
			assert.ok(!selectorSrc.includes("typicalExposureSec} с"), "Must NOT show raw seconds on projection chips");
		});

		it("proves DirectRvgSensorTelemetryHeader contains Auto-Trigger status instead of manual physics", () => {
			const headerSrc = readSource("components/radiology/DirectRvgSensorTelemetryHeader.tsx");
			assert.ok(headerSrc.includes("Датчик готов (Auto-Trigger)"), "Must display Auto-Trigger ready badge");
			assert.ok(headerSrc.includes("Auto-Trigger / USB"), "Header title must state Auto-Trigger / USB");
			assert.ok(!headerSrc.includes("напряжение на трубке"), "Must not mention tube voltage");
			assert.ok(!headerSrc.includes("мА·с"), "Must not display mAs physics");
		});

		it("proves DirectRvgCaptureModal has clean Auto-Trigger status in empty viewport state", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			assert.ok(modalSrc.includes("Датчик готов к захвату (Auto-Trigger)"), "Empty state must declare Auto-Trigger");
			assert.ok(modalSrc.includes("Датчик автоматически зафиксирует импульс"), "Empty state text explains auto-pulse capture");
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
			assert.ok(!selectorHtml.includes('data-testid="rvg-patient-category-presets"'), "Must NOT duplicate patient category in projection selector");

			const fdiHtml = renderToString(
				React.createElement(DirectRvgFdiSelector, {
					selectedTeeth: ["16"],
					onToothToggle: () => {},
					primaryTooth: "16",
					primaryToothName: "Зуб 16",
					patientCategory: "adult",
				}),
			);
			assert.ok(fdiHtml.includes("Взрослый (11–48)"), "Must display adult category in FDI selector");
			assert.ok(fdiHtml.includes("Детский (51–85)"), "Must display child category in FDI selector");
		});

		it("renders 3 anatomical zone presets (Резцы / Премоляры / Моляры)", () => {
			const html = renderToString(
				React.createElement(DirectRvgProjectionSelector, {
					projectionType: "periapical",
					onSelectProjectionType: () => {},
					patientCategory: "adult",
					anatomicalZone: "molar",
				}),
			);

			assert.ok(html.includes('data-testid="rvg-zone-incisor"'), "Must render incisor preset");
			assert.ok(html.includes('data-testid="rvg-zone-premolar"'), "Must render premolar preset");
			assert.ok(html.includes('data-testid="rvg-zone-molar"'), "Must render molar preset");
			assert.ok(html.includes("Резцы / Клыки"), "Must display Incisor/Canine label");
			assert.ok(html.includes("Премоляры"), "Must display Premolar label");
			assert.ok(html.includes("Моляры"), "Must display Molar label");
		});

		it("renders Auto-Trigger status card in DirectRvgProjectionSelector", () => {
			const html = renderToString(
				React.createElement(DirectRvgProjectionSelector, {
					projectionType: "periapical",
					onSelectProjectionType: () => {},
					patientCategory: "adult",
					anatomicalZone: "molar",
				}),
			);

			assert.ok(html.includes('data-testid="rvg-auto-trigger-status"'), "Must render auto-trigger status card");
			assert.ok(html.includes("АВТОПОДЖИГ"), "Must display АВТОПОДЖИГ badge");
			assert.ok(html.includes("Датчик подключен · Ожидание снимка"), "Must display clean status");
			assert.ok(!html.includes("кремниевой матрицей"), "Must NOT display academic bloat");
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

			assert.ok(html.includes('data-testid="rvg-save-emr-btn"'), "Must have EMR save button");
			assert.ok(html.includes('data-testid="rvg-send-plan-btn"'), "Must have send to plan button");
			assert.ok(html.includes('data-testid="rvg-send-lab-btn"'), "Must have send to dental lab button");
			assert.ok(html.includes('data-testid="rvg-export-dicom-btn"'), "Must have export DICOM button");
			assert.ok(html.includes("Сохранить в карту"), "EMR button text");
			assert.ok(html.includes("В план лечения"), "Plan button text");
			assert.ok(html.includes("В лабораторию (ЗТЛ)"), "Lab button text");
		});
	});

	describe("4. Sensor Telemetry Header & Capture Triggers", () => {
		it("renders DirectRvgSensorTelemetryHeader with Auto-Trigger status badge", () => {
			const html = renderToString(
				React.createElement(DirectRvgSensorTelemetryHeader, {
					patientName: "Иванов И.И.",
					patientCardNumber: "043/у-2026/891",
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
		});

		it("proves instant capture without fake setTimeout simulation delays", () => {
			const modalSrc = readSource("components/radiology/DirectRvgCaptureModal.tsx");
			assert.ok(!modalSrc.includes("setTimeout(() => {"), "Must not have fake setTimeout simulation delays in modal");
		});
	});
});
