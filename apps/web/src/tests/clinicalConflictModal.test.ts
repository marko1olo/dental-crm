/**
 * @dental/web — Clinical Conflict Modal & Form 043/u Split-Brain Merge Unit Tests.
 *
 * Validates:
 * 1. calculate043ClinicalDiff: Section-by-section diff detection (Complaints, Anamnesis, Diagnosis, Treatment, FDI Teeth).
 * 2. mergeClinical043DiariesNonDestructive: Non-destructive text merging, tooth number set unions, doctor/cloud overrides.
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	calculate043ClinicalDiff,
	type Clinical043DiaryRecord,
	mergeClinical043DiariesNonDestructive,
} from "../services/sync/conflictResolver.js";

describe("Clinical Conflict Resolver & Form 043/u Split-Brain Merge Suite", () => {
	const sampleDoctorVersion: Clinical043DiaryRecord = {
		id: "diary-01",
		patientId: "pat-100",
		authorName: "Д-р Кузнецов А.В.",
		authorRole: "doctor",
		complaints: "Острая ноющая боль в области зуба 46, усиливающаяся от температурных раздражителей.",
		anamnesis: "Зуб 46 ранее лечен по поводу глубокого кариеса 6 месяцев назад. Аллергоанамнез не отягощен.",
		objective: "Зуб 46: на жевательной поверхности глубокая кариозная полость, зондирование дна резко болезненно, перкуссия слабо болезненна.",
		diagnosis: "К04.00 Острый очаговый пульпит зуба 46",
		icd10Code: "K04.0",
		treatment: "Проведена инфильтрационная анестезия Sol. Ultracaini DS Forte 1.7 ml. Препарирование полости, раскрытие полости зуба, экстирпация пульпы из 3 каналов. Механическая обработка ProTaper Gold (F1, F2), медикаментозная обработка 3% NaOCl + 17% EDTA. Временная повязка Каласепт + Септопак.",
		recommendations: "Охранительный режим, не жевать на стороне зуба 46. При болях — Нимесил 100 мг. Повторный визит через 7 дней.",
		toothNumbers: [46],
		serviceCodes804n: ["A16.07.002.001", "A16.07.030.001"],
		updatedAt: "2026-08-26T10:15:00.000Z",
	};

	const sampleCloudVersion: Clinical043DiaryRecord = {
		id: "diary-01",
		patientId: "pat-100",
		authorName: "Ассистент Смирнова Е.П.",
		authorRole: "assistant",
		complaints: "Пациент жалуется на ноющие боли в нижней челюсти справа.",
		anamnesis: "Ранее проводилось пломбирование зуба 46. Со слов пациента аллергии нет.",
		objective: "Полость рта санирована частично. Пломба на зубе 46 с нарушением краевого прилегания.",
		diagnosis: "К04.0 Пульпит",
		icd10Code: "K04.0",
		treatment: "Подготовка инструментария: эндомотор, набор эндодонтический, калиброванные штифты.",
		recommendations: "Явка на следующий этап эндодонтического лечения.",
		toothNumbers: [46, 47],
		serviceCodes804n: ["A16.07.002.001", "B01.065.001"],
		updatedAt: "2026-08-26T10:14:30.000Z",
	};

	it("1. calculate043ClinicalDiff detects differences across all clinical sections", () => {
		const diffs = calculate043ClinicalDiff(sampleDoctorVersion, sampleCloudVersion);

		assert.ok(diffs.length >= 7);

		const complaintsDiff = diffs.find((d) => d.field === "complaints");
		assert.ok(complaintsDiff);
		assert.equal(complaintsDiff.isDifferent, true);
		assert.ok(complaintsDiff.doctorValue.includes("Острая ноющая боль"));
		assert.ok(complaintsDiff.cloudValue.includes("жалуется на ноющие боли"));

		const diagnosisDiff = diffs.find((d) => d.field === "diagnosis");
		assert.ok(diagnosisDiff);
		assert.equal(diagnosisDiff.isDifferent, true);
		assert.equal(diagnosisDiff.recommendedStrategy, "doctor"); // Doctor authority

		const teethDiff = diffs.find((d) => d.field === "toothNumbers");
		assert.ok(teethDiff);
		assert.equal(teethDiff.isDifferent, true);
	});

	it("2. mergeClinical043DiariesNonDestructive merges texts non-destructively and unifies arrays", () => {
		const merged = mergeClinical043DiariesNonDestructive(sampleDoctorVersion, sampleCloudVersion);

		// Non-destructive text union with clear attribution headers
		assert.ok(merged.complaints?.includes("[Д-р Кузнецов А.В.]"));
		assert.ok(merged.complaints?.includes("[Ассистент Смирнова Е.П.]"));

		// Treatment union preserves complete medical protocol
		assert.ok(merged.treatment?.includes("Sol. Ultracaini DS Forte"));
		assert.ok(merged.treatment?.includes("эндомотор"));

		// Tooth numbers set union
		assert.ok(Array.isArray(merged.toothNumbers));
		assert.deepEqual(merged.toothNumbers.sort(), [46, 47].sort());

		// Service codes 804n set union
		assert.ok(Array.isArray(merged.serviceCodes804n));
		assert.ok(merged.serviceCodes804n.includes("A16.07.002.001"));
		assert.ok(merged.serviceCodes804n.includes("A16.07.030.001"));
		assert.ok(merged.serviceCodes804n.includes("B01.065.001"));
	});

	it("3. mergeClinical043DiariesNonDestructive respects doctor / cloud priority overrides", () => {
		// Doctor override for diagnosis and treatment
		const doctorOverride = mergeClinical043DiariesNonDestructive(sampleDoctorVersion, sampleCloudVersion, {
			diagnosis: "doctor",
			treatment: "doctor",
		});

		assert.equal(doctorOverride.diagnosis, sampleDoctorVersion.diagnosis);
		assert.equal(doctorOverride.treatment, sampleDoctorVersion.treatment);

		// Cloud override for recommendations
		const cloudOverride = mergeClinical043DiariesNonDestructive(sampleDoctorVersion, sampleCloudVersion, {
			recommendations: "cloud",
		});
		assert.equal(cloudOverride.recommendations, sampleCloudVersion.recommendations);
	});
});
