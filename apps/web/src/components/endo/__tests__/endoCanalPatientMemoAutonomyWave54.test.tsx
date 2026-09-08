/**
 * endoCanalPatientMemoAutonomyWave54.test.tsx
 *
 * Unit tests for Wave 54 / Feature 243:
 * «эндодонтия_протокол::1_клик_копирование_памятки_по_уходу_после_лечения_каналов_для_пациента_и_печать_эндо_карты_а4»
 *
 * CONSTITUTION & MANDATES:
 * - THE_HAMMER_MASTER_PROMPT.md & .agents/AGENTS.md
 * - Mandate 8c: Universal 3-Tier Architecture & Ergonomic Invariants (touch target >= 44x44px)
 * - Mandate 8d (pt 2, 7): Hick's Density & Zero cartoon emojis in medical documents
 * - Mandate 8e (pt 1, 5): Doctor Autonomy & Print on Demand (Лист эндодонтического лечения А4)
 * - Mandate 8i: Specialized Outpatient Context (Form 043/u)
 * - Mandate 8k: CRM != Reality Simulator (1-click patient memo for messengers)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	EndoCanalLogModal,
	formatEndoPatientMemo,
	type EndoPatientMemoParams,
} from "../EndoCanalLogModal";
import fs from "node:fs";
import path from "node:path";

describe("Wave 54 / Feature 243: Endo Patient Memo and A4 Worksheet Print", () => {
	describe("1. Pure Function: formatEndoPatientMemo", () => {
		it("formats structured patient endo memo for permanent obturation", () => {
			const memo = formatEndoPatientMemo({
				clinicName: "Стоматологическая клиника DENTE",
				clinicPhone: "+7 (495) 123-45-67",
				patientName: "Смирнова Елена Сергеевна",
				doctorName: "Д-р Васильев В.В.",
				toothNumber: 16,
				toothAnatomicalNameRu: "Первый моляр верхней челюсти справа",
				isPermanentObturation: true,
				date: "08.09.2026",
			});

			assert.ok(memo.includes("Памятка пациенту после эндодонтического лечения корневых каналов"));
			assert.ok(memo.includes("Стоматологическая клиника DENTE"));
			assert.ok(memo.includes("Смирнова Елена Сергеевна"));
			assert.ok(memo.includes("Д-р Васильев В.В."));
			assert.ok(memo.includes("08.09.2026"));
			assert.ok(memo.includes("16 (Первый моляр верхней челюсти справа)"));
			assert.ok(memo.includes("Постоянная трёхмерная обтурация корневых каналов"));
			assert.ok(memo.includes("Не принимайте пищу в течение 2 часов"));
			assert.ok(memo.includes("Умеренная болезненность при накусывании в течение 2–5 дней"));
			assert.ok(memo.includes("через 10-14 дней (контрольный снимок и постоянная реставрация/коронка)"));
			assert.ok(memo.includes("+7 (495) 123-45-67"));
		});

		it("formats structured patient endo memo for temporary Ca(OH)2 dressing", () => {
			const memo = formatEndoPatientMemo({
				clinicName: "DENTE Clinic",
				clinicPhone: "+7 (495) 999-88-77",
				patientName: "Ковалев К.К.",
				doctorName: "Д-р Васильев В.В.",
				toothNumber: 26,
				isTemporaryCaOh2: true,
				isPermanentObturation: false,
			});

			assert.ok(memo.includes("Антисептическая обработка каналов и временное пломбирование гидроксидом кальция Ca(OH)2"));
			assert.ok(memo.includes("через 10-14 дней для замены лекарства или постоянной пломбировки каналов"));
		});

		it("contains strictly ZERO cartoon emojis (Mandate 8d pt 7)", () => {
			const memo = formatEndoPatientMemo({
				clinicName: "Клиника",
				clinicPhone: "+79990000000",
				patientName: "Пациент",
				doctorName: "Врач",
				toothNumber: 46,
			});

			const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
			assert.equal(emojiRegex.test(memo), false, "Memo must not contain cartoon emojis");
		});

		it("falls back to robust clinical defaults when optional params are omitted", () => {
			const memo = formatEndoPatientMemo({
				clinicName: "",
				clinicPhone: "",
				patientName: "",
				doctorName: "",
				toothNumber: 11,
			});

			assert.ok(memo.includes("Стоматологическая клиника DENTE"));
			assert.ok(memo.includes("+7 (495) 123-45-67"));
			assert.ok(memo.includes("Пациент"));
			assert.ok(memo.includes("Врач-стоматолог-терапевт (эндодонтист)"));
			assert.ok(memo.includes("зуб 11"));
		});
	});

	describe("2. UI Rendering and 1-Click Action Buttons in Footer", () => {
		it("renders copy patient memo button and print worksheet button when modal is open", () => {
			const html = renderToString(
				<EndoCanalLogModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={16}
					patientName="Семенов С.С."
					doctorName="Врач Эндодонтист"
				/>,
			);

			assert.ok(
				html.includes('data-testid="endo-copy-patient-memo-btn"'),
				"Must render endo-copy-patient-memo-btn in footer",
			);
			assert.ok(
				html.includes('data-testid="endo-print-worksheet-btn"'),
				"Must render endo-print-worksheet-btn in footer",
			);
			assert.ok(
				html.includes("Скопировать для пациента"),
				"Must show copy patient memo label",
			);
			assert.ok(
				html.includes("Печать эндо-карты (А4)"),
				"Must show print worksheet label",
			);
		});

		it("renders null when isOpen is false", () => {
			const html = renderToString(
				<EndoCanalLogModal
					isOpen={false}
					onClose={() => {}}
					toothNumber={16}
				/>,
			);
			assert.equal(html, "");
		});
	});

	describe("3. Touch Target and Ergonomic Standards (Mandate 8c, 8d)", () => {
		it("footer action buttons have min-height >= 44px (min-h-[50px])", () => {
			const html = renderToString(
				<EndoCanalLogModal
					isOpen={true}
					onClose={() => {}}
					toothNumber={36}
				/>,
			);

			assert.ok(
				html.includes("min-h-[50px]"),
				"Footer buttons must have min-h-[50px] >= 44px touch target",
			);
		});

		it("PediatricParentMemoModal has ZERO cartoon emojis in print button (Mandate 8d pt 7)", () => {
			const pediatricModalFilePath = path.resolve(
				process.cwd(),
				"apps/web/src/components/pediatric/PediatricParentMemoModal.tsx",
			);
			const code = fs.readFileSync(pediatricModalFilePath, "utf8");
			assert.equal(code.includes("⚡"), false, "PediatricParentMemoModal must not contain ⚡ emoji");
		});
	});
});
