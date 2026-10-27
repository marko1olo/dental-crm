import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	applyCaOh2EndoProtocol,
	applyPulpitisProtocol,
	applyPrimaryEndoProtocol,
	applyRetreatmentEndoProtocol,
	applyObturationPermanentProtocol,
	applyPeriodontitisDestructiveProtocol,
	applyStandardEndoProtocol,
	applyExpressApicalEndoProtocol,
	getDefaultCanalsForTooth,
	getAnatomicalWorkingLength,
	formatWorkingLengthDisplay,
	formatEndoPatientMemo,
} from "../EndoCanalLogModal";

describe("Chairside Endodontics Outpatient Audit — Part 2 (Mandates 8e, 8k)", () => {
	it("1. 1-Click Clinical Presets (Mandate 8e, 8k) provide immediate norms without manual friction", () => {
		const canals = getDefaultCanalsForTooth(26);
		const caoh2 = applyCaOh2EndoProtocol(canals, 26);
		assert.ok(caoh2.irrigation.includes("NaOCl"));
		assert.ok(caoh2.canals.some((c) => c.obturationTechnique?.includes("Ca(OH)2") || c.notes?.includes("Ca(OH)2")));

		const pulpitis = applyPulpitisProtocol(canals, 26);
		assert.ok(pulpitis.rotarySystem.includes("ProTaper"));
		assert.ok(pulpitis.radiologyControl.includes("радиовизиография") && pulpitis.radiologyControl.includes("обтурированы"));

		assert.ok(applyPrimaryEndoProtocol(canals, 26).rotarySystem.includes("ProTaper Gold"));
		assert.ok(applyRetreatmentEndoProtocol(canals, 26).rotarySystem.includes("D-RaCe"));
		assert.ok(applyObturationPermanentProtocol(canals, 26).canals.every((c) => c.obturationTechnique?.includes("AH Plus") || c.obturationTechnique?.includes("Гуттаперча")));
		assert.ok(applyPeriodontitisDestructiveProtocol(canals, 26).irrigation.includes("NaOCl"));
		assert.ok(applyStandardEndoProtocol(canals, 26).rotarySystem.length > 0);
	});

	it("2. Anatomical working length defaults match human tooth anatomy (FDI)", () => {
		const len11 = getAnatomicalWorkingLength(11, "Main");
		assert.ok(len11 >= 20 && len11 <= 24, `Tooth 11 length ${len11} must be in anatomical range`);
		const len13 = getAnatomicalWorkingLength(13, "Main");
		assert.ok(len13 >= 24 && len13 <= 28, `Tooth 13 length ${len13} must be in anatomical range`);
		const len46mb = getAnatomicalWorkingLength(46, "MB");
		assert.ok(len46mb >= 19 && len46mb <= 23, `Tooth 46 MB length ${len46mb} must be in anatomical range`);
	});

	it("3. Express 1-click endo protocol & safe working length formatting (Mandates 8e, 8k)", () => {
		assert.equal(formatWorkingLengthDisplay(null), "—");
		assert.equal(formatWorkingLengthDisplay(undefined), "—");
		assert.equal(formatWorkingLengthDisplay(""), "—");
		assert.equal(formatWorkingLengthDisplay(0), "—");
		assert.equal(formatWorkingLengthDisplay("abc"), "—");
		assert.equal(formatWorkingLengthDisplay(21.2), "21.0 мм");
		assert.equal(formatWorkingLengthDisplay(21.3), "21.5 мм");

		const canals16 = getDefaultCanalsForTooth(16);
		const express = applyExpressApicalEndoProtocol(canals16, 16);
		assert.ok(express.canals.length >= 3, "Tooth 16 has at least 3 canals");
		assert.ok(express.rotarySystem.includes("ProTaper"), "Defaults to ProTaper");
		assert.ok(express.canals.every((c) => c.sealer?.includes("AH Plus")), "Defaults to AH Plus");
		assert.ok(express.canals.every((c) => Number(c.workingLengthMm) >= 20.0), "Lengths >= 20mm");
	});

	it("4. Patient memo for WhatsApp/Telegram is generated with zero emojis and clear post-treatment rules", () => {
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

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.equal(emojiRegex.test(memo), false, "Endo patient memo must have strictly zero emojis");
	});
});
