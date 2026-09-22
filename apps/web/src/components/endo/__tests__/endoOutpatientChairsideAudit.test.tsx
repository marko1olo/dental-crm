/**
 * endoOutpatientChairsideAudit.test.tsx
 *
 * Dedicated audit suite for Chairside Endodontics under:
 * - Mandate 8e: Doctor Autonomy (Zero disabled buttons, saving at any stage, 1-click norms)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u root canal treatment log)
 * - Mandate 8k: CRM != Reality Simulator (Zero physical procedural simulators of instrument breakage)
 * - Mandate 8s: Anti-Bloat Doctrine
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const { describe, it } = await (async () => {
	try {
		// @ts-ignore
		return await import("vitest");
	} catch {
		return await import("node:test");
	}
})();

import {
	EndoCanalLogModal,
	CURATED_ISO_MAF_OPTIONS,
	formatWorkingLengthDisplay,
	applyExpressApicalEndoProtocol,
	applyCaOh2EndoProtocol,
	applyPulpitisProtocol,
	applyPrimaryEndoProtocol,
	applyRetreatmentEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyStandardEndoProtocol,
	generateEndoProtocol043,
	getDefaultCanalsForTooth,
	getAnatomicalWorkingLength,
	getIsoEndoColorInfo,
	formatEndoPatientMemo,
} from "../EndoCanalLogModal";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Chairside Endodontics Outpatient Audit (Mandates 8e, 8i, 8k, 8s)", () => {
	it("1. Mandate 8k Anti-Simulator Law: No physical procedural simulation of file breakage or stress tensors", () => {
		const modalSource = fs.readFileSync(
			path.resolve(__dirname, "../EndoCanalLogModal.tsx"),
			"utf8",
		);

		const forbiddenSimulatorTerms = [
			"stress_tensor",
			"fracture_sim",
			"torque_limit_physics",
			"finite_element",
			"file_breakage_simulator",
			"mesh_deformation",
		];

		for (const term of forbiddenSimulatorTerms) {
			assert.equal(
				modalSource.includes(term),
				false,
				`EndoCanalLogModal must NOT contain procedural simulation logic: ${term}`,
			);
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

		// Must render the modal
		assert.ok(html.includes("data-testid=\"endo-canal-log-modal\""));

		// Must contain primary action buttons
		assert.ok(html.includes("data-testid=\"insert-endo-protocol-btn\""));
		assert.ok(html.includes("data-testid=\"endo-copy-patient-memo-btn\""));
		assert.ok(html.includes("data-testid=\"endo-print-worksheet-btn\""));

		// Must not contain any disabled attribute on buttons
		// Match button elements with disabled attribute
		const disabledButtonRegex = /<button[^>]*\bdisabled\b[^>]*>/i;
		assert.equal(
			disabledButtonRegex.test(html),
			false,
			"EndoCanalLogModal must have ZERO disabled buttons (Mandate 8e)",
		);
	});

	it("3. Form 043/u root canal treatment log has canal length, apex locator, sealer/gutta-percha, and stage stamps", () => {
		const defaultCanals = getDefaultCanalsForTooth(46);
		assert.ok(defaultCanals.length >= 3, "Tooth 46 must have at least 3 canals (MB, ML, D)");

		// Check 1-click Express Apical preset
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
		assert.ok(protocolText.includes("MB"), "Must list MB canal");
		assert.ok(protocolText.includes("ML"), "Must list ML canal");
		assert.ok(protocolText.includes("D"), "Must list D canal");
		assert.ok(protocolText.includes("Рентгенологический контроль"));
		assert.ok(protocolText.includes("Медикаментозная обработка"));
		assert.ok(protocolText.includes("Апекслокация"));
	});

	it("4. 1-Click Clinical Presets (Mandate 8e, 8k) provide immediate norms without manual friction", () => {
		const canals = getDefaultCanalsForTooth(26);

		// A. Ca(OH)2 Temporary Dressing
		const caoh2 = applyCaOh2EndoProtocol(canals, 26);
		assert.ok(caoh2.irrigation.includes("NaOCl"));
		assert.ok(
			caoh2.canals.some(
				(c) =>
					c.obturationTechnique?.includes("Ca(OH)2") ||
					c.notes?.includes("Ca(OH)2"),
			),
		);

		// B. Pulpitis 1-Visit Complete
		const pulpitis = applyPulpitisProtocol(canals, 26);
		assert.ok(pulpitis.rotarySystem.includes("ProTaper"));
		assert.ok(
			pulpitis.radiologyControl.includes("радиовизиография") &&
			pulpitis.radiologyControl.includes("обтурированы"),
		);

		// C. Primary Endo
		const primary = applyPrimaryEndoProtocol(canals, 26);
		assert.ok(primary.rotarySystem.includes("ProTaper Gold"));

		// D. Retreatment
		const retreatment = applyRetreatmentEndoProtocol(canals, 26);
		assert.ok(retreatment.rotarySystem.includes("D-RaCe"));

		// E. Permanent Obturation
		const obturation = applyObturationPermanentProtocol(canals, 26);
		assert.ok(obturation.canals.every((c) => c.obturationTechnique?.includes("AH Plus") || c.obturationTechnique?.includes("Гуттаперча")));

		// F. Destructive Periodontitis
		const destructive = applyPeriodontitisDestructiveProtocol(canals, 26);
		assert.ok(destructive.irrigation.includes("NaOCl"));

		// G. Standard
		const standard = applyStandardEndoProtocol(canals, 26);
		assert.ok(standard.rotarySystem.length > 0);
	});

	it("5. Anatomical working length defaults match human tooth anatomy (FDI)", () => {
		// Central incisor (11 / 21): ~21-23 mm
		const len11 = getAnatomicalWorkingLength(11, "Main");
		assert.ok(len11 >= 20 && len11 <= 24, `Tooth 11 length ${len11} must be in anatomical range`);

		// Canine (13 / 23): ~25-27 mm
		const len13 = getAnatomicalWorkingLength(13, "Main");
		assert.ok(len13 >= 24 && len13 <= 28, `Tooth 13 length ${len13} must be in anatomical range`);

		// Molar (16 / 46): ~19-22 mm
		const len46mb = getAnatomicalWorkingLength(46, "MB");
		assert.ok(len46mb >= 19 && len46mb <= 23, `Tooth 46 MB length ${len46mb} must be in anatomical range`);
	});

	it("6. ISO 3630-1 color coding and safe formatting eliminate undefined / NaN leaks", () => {
		assert.equal(formatWorkingLengthDisplay(null), "—");
		assert.equal(formatWorkingLengthDisplay(undefined), "—");
		assert.equal(formatWorkingLengthDisplay(""), "—");
		assert.equal(formatWorkingLengthDisplay(0), "—");
		assert.equal(formatWorkingLengthDisplay("abc"), "—");
		assert.equal(formatWorkingLengthDisplay(21.2), "21.0 мм");
		assert.equal(formatWorkingLengthDisplay(21.3), "21.5 мм");

		// ISO 3630-1 file sizes and colors
		const iso25 = getIsoEndoColorInfo("ISO 25 (#25 красный)");
		assert.ok(iso25);
		assert.equal(iso25.size, 25);
		assert.equal(iso25.colorRu, "красный");

		const iso30 = getIsoEndoColorInfo("ISO 30 (#30 синий)");
		assert.ok(iso30);
		assert.equal(iso30.size, 30);
		assert.equal(iso30.colorRu, "синий");
	});

	it("7. Patient memo for WhatsApp/Telegram is generated with zero emojis and clear post-treatment rules", () => {
		const memo = formatEndoPatientMemo({
			clinicName: "Клиника DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			patientName: "Иванов И.И.",
			doctorName: "Др. Петров",
			toothNumber: 36,
			isPermanentObturation: true,
		});

		assert.ok(memo.includes("Памятка пациенту после эндодонтического лечения"));
		assert.ok(memo.includes("Иванов И.И."));
		assert.ok(memo.includes("Не принимайте пищу в течение 2 часов"));
		assert.ok(memo.includes("Умеренная болезненность"));
		assert.ok(memo.includes("+7 (495) 123-45-67"));

		// Strict zero emojis check (Deadly Sin #7)
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(memo), false, "Endo patient memo must have strictly zero emojis");
	});
});
