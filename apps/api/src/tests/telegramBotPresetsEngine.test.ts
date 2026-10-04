import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	TELEGRAM_BOT_PRESETS,
	TelegramBotPresetsEngine,
} from "../services/telegram/TelegramBotPresets.js";
import { TelegramBotHostingService } from "../services/telegram/TelegramBotHostingService.js";
import type { TelegramBotPresetId } from "@dental/shared";

describe("TelegramBotPresetsEngine & Multi-Tenant SaaS Archetypes", () => {
	// ========================================================================
	// 1. КАТАЛОГ 5 КЛИНИЧЕСКИХ ПРЕСЕТОВ
	// ========================================================================
	describe("1. Catalog of 5 Clinical Presets (Archetypes)", () => {
		const expectedPresetIds: TelegramBotPresetId[] = [
			"premium_implants",
			"family_pediatric",
			"orthodontics",
			"solo_doctor",
			"universal_clinic",
		];

		it("contains all 5 canonical clinic presets", () => {
			const presets = TelegramBotPresetsEngine.listPresets();
			assert.strictEqual(presets.length, 5);

			for (const id of expectedPresetIds) {
				const preset = TELEGRAM_BOT_PRESETS[id];
				assert.ok(preset, `Preset ${id} must exist in TELEGRAM_BOT_PRESETS`);
				assert.strictEqual(preset.id, id);
				assert.ok(preset.name.length > 0, "Name must not be empty");
				assert.ok(preset.tagline.length > 0, "Tagline must not be empty");
				assert.ok(preset.icon.length > 0, "Icon must not be empty");
				assert.ok(preset.description.length > 0, "Description must not be empty");
				assert.ok(preset.shortDescription.length > 0, "Short description must not be empty");
				assert.ok(preset.commands.length >= 4, "Must have at least 4 commands");
				assert.ok(preset.screens.main, "Must have main screen");
			}
		});

		it("validates premium_implants preset specializes in All-on-4 and aesthetics", () => {
			const preset = TelegramBotPresetsEngine.getPreset("premium_implants");
			assert.strictEqual(preset.id, "premium_implants");
			assert.match(preset.description, /All-on-4/i);
			assert.match(preset.description, /виниры/i);
			assert.ok(preset.screens.portfolio, "Must have portfolio screen");
			assert.ok(preset.screens.calculator, "Must have calculator screen");
			assert.ok(preset.screens.chief_doctor, "Must have chief doctor screen");
			assert.ok(preset.screens.coordinator, "Must have personal coordinator screen");
		});

		it("validates family_pediatric preset specializes in kids adaptation and without tears", () => {
			const preset = TelegramBotPresetsEngine.getPreset("family_pediatric");
			assert.strictEqual(preset.id, "family_pediatric");
			assert.match(preset.tagline, /без слёз/i);
			assert.ok(preset.screens.kids_no_tears, "Must have kids no tears screen");
			assert.ok(preset.screens.parents_memo, "Must have parents memo screen");
			assert.ok(preset.screens.family_checkup, "Must have family checkup screen");
			assert.ok(preset.screens.cito_pain, "Must have cito pain screen");
			assert.ok(preset.screens.hygiene_reminder, "Must have hygiene reminder screen");
		});

		it("validates orthodontics preset provides braces vs aligners and SOS guide", () => {
			const preset = TelegramBotPresetsEngine.getPreset("orthodontics");
			assert.strictEqual(preset.id, "orthodontics");
			assert.ok(preset.screens.braces_or_aligners_test, "Must have braces vs aligners screen");
			assert.ok(preset.screens.aligner_tracker, "Must have aligners tracker screen");
			assert.ok(preset.screens.sos_bracket_emergency, "Must have SOS detached bracket screen");
		});

		it("validates solo_doctor preset focuses on doctor bio, transparent prices and slots", () => {
			const preset = TelegramBotPresetsEngine.getPreset("solo_doctor");
			assert.strictEqual(preset.id, "solo_doctor");
			assert.ok(preset.screens.about_doctor, "Must have doctor bio screen");
			assert.ok(preset.screens.free_slots, "Must have free slots screen");
			assert.ok(preset.screens.ask_doctor, "Must have direct doctor communication screen");
		});

		it("validates universal_clinic preset provides full-spectrum routing and reviews", () => {
			const preset = TelegramBotPresetsEngine.getPreset("universal_clinic");
			assert.strictEqual(preset.id, "universal_clinic");
			assert.ok(preset.screens.services, "Must have services screen");
			assert.ok(preset.screens.reviews, "Must have reviews screen");
			assert.ok(preset.screens.directions, "Must have directions screen");
		});

		it("falls back to universal_clinic for unknown preset ID", () => {
			// @ts-expect-error Testing invalid fallback
			const preset = TelegramBotPresetsEngine.getPreset("non_existent_preset");
			assert.strictEqual(preset.id, "universal_clinic");
		});
	});

	// ========================================================================
	// 2. ДВИЖОК IN-PLACE НАВИГАЦИИ (ZERO CHAT LANDFILL)
	// ========================================================================
	describe("2. In-Place Screen Resolution & Back Navigation", () => {
		it("resolves main screen without duplicate back buttons", () => {
			const resolved = TelegramBotPresetsEngine.resolveScreen("premium_implants", "main");
			assert.ok(resolved.text.includes("Центр цифровой имплантологии"));
			assert.ok(resolved.replyMarkup.inline_keyboard.length > 0);

			// На главном экране нет кнопки « Назад
			const allButtons = resolved.replyMarkup.inline_keyboard.flat();
			const hasBack = allButtons.some((b) => b.text.includes("« Назад"));
			assert.strictEqual(hasBack, false, "Main screen should not have back button");
		});

		it("appends « Назад and 🏠 Главное меню to sub-screens", () => {
			const resolved = TelegramBotPresetsEngine.resolveScreen("premium_implants", "portfolio");
			assert.ok(resolved.text.includes("Портфолио"));

			const keyboard = resolved.replyMarkup.inline_keyboard;
			const lastRow = keyboard[keyboard.length - 1];
			assert.ok(lastRow, "Must have navigation row at the bottom");

			const backBtn = lastRow.find((b) => b.text === "« Назад");
			const homeBtn = lastRow.find((b) => b.text === "🏠 Главное меню");

			assert.ok(backBtn, "Back button must exist on sub-screen");
			assert.ok(homeBtn, "Home button must exist on sub-screen");
			assert.strictEqual(backBtn.callback_data, "preset_nav:premium_implants:main");
			assert.strictEqual(homeBtn.callback_data, "preset_nav:premium_implants:main");
		});

		it("falls back to main screen if unknown screenId is requested", () => {
			const resolved = TelegramBotPresetsEngine.resolveScreen("orthodontics", "unknown_screen_123");
			assert.ok(resolved.text.length > 0);
			assert.ok(resolved.replyMarkup.inline_keyboard.length > 0);
		});
	});

	// ========================================================================
	// 3. КЛИНИЧЕСКИЙ ТРИАЖ СИМПТОМОВ И CITO МАРКЕР
	// ========================================================================
	describe("3. Clinical Symptom Triage & CITO Protocol", () => {
		it("tags acute pain as cito_emergency and provides strict medical advice (no warming)", () => {
			const result = TelegramBotPresetsEngine.evaluateTriageSymptom("acute_pain_cito");
			assert.strictEqual(result.severity, "cito_emergency");
			assert.strictEqual(result.isCito, true);
			assert.strictEqual(result.suggestedSlotType, "emergency_cito_slot");
			assert.ok(result.alertStaffText?.includes("CITO"));

			const adviceCombined = result.firstAidAdvice.join(" ");
			assert.match(adviceCombined, /НЕ ГРЕЙТЕ ЩЕКУ/i);
			assert.match(adviceCombined, /НПВП|Ибупрофен/i);
			assert.match(adviceCombined, /холодный компресс/i);
		});

		it("tags broken tooth as urgent_same_day with sharp edge protection advice", () => {
			const result = TelegramBotPresetsEngine.evaluateTriageSymptom("broken_tooth_restoration");
			assert.strictEqual(result.severity, "urgent_same_day");
			assert.strictEqual(result.isCito, false);
			assert.strictEqual(result.suggestedSlotType, "therapy_restoration_slot");

			const adviceCombined = result.firstAidAdvice.join(" ");
			assert.match(adviceCombined, /острый край/i);
			assert.match(adviceCombined, /фото скола/i);
		});

		it("tags gum bleeding as routine_planned hygiene slot", () => {
			const result = TelegramBotPresetsEngine.evaluateTriageSymptom("gum_bleeding_perio");
			assert.strictEqual(result.severity, "routine_planned");
			assert.strictEqual(result.isCito, false);
			assert.strictEqual(result.suggestedSlotType, "hygiene_perio_slot");
		});

		it("routes kids visit without tears to pediatric adaptation slot", () => {
			const result = TelegramBotPresetsEngine.evaluateTriageSymptom("kids_adaptation_visit");
			assert.strictEqual(result.severity, "routine_planned");
			assert.strictEqual(result.suggestedSlotType, "pediatric_adaptation_slot");
			assert.match(result.firstAidAdvice.join(" "), /не бойся/i);
		});

		it("routes orthodontic request to 3D scan slot", () => {
			const result = TelegramBotPresetsEngine.evaluateTriageSymptom("orthodontic_alignment");
			assert.strictEqual(result.severity, "routine_planned");
			assert.strictEqual(result.suggestedSlotType, "orthodontic_scan_slot");
		});
	});

	// ========================================================================
	// 4. ПОСЛЕОПЕРАЦИОННЫЙ ОПРОС (DAY 1 / DAY 3 RECOVERY SURVEY)
	// ========================================================================
	describe("4. Post-Op Recovery Survey Engine", () => {
		it("confirms normal Day 1 recovery when pain is mild and no red flags", () => {
			const result = TelegramBotPresetsEngine.evaluatePostOpSurvey({
				day: 1,
				painScore: 2,
				hasFever: false,
				hasHeavyBleeding: false,
				hasSevereSwelling: false,
			});

			assert.strictEqual(result.isCriticalAlert, false);
			assert.strictEqual(result.requiresSameDayCallback, false);
			assert.strictEqual(result.alertDoctorText, null);
			assert.match(result.patientMessage, /восстановление проходит по плану/i);
			assert.match(result.patientMessage, /Холод к щеке/i);
		});

		it("triggers critical alert on Day 1 if painScore >= 4", () => {
			const result = TelegramBotPresetsEngine.evaluatePostOpSurvey({
				day: 1,
				painScore: 5,
				hasFever: false,
				hasHeavyBleeding: false,
			});

			assert.strictEqual(result.isCriticalAlert, true);
			assert.strictEqual(result.requiresSameDayCallback, true);
			assert.ok(result.alertDoctorText?.includes("высокий уровень боли (5/5)"));
			assert.match(result.patientMessage, /передано дежурному врачу/i);
			assert.match(result.patientMessage, /Не грейте место операции/i);
		});

		it("triggers critical alert on Day 1 if patient has fever > 38°C", () => {
			const result = TelegramBotPresetsEngine.evaluatePostOpSurvey({
				day: 1,
				painScore: 2,
				hasFever: true,
			});

			assert.strictEqual(result.isCriticalAlert, true);
			assert.ok(result.alertDoctorText?.includes("температура выше 38°C"));
		});

		it("triggers critical alert on Day 3 if patient has severe swelling or heavy bleeding", () => {
			const result = TelegramBotPresetsEngine.evaluatePostOpSurvey({
				day: 3,
				painScore: 2,
				hasSevereSwelling: true,
				hasHeavyBleeding: true,
			});

			assert.strictEqual(result.isCriticalAlert, true);
			assert.ok(result.alertDoctorText?.includes("продолжающееся кровотечение"));
			assert.ok(result.alertDoctorText?.includes("нарастающий отек на 3-й день"));
		});

		it("confirms normal Day 3 recovery when swelling is subsiding and pain is 1", () => {
			const result = TelegramBotPresetsEngine.evaluatePostOpSurvey({
				day: 3,
				painScore: 1,
				hasFever: false,
				hasHeavyBleeding: false,
				hasSevereSwelling: false,
			});

			assert.strictEqual(result.isCriticalAlert, false);
			assert.match(result.patientMessage, /плавно спадать/i);
		});
	});

	// ========================================================================
	// 5. ИНСТРУКЦИЯ ОНБОРДИНГА @BotFather ЗА 2 МИНУТЫ
	// ========================================================================
	describe("5. 2-Minute BotFather Onboarding Guide Generator", () => {
		it("generates 3-step markdown guide with preset-specific details", () => {
			const guide = TelegramBotPresetsEngine.getBotFatherGuideMarkdown("solo_doctor");
			assert.match(guide, /Шаг 1\. Откройте официальный бот Telegram @BotFather/);
			assert.match(guide, /Шаг 2\. Создайте нового бота/);
			assert.match(guide, /Шаг 3\. Скопируйте API токен и вставьте в CRM/);
			assert.match(guide, /setMyCommands/);
			assert.match(guide, /setMyDescription/);
			assert.match(guide, /Соло-доктор/);
		});
	});

	// ========================================================================
	// 6. PIPELINE ПРИМЕНЕНИЯ ПРЕСЕТА К БОТУ (MOCKED FETCH)
	// ========================================================================
	describe("6. Apply Preset to Bot Pipeline", () => {
		const originalFetch = globalThis.fetch;

		afterEach(() => {
			globalThis.fetch = originalFetch;
		});

		it("orchestrates getMe, setMyCommands, setMyDescription, setMyShortDescription and setupWebhook", async () => {
			const calls: string[] = [];

			globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
				const url = String(input);
				calls.push(url);

				if (url.includes("/getMe")) {
					return new Response(
						JSON.stringify({
							ok: true,
							result: {
								id: 987654321,
								is_bot: true,
								first_name: "DentElite Clinic Bot",
								username: "dentelite_bot",
							},
						}),
						{ status: 200, headers: { "content-type": "application/json" } },
					);
				}

				if (
					url.includes("/setMyCommands") ||
					url.includes("/setMyDescription") ||
					url.includes("/setMyShortDescription") ||
					url.includes("/setWebhook")
				) {
					return new Response(
						JSON.stringify({ ok: true, result: true }),
						{ status: 200, headers: { "content-type": "application/json" } },
					);
				}

				return new Response(JSON.stringify({ ok: false }), { status: 404 });
			};

			const result = await TelegramBotHostingService.applyPresetToBot({
				organizationId: "00000000-0000-0000-0000-000000000001",
				presetId: "premium_implants",
				botToken: "123456789:ABCDefgh_mock_token",
				webhookUrl: "https://clinic.example.com/api/telegram/webhook",
				secretToken: "mock_secret_123",
			});

			assert.strictEqual(result.ok, true);
			assert.strictEqual(result.botUsername, "dentelite_bot");
			assert.strictEqual(result.commandsConfigured, true);
			assert.strictEqual(result.descriptionConfigured, true);
			assert.strictEqual(result.shortDescriptionConfigured, true);
			assert.strictEqual(result.webhookConfigured, true);
			assert.strictEqual(result.preset.id, "premium_implants");

			assert.ok(calls.some((u) => u.includes("/getMe")), "Must call getMe");
			assert.ok(calls.some((u) => u.includes("/setMyCommands")), "Must call setMyCommands");
			assert.ok(calls.some((u) => u.includes("/setMyDescription")), "Must call setMyDescription");
			assert.ok(calls.some((u) => u.includes("/setMyShortDescription")), "Must call setMyShortDescription");
			assert.ok(calls.some((u) => u.includes("/setWebhook")), "Must call setWebhook");
		});

		it("fails fast if getMe fails on invalid token", async () => {
			globalThis.fetch = async () => {
				return new Response(
					JSON.stringify({ ok: false, error_code: 401, description: "Unauthorized" }),
					{ status: 401, headers: { "content-type": "application/json" } },
				);
			};

			const result = await TelegramBotHostingService.applyPresetToBot({
				organizationId: "00000000-0000-0000-0000-000000000001",
				presetId: "solo_doctor",
				botToken: "123456789:invalid_token",
			});

			assert.strictEqual(result.ok, false);
			assert.strictEqual(result.commandsConfigured, false);
			assert.match(result.error ?? "", /Unauthorized|Telegram Bot API отклонил токен/);
		});
	});
});
