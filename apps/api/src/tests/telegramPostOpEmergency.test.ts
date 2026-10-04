import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { TelegramEmergencyEscalationService } from "../services/telegram/TelegramEmergencyEscalationService.js";
import { TelegramPostOpCarePipeline } from "../services/telegram/TelegramPostOpCarePipeline.js";
import { TelegramRedFlagDetector } from "../services/telegram/TelegramRedFlagDetector.js";
import { TelegramVoiceIntakeService } from "../services/telegram/TelegramVoiceIntakeService.js";
import { wsBroker } from "../services/websocketBroker.js";

describe("Telegram Voice Intake, Post-Op Tele-Care & Red Flag Emergency Suite", () => {
	const originalFetch = globalThis.fetch;
	let tempDir: string;
	const orgId = "00000000-0000-0000-0000-000000000001";

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "voice-postop-test-"));
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		mock.restoreAll();
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	// ========================================================================
	// 1. ДЕТЕКТОР КРАСНЫХ ФЛАГОВ (RED FLAG DETECTOR)
	// ========================================================================
	describe("1. Red Flag Emergency Detector (4 Critical Surgical Syndromes)", () => {
		it("detects FEVER_CRITICAL when body temperature exceeds 38.2°C", () => {
			const texts = [
				"У меня поднялась температура 38.5, очень сильно знобит",
				"Температура 39, горит все тело после удаления",
				"Замерил градусником, температура 38.4 градуса",
			];

			for (const text of texts) {
				const res = TelegramRedFlagDetector.evaluateText(text);
				assert.strictEqual(res.hasRedFlags, true);
				const feverFlag = res.flags.find((f) => f.code === "FEVER_CRITICAL");
				assert.ok(feverFlag, `Should detect FEVER_CRITICAL for text: "${text}"`);
				assert.strictEqual(feverFlag.severity, "CRITICAL");
				assert.match(res.patientEmergencyAdvice, /КАТЕГОРИЧЕСКИ НЕ ГРЕТЬ/i);
				assert.match(res.doctorAlertSummary, /КРИТИЧЕСКАЯ ГИПЕРТЕРМИЯ/i);
			}
		});

		it("detects PROLONGED_BLEEDING when bleeding persists over 3 hours", () => {
			const texts = [
				"Кровь идет уже 4 часа и не останавливается, полный рот крови",
				"Не останавливается кровотечение уже больше 3 часов после операции",
				"Кровит непрерывно с обеда, уже пятый час",
			];

			for (const text of texts) {
				const res = TelegramRedFlagDetector.evaluateText(text);
				assert.strictEqual(res.hasRedFlags, true);
				const bleedFlag = res.flags.find((f) => f.code === "PROLONGED_BLEEDING");
				assert.ok(bleedFlag, `Should detect PROLONGED_BLEEDING for: "${text}"`);
				assert.strictEqual(bleedFlag.severity, "CRITICAL");
				assert.match(res.patientEmergencyAdvice, /тампон/i);
				assert.match(res.patientEmergencyAdvice, /Не полощите рот/i);
			}
		});

		it("detects NERVE_PARESTHESIA for lip/chin numbness (inferior alveolar nerve risk)", () => {
			const texts = [
				"Онемела нижняя губа и подбородок, совсем их не чувствую",
				"После имплантации онемение губы не проходит, как замороженная",
				"Вторые сутки не чувствую подбородок, кажется парестезия",
			];

			for (const text of texts) {
				const res = TelegramRedFlagDetector.evaluateText(text);
				assert.strictEqual(res.hasRedFlags, true);
				const nerveFlag = res.flags.find((f) => f.code === "NERVE_PARESTHESIA");
				assert.ok(nerveFlag, `Should detect NERVE_PARESTHESIA for: "${text}"`);
				assert.strictEqual(nerveFlag.severity, "CRITICAL");
				assert.match(feverExplanation(nerveFlag.clinicalExplanation), /нижнеальвеолярн[а-яё]*\s+нерв/i);
			}

			function feverExplanation(text: string): string {
				return text;
			}
		});

		it("detects LUDWIG_ANGINA_RISK as LIFE_THREATENING when neck swelling or dysphagia occurs", () => {
			const texts = [
				"Отек спустился на шею, трудно глотать и тяжело дышать",
				"Шея распухла под челюстью, рот не могу открыть, задыхаюсь",
				"Плотный горячий отек шеи, трудно глотать слюну",
			];

			for (const text of texts) {
				const res = TelegramRedFlagDetector.evaluateText(text);
				assert.strictEqual(res.hasRedFlags, true);
				assert.strictEqual(res.highestSeverity, "LIFE_THREATENING");
				const ludwigFlag = res.flags.find((f) => f.code === "LUDWIG_ANGINA_RISK");
				assert.ok(ludwigFlag, `Should detect LUDWIG_ANGINA_RISK for: "${text}"`);
				assert.match(res.patientEmergencyAdvice, /полусидячее положение/i);
				assert.match(res.patientEmergencyAdvice, /112|103/i);
			}
		});

		it("returns hasRedFlags: false for normal post-op sensations", () => {
			const normalTexts = [
				"Всё хорошо, анестезия отошла, немного ноет",
				"Температура 36.6, отдыхаю дома",
				"Принял ибупрофен, боль утихла, спасибо",
			];

			for (const text of normalTexts) {
				const res = TelegramRedFlagDetector.evaluateText(text);
				assert.strictEqual(res.hasRedFlags, false);
				assert.strictEqual(res.flags.length, 0);
				assert.strictEqual(res.highestSeverity, null);
			}
		});

		it("evaluates structured survey inputs correctly", () => {
			const surveyWithNerve = TelegramRedFlagDetector.evaluateSurvey({ lipNumbness: true });
			assert.strictEqual(surveyWithNerve.hasRedFlags, true);
			assert.ok(surveyWithNerve.flags.some((f) => f.code === "NERVE_PARESTHESIA"));

			const surveyWithLudwig = TelegramRedFlagDetector.evaluateSurvey({ neckSwelling: true, swallowingPain: true });
			assert.strictEqual(surveyWithLudwig.highestSeverity, "LIFE_THREATENING");
			assert.ok(surveyWithLudwig.flags.some((f) => f.code === "LUDWIG_ANGINA_RISK"));

			const surveyWithFever = TelegramRedFlagDetector.evaluateSurvey({ tempC: 38.6 });
			assert.strictEqual(surveyWithFever.hasRedFlags, true);
			assert.ok(surveyWithFever.flags.some((f) => f.code === "FEVER_CRITICAL"));
		});
	});

	// ========================================================================
	// 2. АВАРИЙНЫЙ SOS-ЭСКАЛАТОР (EMERGENCY ESCALATION SERVICE)
	// ========================================================================
	describe("2. Emergency Escalation Service & WebSocket Broadcasts", () => {
		it("broadcasts EMERGENCY_COMPLICATION_ALERT to WebSocket and builds emergency UI screen", async () => {
			let wsBroadcastPayload: any = null;
			const origBroadcast = wsBroker.broadcastToOrganization;
			wsBroker.broadcastToOrganization = (org, msg) => {
				wsBroadcastPayload = { org, msg };
			};

			try {
				const redFlagResult = TelegramRedFlagDetector.evaluateSurvey({ neckSwelling: true });
				const escResult = await TelegramEmergencyEscalationService.escalateEmergency({
					organizationId: orgId,
					chatId: "chat_999",
					source: "postop_survey",
					redFlagResult,
					rawMessageText: "Плотный отек под челюстью",
				});

				assert.strictEqual(escResult.isBroadcasted, true);
				assert.ok(wsBroadcastPayload, "WebSocket broadcast must be triggered");
				assert.strictEqual(wsBroadcastPayload.org, orgId);
				assert.strictEqual(wsBroadcastPayload.msg.type, "EMERGENCY_COMPLICATION_ALERT");
				assert.strictEqual(wsBroadcastPayload.msg.payload.severity, "LIFE_THREATENING");

				// Проверка UI кнопок экстренного экрана
				const buttons = escResult.emergencyScreen.replyMarkup.inline_keyboard.flat();
				const doctorCallBtn = buttons.find((b) => b.callback_data === "triage:human_request");
				const emergency112Btn = buttons.find((b) => b.url === "tel:112");
				const memoBtn = buttons.find((b) => b.callback_data === "postop:memo_emergency");

				assert.ok(doctorCallBtn, "Must include direct button to contact clinic doctor");
				assert.ok(emergency112Btn, "Must include direct tel:112 button for life-threatening events");
				assert.ok(memoBtn, "Must include pre-medical emergency memo button");
			} finally {
				wsBroker.broadcastToOrganization = origBroadcast;
			}
		});
	});

	// ========================================================================
	// 3. ГОЛОСОВОЙ ПРИЁМ ОБРАЩЕНИЙ (VOICE INTAKE & TRANSCRIPTION)
	// ========================================================================
	describe("3. Voice Note Intake Service & Symptom Extraction", () => {
		it("extracts dental symptoms and pain intensity accurately", () => {
			const sample1 = "Ужасно болит зуб снизу, стреляет и пульсирует, нестерпимая боль";
			const sym1 = TelegramVoiceIntakeService.extractSymptoms(sample1);
			assert.strictEqual(sym1.hasSymptomSignal, true);
			assert.ok(sym1.categories.includes("pain"));
			assert.ok(sym1.categories.includes("tooth"));
			assert.strictEqual(sym1.painIntensity, "severe");

			const sample2 = "Опухла щека, кажется флюс, температура 38 с половиной";
			const sym2 = TelegramVoiceIntakeService.extractSymptoms(sample2);
			assert.ok(sym2.categories.includes("swelling"));
			assert.ok(sym2.categories.includes("fever"));

			const sample3 = "Кровь сочится из лунки после удаления восьмерки";
			const sym3 = TelegramVoiceIntakeService.extractSymptoms(sample3);
			assert.ok(sym3.categories.includes("bleeding"));
			assert.ok(sym3.categories.includes("tooth"));

			const sample4 = "Не чувствую подбородок, онемела губа";
			const sym4 = TelegramVoiceIntakeService.extractSymptoms(sample4);
			assert.ok(sym4.categories.includes("numbness"));
		});

		it("downloads voice file from Telegram, runs transcription and triggers emergency when red flag is spoken", async () => {
			const mockOggBuffer = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]); // OggS header

			globalThis.fetch = mock.fn(async (url: string | URL | Request) => {
				const urlStr = String(url);
				if (urlStr.includes("/getFile")) {
					return new Response(
						JSON.stringify({
							ok: true,
							result: {
								file_id: "voice_file_001",
								file_unique_id: "uniq_voice_001",
								file_size: mockOggBuffer.length,
								file_path: "voice/msg_001.oga",
							},
						}),
						{ status: 200 },
					);
				}
				if (urlStr.includes("/file/bot")) {
					return new Response(mockOggBuffer, {
						status: 200,
						headers: { "content-type": "audio/ogg" },
					});
				}
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			}) as any;

			// Транскрибер расшифровывает тревожное голосовое
			const mockTranscriber = async () =>
				"Здравствуйте, я после удаления зуба, у меня температура 38.6 и очень сильно опухла шея, трудно глотать";

			const intakeResult = await TelegramVoiceIntakeService.handleVoiceIntake({
				botToken: "test_bot_token",
				organizationId: orgId,
				chatId: "chat_patient_voice",
				fileId: "voice_file_001",
				duration: 12,
				updateId: 7771,
				storageDir: tempDir,
				transcriber: mockTranscriber,
			});

			assert.strictEqual(intakeResult.ok, true);
			assert.ok(intakeResult.savedLocalPath, "Local audio file must be saved");
			assert.ok(fs.existsSync(intakeResult.savedLocalPath!), "Audio file must exist on disk");
			assert.strictEqual(intakeResult.isEmergency, true);
			assert.strictEqual(intakeResult.redFlags.hasRedFlags, true);
			assert.ok(intakeResult.escalation, "Must return escalation result for critical voice");

			// Проверка экрана для пациента
			assert.match(intakeResult.responseScreen.text, /ТРЕВОЖНЫЙ СИГНАЛ|ВНИМАНИЕ/i);
		});

		it("processes non-emergency routine voice message smoothly", async () => {
			const mockOggBuffer = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0x00, 0x02]);

			globalThis.fetch = mock.fn(async (url: string | URL | Request) => {
				const urlStr = String(url);
				if (urlStr.includes("/getFile")) {
					return new Response(
						JSON.stringify({
							ok: true,
							result: {
								file_id: "voice_file_002",
								file_unique_id: "uniq_voice_002",
								file_size: mockOggBuffer.length,
								file_path: "voice/msg_002.oga",
							},
						}),
						{ status: 200 },
					);
				}
				if (urlStr.includes("/file/bot")) {
					return new Response(mockOggBuffer, {
						status: 200,
						headers: { "content-type": "audio/ogg" },
					});
				}
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			}) as any;

			const mockTranscriber = async () =>
				"Здравствуйте, хочу записаться на чистку зубов на субботу";

			const intakeResult = await TelegramVoiceIntakeService.handleVoiceIntake({
				botToken: "test_bot_token",
				organizationId: orgId,
				chatId: "chat_routine_voice",
				fileId: "voice_file_002",
				duration: 8,
				updateId: 7772,
				storageDir: tempDir,
				transcriber: mockTranscriber,
			});

			assert.strictEqual(intakeResult.ok, true);
			assert.strictEqual(intakeResult.isEmergency, false);
			assert.match(intakeResult.responseScreen.text, /Голосовое сообщение принято и расшифровано/i);
			assert.match(intakeResult.responseScreen.text, /чистку зубов/i);
		});
	});

	// ========================================================================
	// 4. УМНЫЙ 4-ЭТАПНЫЙ ПАЙПЛАЙН ТЕЛЕ-УХОДА (POST-OP CARE PIPELINE)
	// ========================================================================
	describe("4. Post-Surgery Tele-Care Pipeline & 4-Stage Protocol", () => {
		it("detects complex surgical procedures correctly", () => {
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Дентальная имплантация Osstem"), true);
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Открытый синус-лифтинг верхней челюсти"), true);
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Сложное удаление ретинированного зуба 8"), true);
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Костная пластика и расщепление гребня"), true);
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Тотальная реабилитация All-on-4"), true);

			// Рутинные манипуляции не должны триггерить хирургический протокол
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Профессиональная гигиена AirFlow"), false);
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Лечение среднего кариеса 24 зуба"), false);
			assert.strictEqual(TelegramPostOpCarePipeline.isComplexSurgery("Консультация ортодонта"), false);
		});

		it("schedules 4-stage post-op care plan with exact clinical intervals (3h, 24h, 72h, 7d)", () => {
			const now = Date.now();
			const plan = TelegramPostOpCarePipeline.schedulePostOpCareForVisit({
				organizationId: orgId,
				visitId: "visit_surg_101",
				patientId: "patient_001",
				surgeryTitle: "Имплантация Straumann",
				surgeryCompletedAt: now,
			});

			assert.strictEqual(plan.stages.length, 4);
			assert.strictEqual(plan.stages[0]!.stage, "3_hours");
			assert.strictEqual(plan.stages[0]!.dueAt, now + 3 * 3600 * 1000);

			assert.strictEqual(plan.stages[1]!.stage, "day_1");
			assert.strictEqual(plan.stages[1]!.dueAt, now + 24 * 3600 * 1000);

			assert.strictEqual(plan.stages[2]!.stage, "day_3");
			assert.strictEqual(plan.stages[2]!.dueAt, now + 72 * 3600 * 1000);

			assert.strictEqual(plan.stages[3]!.stage, "day_7");
			assert.strictEqual(plan.stages[3]!.dueAt, now + 7 * 24 * 3600 * 1000);
		});

		it("renders each stage screen with rigorous clinical advice", () => {
			// Stage 1: 3 hours
			const screen3h = TelegramPostOpCarePipeline.get3HoursScreen("Удаление зуба 38");
			assert.match(screen3h.text, /Через 3 часа после операции/i);
			assert.match(screen3h.text, /Отошла ли анестезия/i);
			const btns3h = screen3h.replyMarkup.inline_keyboard.flat();
			assert.ok(btns3h.some((b) => b.callback_data === "postop:3h:ok"));
			assert.ok(btns3h.some((b) => b.callback_data === "postop:3h:numbness"));

			// Stage 2: Day 1
			const screenDay1 = TelegramPostOpCarePipeline.getDay1Screen();
			assert.match(screenDay1.text, /День 1 после операции/i);
			assert.match(screenDay1.text, /шкале от 1 до 5/i);
			const btnsDay1 = screenDay1.replyMarkup.inline_keyboard.flat();
			assert.ok(btnsDay1.some((b) => b.callback_data === "postop:day1:score:5"));
			assert.ok(btnsDay1.some((b) => b.callback_data === "postop:day1:fever"));

			// Stage 3: Day 3 (Peak Swelling Invariant)
			const screenDay3 = TelegramPostOpCarePipeline.getDay3Screen();
			assert.match(screenDay3.text, /День 3 после операции: пик естественного отёка/i);
			assert.match(screenDay3.text, /ГРЕТЬ ЩЁКУ КАТЕГОРИЧЕСКИ НЕЛЬЗЯ/i);
			const btnsDay3 = screenDay3.replyMarkup.inline_keyboard.flat();
			assert.ok(btnsDay3.some((b) => b.callback_data === "postop:day3:neck_swelling"));

			// Stage 4: Day 7 (Suture removal)
			const screenDay7 = TelegramPostOpCarePipeline.getDay7Screen();
			assert.match(screenDay7.text, /День 7 после вмешательства: снятие швов/i);

			// Emergency Memo: What is forbidden
			const memo = TelegramPostOpCarePipeline.getEmergencyMemoScreen();
			assert.match(memo.text, /НЕ ГРЕТЬ/i);
			assert.match(memo.text, /НЕ ПОЛОСКАТЬ АКТИВНО/i);
			assert.match(memo.text, /НЕ ПРИНИМАТЬ АСПИРИН/i);
		});

		it("handles patient callbacks and routes red flags to emergency escalation", async () => {
			// 1. Нормальный ответ на 3 часа
			const normalRes = await TelegramPostOpCarePipeline.handlePostOpCallback({
				callbackData: "postop:3h:ok",
				callbackQueryId: null,
				chatFingerprint: "chat_fp_1",
				chatId: "123",
				messageId: null,
				botToken: "",
				organizationId: orgId,
			});
			assert.strictEqual(normalRes.handled, true);
			assert.strictEqual(normalRes.isEmergency, false);
			assert.match(normalRes.screen!.text, /Восстановление идёт строго по плану/i);

			// 2. Тревожный ответ на 3 часа: онемение губы/подбородка
			const numbRes = await TelegramPostOpCarePipeline.handlePostOpCallback({
				callbackData: "postop:3h:numbness",
				callbackQueryId: null,
				chatFingerprint: "chat_fp_1",
				chatId: "123",
				messageId: null,
				botToken: "",
				organizationId: orgId,
			});
			assert.strictEqual(numbRes.handled, true);
			assert.strictEqual(numbRes.isEmergency, true);
			assert.match(numbRes.screen!.text, /Онемение нижней губы/i);

			// 3. Тревожный ответ на День 3: плотный отёк шеи (ангина Людвига)
			const neckRes = await TelegramPostOpCarePipeline.handlePostOpCallback({
				callbackData: "postop:day3:neck_swelling",
				callbackQueryId: null,
				chatFingerprint: "chat_fp_1",
				chatId: "123",
				messageId: null,
				botToken: "",
				organizationId: orgId,
			});
			assert.strictEqual(neckRes.handled, true);
			assert.strictEqual(neckRes.isEmergency, true);
			assert.match(neckRes.screen!.text, /риск ангины Людвига/i);

			// 4. Оценка боли 5/5 на День 1
			const painRes = await TelegramPostOpCarePipeline.handlePostOpCallback({
				callbackData: "postop:day1:score:5",
				callbackQueryId: null,
				chatFingerprint: "chat_fp_1",
				chatId: "123",
				messageId: null,
				botToken: "",
				organizationId: orgId,
			});
			assert.strictEqual(painRes.handled, true);
			assert.strictEqual(painRes.isEmergency, true);
		});
	});
});
