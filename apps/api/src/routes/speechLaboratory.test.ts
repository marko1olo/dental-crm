import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fastify from "fastify";
import {
	analyzeAudioBufferVad,
	calculateWpm,
	extractDentalMedicalEntities,
	registerSpeechLaboratoryRoutes,
} from "./speechLaboratory.js";

describe("Speech Laboratory: Core Logic & Medical Entity Extraction", () => {
	it("correctly extracts FDI tooth numbers from clinical text", () => {
		const text = "Проведен осмотр зуба 16 и зуба 48. На зубе 21 обнаружен скол.";
		const entities = extractDentalMedicalEntities(text);

		const toothEntities = entities.filter((e) => e.category === "fdi_tooth");
		assert.ok(toothEntities.length >= 2, "Должно быть найдено как минимум 2 зуба");
		assert.ok(
			toothEntities.some((e) => e.term.includes("16")),
			"Зуб 16 должен быть распознан",
		);
		assert.ok(
			toothEntities.some((e) => e.term.includes("48")),
			"Зуб 48 должен быть распознан",
		);
	});

	it("identifies dental diagnoses, materials, and anesthesia with exact offsets", () => {
		const text = "Пациент с диагнозом острый пульпит. Выполнена анестезия ультракаин, наложен коффердам и установлен винир E-max.";
		const entities = extractDentalMedicalEntities(text);

		const diagnosis = entities.find((e) => e.term.toLowerCase() === "пульпит");
		assert.ok(diagnosis, "Диагноз 'пульпит' должен быть найден");
		assert.equal(diagnosis?.category, "diagnosis");
		assert.equal(text.slice(diagnosis.index, diagnosis.index + diagnosis.length).toLowerCase(), "пульпит");

		const anesthesia = entities.find((e) => e.term.toLowerCase() === "ультракаин");
		assert.ok(anesthesia, "Анестетик 'ультракаин' должен быть найден");
		assert.equal(anesthesia?.category, "anesthesia");

		const cofferdam = entities.find((e) => e.term.toLowerCase() === "коффердам");
		assert.ok(cofferdam, "Материал 'коффердам' должен быть найден");
		assert.equal(cofferdam?.category, "material");

		const veneer = entities.find((e) => e.term.toLowerCase() === "винир");
		assert.ok(veneer, "Термин 'винир' должен быть найден");
		assert.equal(veneer?.category, "material");
	});

	it("handles surgical and instrument terms correctly", () => {
		const text = "Установлен дентальный имплант, проведена костная пластика. Использован апекслокатор и ультразвуковой скалер.";
		const entities = extractDentalMedicalEntities(text);

		const implant = entities.find((e) => e.term.toLowerCase() === "имплант");
		assert.ok(implant, "Хирургический термин 'имплант' должен быть найден");
		assert.equal(implant?.category, "surgery");

		const apex = entities.find((e) => e.term.toLowerCase() === "апекслокатор");
		assert.ok(apex, "Инструмент 'апекслокатор' должен быть найден");
		assert.equal(apex?.category, "instrument");

		const scaler = entities.find((e) => e.term.toLowerCase() === "скалер");
		assert.ok(scaler, "Инструмент 'скалер' должен быть найден");
		assert.equal(scaler?.category, "instrument");
	});

	it("computes VAD and noise levels from audio buffers", () => {
		// 1. Пустой буфер
		const emptyVad = analyzeAudioBufferVad(Buffer.alloc(0));
		assert.equal(emptyVad.noiseDb, -90);
		assert.equal(emptyVad.activeVad, false);

		// 2. Тишина (нули)
		const silenceBuffer = Buffer.alloc(3200); // 100мс 16kHz 16-bit
		const silenceVad = analyzeAudioBufferVad(silenceBuffer);
		assert.equal(silenceVad.noiseDb, -90);
		assert.equal(silenceVad.activeVad, false);

		// 3. Активный сигнал (синусоида высокой амплитуды)
		const activeBuffer = Buffer.alloc(3200);
		for (let i = 0; i < activeBuffer.length - 1; i += 2) {
			const sample = Math.sin(i / 10) * 16000;
			activeBuffer.writeInt16LE(Math.round(sample), i);
		}
		const activeVad = analyzeAudioBufferVad(activeBuffer);
		assert.ok(activeVad.noiseDb > -40, "Шум должен быть выше порога тишины");
		assert.equal(activeVad.activeVad, true, "VAD должен зафиксировать активность");
	});

	it("calculates speech speed in words per minute (WPM)", () => {
		const text = "Один два три четыре пять шесть семь восемь девять десять";
		const wpm60 = calculateWpm(text, 60); // 10 слов за 60 секунд = 10 WPM
		assert.equal(wpm60, 10);

		const wpm10 = calculateWpm(text, 10); // 10 слов за 10 секунд = 60 WPM
		assert.equal(wpm10, 60);
	});
});

describe("Speech Laboratory: HTTP Endpoints", () => {
	it("GET /api/v1/speech/lab-status returns ready status and 5 supported STT modes", async () => {
		const app = fastify();
		await registerSpeechLaboratoryRoutes(app);

		const response = await app.inject({
			method: "GET",
			url: "/api/v1/speech/lab-status",
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.status, "ready");
		assert.ok(Array.isArray(body.supportedModes), "supportedModes должен быть массивом");
		assert.equal(body.supportedModes.length, 5);

		const modeIds = body.supportedModes.map((m: { id: string }) => m.id);
		assert.ok(modeIds.includes("gemini_live"));
		assert.ok(modeIds.includes("gemini_batch"));
		assert.ok(modeIds.includes("gemini_translate"));
		assert.ok(modeIds.includes("groq_whisper"));
		assert.ok(modeIds.includes("browser_speech"));

		assert.ok(body.medicalDictionary.totalTerms > 50, "Медицинский словарь должен содержать ключевые термины");
		await app.close();
	});

	it("POST /api/v1/speech/lab-transcribe parses text, extracts medical entities and calculates telemetry", async () => {
		const app = fastify();
		await registerSpeechLaboratoryRoutes(app);

		const response = await app.inject({
			method: "POST",
			url: "/api/v1/speech/lab-transcribe",
			payload: {
				mode: "gemini_batch",
				text: "Жалобы на зуб 46. Диагноз периодонтит. Анестезия ультракаин, наложен коффердам.",
				diarization: true,
				wordTimestamps: true,
			},
		});

		assert.equal(response.statusCode, 200);
		const body = response.json();
		assert.equal(body.success, true);
		assert.equal(body.mode, "gemini_batch");
		assert.ok(body.medicalEntities.length >= 3, "Должно быть извлечено от 3 медицинских сущностей");
		assert.ok(body.telemetry.latencyMs >= 0);
		assert.ok(body.telemetry.estimatedTokens > 0);

		await app.close();
	});

	it("POST /api/v1/speech/lab-transcribe returns 400 Bad Request on invalid mode", async () => {
		const app = fastify();
		await registerSpeechLaboratoryRoutes(app);

		const response = await app.inject({
			method: "POST",
			url: "/api/v1/speech/lab-transcribe",
			payload: {
				mode: "invalid_unsupported_mode",
			},
		});

		assert.equal(response.statusCode, 400);
		const body = response.json();
		assert.equal(body.error, "InvalidSpeechLabPayload");

		await app.close();
	});
});
