import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
	CARIES_PRESETS,
	CROWN_PRESETS,
	IMPLANT_PRESETS,
	TelegramInteractiveTriageService,
	WHITENING_PRESETS,
} from "../services/telegram/TelegramInteractiveTriageService.js";
import {
	downloadTelegramFile,
	editTelegramMessageReplyMarkup,
	editTelegramMessageText,
	getTelegramFile,
	sendTelegramTextMessage,
} from "../telegramTransport.js";

describe("TelegramInteractiveTriageService & Clinical Triage Engine Suite", () => {
	const originalFetch = globalThis.fetch;
	let tempDir: string;

	beforeEach(() => {
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "triage-test-"));
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		mock.restoreAll();
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	// ========================================================================
	// 1. Clinical Symptom Triage Screens (Russian Clinical Standards)
	// ========================================================================
	describe("1. Clinical Symptom Triage Screens & Medical Invariants", () => {
		it("provides root triage screen with all 5 clinical branches and calculator", () => {
			const screen = TelegramInteractiveTriageService.getRootTriageScreen();

			assert.ok(screen.text.includes("Клинический экспресс-опросник DENTE"));
			const buttons = screen.replyMarkup.inline_keyboard.flat();

			const emergencyBtn = buttons.find((b) => b.callback_data === "triage:emergency");
			const brokenToothBtn = buttons.find((b) => b.callback_data === "triage:broken_tooth");
			const gumsBtn = buttons.find((b) => b.callback_data === "triage:gums");
			const aestheticBtn = buttons.find((b) => b.callback_data === "triage:aesthetic");
			const kidsBtn = buttons.find((b) => b.callback_data === "triage:kids");
			const calcBtn = buttons.find((b) => b.callback_data === "triage:calc:root");
			const humanBtn = buttons.find((b) => b.callback_data === "triage:human_request");
			const homeBtn = buttons.find((b) => b.callback_data === "dente:start");

			assert.ok(emergencyBtn, "Emergency CITO button must exist");
			assert.ok(brokenToothBtn, "Broken tooth button must exist");
			assert.ok(gumsBtn, "Gums button must exist");
			assert.ok(aestheticBtn, "Aesthetic button must exist");
			assert.ok(kidsBtn, "Pediatric button must exist");
			assert.ok(calcBtn, "Calculator button must exist");
			assert.ok(humanBtn, "Human live takeover button must exist");
			assert.ok(homeBtn, "Main menu home button must exist");
		});

		it("enforces pre-medical first aid rules in CITO emergency screen (NO HEAT invariant)", () => {
			const screen = TelegramInteractiveTriageService.getEmergencyScreen();

			assert.ok(screen.text.includes("ЭКСТРЕННАЯ СИТУАЦИЯ (CITO)"));
			// Invariant: Non-heating rule (СтАР / SanPiN)
			assert.match(
				screen.text,
				/КАТЕГОРИЧЕСКИ НЕ ГРЕТЬ ЩЕКУ И ДЕСНУ/,
				"Must strictly forbid warming the affected area to avoid phlegmon",
			);
			assert.match(screen.text, /Холодный компресс/, "Must instruct cold compress application");
			assert.match(screen.text, /НПВП/, "Must mention safe NSAID analgesics");
			assert.match(
				screen.text,
				/Не кладите таблетки на десну/,
				"Must warn against placing pills directly on mucosa (chemical burn risk)",
			);

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			assert.ok(
				buttons.some((b) => b.callback_data === "triage:cito_book"),
				"Must include direct CITO appointment booking button",
			);
			assert.ok(
				buttons.some((b) => b.callback_data === "triage:human_request"),
				"Must include urgent call to clinic button",
			);
		});

		it("provides broken tooth guidance: sharp edge vs acute pulp pain vs photo hint", () => {
			// Root broken tooth
			const rootScreen = TelegramInteractiveTriageService.getBrokenToothScreen();
			assert.ok(rootScreen.text.includes("Откололся зуб или выпала пломба"));
			const rootButtons = rootScreen.replyMarkup.inline_keyboard.flat();
			assert.ok(rootButtons.some((b) => b.callback_data === "triage:tooth_pain"));
			assert.ok(rootButtons.some((b) => b.callback_data === "triage:tooth_sharp"));
			assert.ok(rootButtons.some((b) => b.callback_data === "triage:photo_hint"));

			// Sharp edge substep
			const sharpScreen = TelegramInteractiveTriageService.getBrokenToothScreen("sharp");
			assert.match(sharpScreen.text, /ортодонтического воска|жевательной резинкой/);
			assert.match(sharpScreen.text, /отправить фотографию зуба прямо в этот чат/);

			// Pain substep
			const painScreen = TelegramInteractiveTriageService.getBrokenToothScreen("pain");
			assert.match(painScreen.text, /дентин или сосудисто-нервный пучок/);
			assert.match(painScreen.text, /визиографическим снимком/);
			assert.match(painScreen.text, /операционным микроскопом/);
		});

		it("provides periodontal care: gingivitis, periodontitis, and ultrasonic/AirFlow hygiene", () => {
			const screen = TelegramInteractiveTriageService.getGumsScreen();
			assert.ok(screen.text.includes("Здоровье десен и пародонта"));
			assert.match(screen.text, /гингивита/i);
			assert.match(screen.text, /пародонтита/i);
			assert.match(screen.text, /AirFlow/i);
			assert.match(screen.text, /пародонтограммы/i);

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			assert.ok(buttons.some((b) => b.callback_data === "dente:schedule"));
			assert.ok(buttons.some((b) => b.callback_data === "triage:human_request"));
		});

		it("provides aesthetic dentistry branches: whitening, E.max veneers, orthodontics", () => {
			// Root aesthetic
			const root = TelegramInteractiveTriageService.getAestheticScreen();
			const buttons = root.replyMarkup.inline_keyboard.flat();
			assert.ok(buttons.some((b) => b.callback_data === "triage:aest_color"));
			assert.ok(buttons.some((b) => b.callback_data === "triage:aest_veneers"));
			assert.ok(buttons.some((b) => b.callback_data === "triage:aest_ortho"));

			// Whitening substep
			const color = TelegramInteractiveTriageService.getAestheticScreen("color");
			assert.match(color.text, /FLASH/);
			assert.match(color.text, /Zoom 4/);
			assert.match(color.text, /профессиональная гигиена/);

			// Veneers substep
			const veneers = TelegramInteractiveTriageService.getAestheticScreen("veneers");
			assert.match(veneers.text, /E\.max/);
			assert.match(veneers.text, /0\.3-0\.5 мм/);

			// Orthodontics substep
			const ortho = TelegramInteractiveTriageService.getAestheticScreen("ortho");
			assert.match(ortho.text, /Элайнеры/);
			assert.match(ortho.text, /Damon/);
			assert.match(ortho.text, /3D-моделирование/);
		});

		it("provides pediatric preparation guidance avoiding fear-inducing phrases", () => {
			const screen = TelegramInteractiveTriageService.getKidsScreen();
			assert.ok(screen.text.includes("Бесконфликтная подготовка ребенка"));
			assert.match(screen.text, /Не говорите ребенку «Не бойся!», «Там не больно»/);
			assert.match(screen.text, /волшебное кресло-космолет/);
			assert.match(screen.text, /Первый визит — адаптационный/);
		});
	});

	// ========================================================================
	// 2. Treatment Cost Estimator (3-Click Budget Locking)
	// ========================================================================
	describe("2. Treatment Cost Estimator Catalog & Budget Calculation", () => {
		it("provides root calculator screen with all dental categories", () => {
			const screen = TelegramInteractiveTriageService.getCalculatorRootScreen();
			assert.ok(screen.text.includes("Калькулятор стоимости лечения DENTE"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			assert.ok(buttons.some((b) => b.callback_data === "triage:calc:cat:implant"));
			assert.ok(buttons.some((b) => b.callback_data === "triage:calc:cat:crown"));
			assert.ok(buttons.some((b) => b.callback_data === "triage:calc:cat:caries"));
			assert.ok(buttons.some((b) => b.callback_data === "triage:calc:cat:whitening"));
		});

		it("provides Step 1 of implant calculator with verified implant systems", () => {
			const screen = TelegramInteractiveTriageService.getImplantSystemSelectionScreen();
			assert.ok(screen.text.includes("Шаг 1 из 2"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			for (const imp of IMPLANT_PRESETS) {
				assert.ok(
					buttons.some((b) => b.callback_data === `triage:calc:imp:${imp.code}`),
					`Button for implant system ${imp.brand} must exist`,
				);
			}
		});

		it("provides Step 2 of implant calculator with crown options", () => {
			const screen = TelegramInteractiveTriageService.getImplantCrownSelectionScreen("straumann");
			assert.ok(screen.text.includes("Шаг 2 из 2"));
			assert.ok(screen.text.includes("Straumann SLA (Швейцария)"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			for (const crw of CROWN_PRESETS) {
				assert.ok(
					buttons.some(
						(b) => b.callback_data === `triage:calc:res:imp:straumann:${crw.code}`,
					),
					`Button for crown option ${crw.name} must exist`,
				);
			}
		});

		it("calculates exact turnkey implant budget with transparent stages", () => {
			const imp = IMPLANT_PRESETS.find((p) => p.code === "osstem")!;
			const crw = CROWN_PRESETS.find((c) => c.code === "zirconia")!;
			const expectedTotal = imp.priceRub + crw.priceRub;

			const screen = TelegramInteractiveTriageService.getImplantResultScreen(imp.code, crw.code);
			assert.ok(screen.text.includes("Итоговая смета имплантации «ПОД КЛЮЧ»"));
			assert.ok(screen.text.includes("Хирургический этап:"));
			assert.ok(screen.text.includes("Ортопедический этап:"));
			assert.ok(screen.text.includes(`${expectedTotal.toLocaleString("ru-RU")} ₽`));
			assert.ok(screen.text.includes("Пожизненная"));

			const buttons = screen.replyMarkup.inline_keyboard.flat();
			const lockBtn = buttons.find(
				(b) => b.callback_data === `triage:calc:lock:imp:${imp.code}:${crw.code}`,
			);
			assert.ok(lockBtn, "Lock budget button must exist");
		});

		it("provides crown, caries, and whitening calculators with lock callbacks", () => {
			// Crown
			const crownScreen = TelegramInteractiveTriageService.getCrownCalculatorScreen();
			assert.ok(crownScreen.text.includes("Коронки на зубы"));
			const crownButtons = crownScreen.replyMarkup.inline_keyboard.flat();
			for (const crw of CROWN_PRESETS) {
				assert.ok(
					crownButtons.some((b) => b.callback_data === `triage:calc:lock:crown:${crw.code}`),
				);
			}

			// Caries
			const cariesScreen = TelegramInteractiveTriageService.getCariesCalculatorScreen();
			assert.ok(cariesScreen.text.includes("Лечение кариеса"));
			const cariesButtons = cariesScreen.replyMarkup.inline_keyboard.flat();
			for (const car of CARIES_PRESETS) {
				assert.ok(
					cariesButtons.some((b) => b.callback_data === `triage:calc:lock:caries:${car.code}`),
				);
			}

			// Whitening
			const whiteScreen = TelegramInteractiveTriageService.getWhiteningCalculatorScreen();
			assert.ok(whiteScreen.text.includes("Профессиональное отбеливание зубов"));
			const whiteButtons = whiteScreen.replyMarkup.inline_keyboard.flat();
			for (const w of WHITENING_PRESETS) {
				assert.ok(
					whiteButtons.some((b) => b.callback_data === `triage:calc:lock:white:${w.code}`),
				);
			}
		});
	});

	// ========================================================================
	// 3. Human Live Chat Takeover Mode
	// ========================================================================
	describe("3. Human Live Chat Takeover Mode", () => {
		const orgId = "00000000-0000-0000-0000-000000000001";
		const chatHash = "test_chat_hash_12345";

		it("enables human mode and suppresses automated bot dialog", async () => {
			assert.strictEqual(
				TelegramInteractiveTriageService.isChatInHumanMode(chatHash, orgId),
				false,
			);

			const takeoverScreen = await TelegramInteractiveTriageService.enableHumanMode({
				chatFingerprint: chatHash,
				organizationId: orgId,
				chatId: "123456789",
				reason: "Пациент запросил администратора",
			});

			assert.ok(takeoverScreen.text.includes("Чат переведён на администратора клиники"));
			assert.strictEqual(
				TelegramInteractiveTriageService.isChatInHumanMode(chatHash, orgId),
				true,
			);

			const buttons = takeoverScreen.replyMarkup.inline_keyboard.flat();
			assert.ok(
				buttons.some((b) => b.callback_data === "triage:return_to_bot"),
				"Must include button to return back to bot mode",
			);
		});

		it("returns cleanly to bot mode upon user request", () => {
			const returnScreen = TelegramInteractiveTriageService.returnToBotMode(chatHash, orgId);

			assert.ok(returnScreen.text.includes("Клинический экспресс-опросник DENTE"));
			assert.strictEqual(
				TelegramInteractiveTriageService.isChatInHumanMode(chatHash, orgId),
				false,
			);
		});
	});

	// ========================================================================
	// 4. In-Place UI Callback Query Dispatcher (Zero Chat Landfill)
	// ========================================================================
	describe("4. In-Place UI Callback Query Dispatcher", () => {
		const orgId = "00000000-0000-0000-0000-000000000001";
		const chatHash = "chat_hash_inplace_test";

		it("handles triage:root callback and triggers editTelegramMessageText", async () => {
			let fetchCallCount = 0;
			let editMessageCalled = false;
			let answerCallbackCalled = false;

			globalThis.fetch = mock.fn(async (url: string | URL | Request) => {
				fetchCallCount++;
				const urlStr = String(url);
				if (urlStr.includes("/answerCallbackQuery")) {
					answerCallbackCalled = true;
					return new Response(JSON.stringify({ ok: true, result: true }), { status: 200 });
				}
				if (urlStr.includes("/editMessageText")) {
					editMessageCalled = true;
					return new Response(
						JSON.stringify({ ok: true, result: { message_id: 999 } }),
						{ status: 200 },
					);
				}
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			}) as any;

			const result = await TelegramInteractiveTriageService.handleCallbackQuery({
				callbackData: "triage:root",
				callbackQueryId: "cb_q_123",
				chatFingerprint: chatHash,
				chatId: "12345",
				messageId: 999,
				botToken: "fake_token_123",
				organizationId: orgId,
			});

			assert.strictEqual(result.handled, true);
			assert.ok(result.screen?.text.includes("Клинический экспресс-опросник"));
			assert.strictEqual(editMessageCalled, true, "Must call editMessageText for In-Place UI");
		});

		it("handles implant calculator navigation steps in-place", async () => {
			globalThis.fetch = mock.fn(async () => {
				return new Response(JSON.stringify({ ok: true, result: { message_id: 100 } }), {
					status: 200,
				});
			}) as any;

			// Step 1: select implant category
			const step1 = await TelegramInteractiveTriageService.handleCallbackQuery({
				callbackData: "triage:calc:cat:implant",
				callbackQueryId: null,
				chatFingerprint: chatHash,
				chatId: "12345",
				messageId: 100,
				botToken: "token",
				organizationId: orgId,
			});
			assert.strictEqual(step1.handled, true);
			assert.ok(step1.screen?.text.includes("Шаг 1 из 2"));

			// Step 2: select Straumann implant
			const step2 = await TelegramInteractiveTriageService.handleCallbackQuery({
				callbackData: "triage:calc:imp:straumann",
				callbackQueryId: null,
				chatFingerprint: chatHash,
				chatId: "12345",
				messageId: 100,
				botToken: "token",
				organizationId: orgId,
			});
			assert.strictEqual(step2.handled, true);
			assert.ok(step2.screen?.text.includes("Straumann SLA"));

			// Step 3: calculate result with E.max crown
			const step3 = await TelegramInteractiveTriageService.handleCallbackQuery({
				callbackData: "triage:calc:res:imp:straumann:emax",
				callbackQueryId: null,
				chatFingerprint: chatHash,
				chatId: "12345",
				messageId: 100,
				botToken: "token",
				organizationId: orgId,
			});
			assert.strictEqual(step3.handled, true);
			assert.ok(step3.screen?.text.includes(`${(100000).toLocaleString("ru-RU")} ₽`)); // 65000 + 35000

			// Step 4: lock calculation
			const step4 = await TelegramInteractiveTriageService.handleCallbackQuery({
				callbackData: "triage:calc:lock:imp:straumann:emax",
				callbackQueryId: null,
				chatFingerprint: chatHash,
				chatId: "12345",
				messageId: 100,
				botToken: "token",
				organizationId: orgId,
			});
			assert.strictEqual(step4.handled, true);
			assert.ok(step4.screen?.text.includes("Расчет имплантации зафиксирован"));
		});

		it("falls back to sendTelegramTextMessage when editMessageText fails irreversibly", async () => {
			let editAttempted = false;
			let sendFallbackCalled = false;

			globalThis.fetch = mock.fn(async (url: string | URL | Request) => {
				const urlStr = String(url);
				if (urlStr.includes("/editMessageText")) {
					editAttempted = true;
					return new Response(
						JSON.stringify({
							ok: false,
							description: "Bad Request: message can't be edited",
						}),
						{ status: 400 },
					);
				}
				if (urlStr.includes("/sendMessage")) {
					sendFallbackCalled = true;
					return new Response(
						JSON.stringify({ ok: true, result: { message_id: 1001 } }),
						{ status: 200 },
					);
				}
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			}) as any;

			const result = await TelegramInteractiveTriageService.handleCallbackQuery({
				callbackData: "triage:emergency",
				callbackQueryId: null,
				chatFingerprint: chatHash,
				chatId: "12345",
				messageId: 999,
				botToken: "token",
				organizationId: orgId,
			});

			assert.strictEqual(result.handled, true);
			assert.strictEqual(editAttempted, true);
			assert.strictEqual(sendFallbackCalled, true, "Must fall back to sending new message");
		});

		it("gracefully returns handled: false for non-triage callbacks", async () => {
			const result = await TelegramInteractiveTriageService.handleCallbackQuery({
				callbackData: "some_unrelated_crm_action",
				callbackQueryId: null,
				chatFingerprint: chatHash,
				chatId: "12345",
				messageId: 999,
				botToken: "token",
				organizationId: orgId,
			});

			assert.strictEqual(result.handled, false);
			assert.strictEqual(result.screen, undefined);
		});
	});

	// ========================================================================
	// 5. Media Intake & Secure File Storage
	// ========================================================================
	describe("5. Media Intake & Secure Storage", () => {
		const orgId = "00000000-0000-0000-0000-000000000001";
		const mockJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

		it("downloads photo from Telegram and saves to isolated storage with sha256 hash", async () => {
			globalThis.fetch = mock.fn(async (url: string | URL | Request) => {
				const urlStr = String(url);
				if (urlStr.includes("/getFile")) {
					return new Response(
						JSON.stringify({
							ok: true,
							result: {
								file_id: "photo_file_123",
								file_unique_id: "unique_123",
								file_size: mockJpegBuffer.length,
								file_path: "photos/file_0.jpg",
							},
						}),
						{ status: 200 },
					);
				}
				if (urlStr.includes("/file/bot")) {
					return new Response(mockJpegBuffer, {
						status: 200,
						headers: { "content-type": "image/jpeg" },
					});
				}
				return new Response(JSON.stringify({ ok: true }), { status: 200 });
			}) as any;

			const result = await TelegramInteractiveTriageService.handlePhotoIntake({
				botToken: "fake_token",
				organizationId: orgId,
				chatId: "123456",
				fileId: "photo_file_123",
				caption: "Снимок переднего резца",
				updateId: 8881,
				storageDir: tempDir,
			});

			assert.strictEqual(result.ok, true);
			assert.ok(result.savedPath, "Saved local path must be returned");
			assert.ok(fs.existsSync(result.savedPath!), "File must physically exist on disk");
			const savedContent = fs.readFileSync(result.savedPath!);
			assert.deepStrictEqual(savedContent, mockJpegBuffer);

			assert.ok(result.responseScreen.text.includes("Фотография успешно получена"));
			assert.ok(result.responseScreen.text.includes("152-ФЗ / 323-ФЗ"));
		});

		it("handles Telegram getFile failure with friendly patient advice", async () => {
			globalThis.fetch = mock.fn(async (url: string | URL | Request) => {
				return new Response(
					JSON.stringify({
						ok: false,
						description: "Bad Request: file is too big or expired",
					}),
					{ status: 400 },
				);
			}) as any;

			const result = await TelegramInteractiveTriageService.handlePhotoIntake({
				botToken: "fake_token",
				organizationId: orgId,
				chatId: "123456",
				fileId: "bad_file_id",
				updateId: 8882,
				storageDir: tempDir,
			});

			assert.strictEqual(result.ok, false);
			assert.ok(result.responseScreen.text.includes("не удалось загрузить снимок"));
		});
	});

	// ========================================================================
	// 6. Telegram Transport: editMessageText, getFile & downloadFile
	// ========================================================================
	describe("6. Telegram Transport In-Place & File API Primitives", () => {
		it("editTelegramMessageText blocks medical secrecy violations (152-ФЗ / 323-ФЗ)", async () => {
			const leakResult = await editTelegramMessageText({
				botToken: "token",
				chatId: "123",
				messageId: 5,
				text: "Пациент имеет острый пульпит зуба 46 и кариес",
			});

			assert.strictEqual(leakResult.ok, false);
			assert.strictEqual(leakResult.errorClass, "medical_secrecy_violation");
		});

		it("editTelegramMessageText handles 'message is not modified' gracefully as ok: true", async () => {
			globalThis.fetch = mock.fn(async () => {
				return new Response(
					JSON.stringify({
						ok: false,
						description: "Bad Request: message is not modified: specified new message content and reply markup are exactly the same as a current content and reply markup of the message",
					}),
					{ status: 400 },
				);
			}) as any;

			const result = await editTelegramMessageText({
				botToken: "token",
				chatId: "123",
				messageId: 5,
				text: "Повторный текст меню",
			});

			assert.strictEqual(result.ok, true);
			assert.strictEqual(result.telegramMessageId, 5);
			assert.strictEqual(result.errorClass, null);
		});

		it("editTelegramMessageReplyMarkup handles 'message is not modified' gracefully", async () => {
			globalThis.fetch = mock.fn(async () => {
				return new Response(
					JSON.stringify({
						ok: false,
						description: "Bad Request: message is not modified",
					}),
					{ status: 400 },
				);
			}) as any;

			const result = await editTelegramMessageReplyMarkup({
				botToken: "token",
				chatId: "123",
				messageId: 5,
				replyMarkup: { inline_keyboard: [] },
			});

			assert.strictEqual(result.ok, true);
			assert.strictEqual(result.telegramMessageId, 5);
		});

		it("getTelegramFile returns valid file metadata on 200", async () => {
			globalThis.fetch = mock.fn(async () => {
				return new Response(
					JSON.stringify({
						ok: true,
						result: {
							file_id: "fid_123",
							file_unique_id: "uniq_123",
							file_size: 4096,
							file_path: "documents/file_1.pdf",
						},
					}),
					{ status: 200 },
				);
			}) as any;

			const result = await getTelegramFile({
				botToken: "token",
				fileId: "fid_123",
			});

			assert.strictEqual(result.ok, true);
			if (result.ok) {
				assert.strictEqual(result.filePath, "documents/file_1.pdf");
				assert.strictEqual(result.fileSize, 4096);
			}
		});

		it("downloadTelegramFile handles network error cleanly", async () => {
			globalThis.fetch = mock.fn(async () => {
				return new Response("Not found", { status: 404, statusText: "Not Found" });
			}) as any;

			const result = await downloadTelegramFile({
				botToken: "token",
				filePath: "photos/deleted.jpg",
			});

			assert.strictEqual(result.ok, false);
			if (!result.ok) {
				assert.match(result.error, /HTTP 404/);
			}
		});
	});
});
