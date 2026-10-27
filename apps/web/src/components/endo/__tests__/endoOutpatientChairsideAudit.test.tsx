import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	EndoCanalLogModal,
	applyExpressApicalEndoProtocol,
	generateEndoProtocol043,
	getDefaultCanalsForTooth,
} from "../EndoCanalLogModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Chairside Endodontics Outpatient Audit — Part 1 (Mandates 8e, 8k)", () => {
	it("1. Mandate 8k Anti-Simulator Law: No physical procedural simulation of file breakage or stress tensors", () => {
		const modalSource = fs.readFileSync(path.resolve(__dirname, "../EndoCanalLogModal.tsx"), "utf8");
		const forbiddenSimulatorTerms = [
			"stress_tensor",
			"fracture_sim",
			"torque_limit_physics",
			"finite_element",
			"file_breakage_simulator",
			"mesh_deformation",
		];
		for (const term of forbiddenSimulatorTerms) {
			assert.equal(modalSource.includes(term), false, `EndoCanalLogModal must NOT contain: ${term}`);
		}
	});

	it("2. Mandate 8e Doctor Autonomy: Zero disabled buttons in EndoCanalLogModal", () => {
		const html = renderToString(
			<EndoCanalLogModal
				isOpen={true}
				onClose={() => {}}
				toothNumber={16}
				patientName="Кузнецов Иван"
				doctorName="Др. Васильев"
			/>,
		);
		assert.ok(html.includes("data-testid=\"endo-canal-log-modal\""));
		assert.ok(html.includes("data-testid=\"insert-endo-protocol-btn\""));
		assert.ok(html.includes("data-testid=\"endo-copy-patient-memo-btn\""));
		assert.ok(html.includes("data-testid=\"endo-print-worksheet-btn\""));

		const disabledButtonRegex = /<button[^>]*\bdisabled\b[^>]*>/i;
		assert.equal(disabledButtonRegex.test(html), false, "EndoCanalLogModal must have ZERO disabled buttons");
	});

	it("3. Form 043/u root canal treatment log has canal length, apex locator, sealer, and stage stamps", () => {
		const defaultCanals = getDefaultCanalsForTooth(46);
		assert.ok(defaultCanals.length >= 3, "Tooth 46 must have at least 3 canals (MB, ML, D)");

		const express = applyExpressApicalEndoProtocol(defaultCanals, 46);
		assert.ok(express.canals.every((c) => Number(c.workingLengthMm) > 0));
		assert.ok(express.radiologyControl.includes("апекса"));

		const protocolText = generateEndoProtocol043({
			toothNumber: 46,
			toothTitle: "Зуб FDI: #46 Первый моляр нижней челюсти справа [ПОЛНАЯ ОБТУРАЦИЯ ДО АПЕКСА]",
			canals: express.canals,
			irrigation: express.irrigation,
			rotarySystem: express.rotarySystem,
			radiologyControl: express.radiologyControl,
		});

		assert.ok(protocolText.includes("Зуб FDI: #46"), "Must identify tooth");
		assert.ok(protocolText.includes("ТАБЛИЦА УЧЕТА РАБОЧЕЙ ДЛИНЫ КОРНЕВЫХ КАНАЛОВ"));
		assert.ok(protocolText.includes("MB") && protocolText.includes("ML") && protocolText.includes("D"));
		assert.ok(protocolText.includes("Рентгенологический контроль"));
		assert.ok(protocolText.includes("Медикаментозная обработка"));
		assert.ok(protocolText.includes("Апекслокация"));
	});
});
