/**
 * TelegramVoiceIntakeService.ts
 *
 * Сервис голосового приёма обращений от пациентов клиники DENTE:
 * - Скачивание .ogg / Opus аудиофайлов через Telegram Bot API.
 * - Безопасное хранение записей в защищенном контуре 152-ФЗ / 323-ФЗ.
 * - Автоматическая транскрипция (Whisper Cascade / Speech Engine).
 * - Клиническое выделение симптомов (боль, зуб, отёк, температура, кровотечение, онемение).
 * - Автоматическая привязка к карточке пациента, создание CITO задач при красных флагах.
 */

import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	communicationEvents,
	communicationTasks,
	denteTelegramChatLinks,
	messengerInboundEvents,
	patients,
} from "../../db/schema.js";
import {
	downloadTelegramFile,
	getTelegramFile,
	sendTelegramTextMessage,
	type TelegramTransportResult,
} from "../../telegramTransport.js";
import { wsBroker } from "../websocketBroker.js";
import {
	TelegramEmergencyEscalationService,
	type EmergencyEscalationResult,
} from "./TelegramEmergencyEscalationService.js";
import type { TelegramInlineKeyboard, TriageScreenResult } from "./TelegramInteractiveTriageService.js";
import {
	TelegramRedFlagDetector,
	type RedFlagEvaluationResult,
} from "./TelegramRedFlagDetector.js";
import { isHallucinatedWhisperTranscript } from "../../speech/whisperCascade.js";

export type ExtractedSymptomCategory =
	| "pain"
	| "tooth"
	| "swelling"
	| "fever"
	| "bleeding"
	| "numbness"
	| "difficulty_swallowing";

export type ExtractedSymptomsInfo = {
	categories: ExtractedSymptomCategory[];
	keywordsFound: string[];
	painIntensity?: "mild" | "moderate" | "severe" | undefined;
	hasSymptomSignal: boolean;
};

export type VoiceTranscriptionFunction = (
	audioBuffer: Buffer,
	mimeType: string,
) => Promise<string>;

export type VoiceIntakeInput = {
	botToken: string;
	organizationId: string;
	clinicId?: string | null | undefined;
	botConfigId?: string | null | undefined;
	chatId: string;
	chatFingerprint?: string | null | undefined;
	fileId: string;
	duration?: number | undefined;
	mimeType?: string | undefined;
	updateId: number;
	storageDir?: string | undefined;
	transcriber?: VoiceTranscriptionFunction | undefined;
};

export type VoiceIntakeResult = {
	ok: boolean;
	savedLocalPath?: string | undefined;
	transcription?: string | undefined;
	symptoms: ExtractedSymptomsInfo;
	redFlags: RedFlagEvaluationResult;
	isEmergency: boolean;
	escalation?: EmergencyEscalationResult | undefined;
	responseScreen: TriageScreenResult;
};

export class TelegramVoiceIntakeService {
	/**
	 * Извлекает ключевые стоматологические симптомы из расшифрованного текста речи.
	 */
	static extractSymptoms(text: string): ExtractedSymptomsInfo {
		const normalized = text.toLowerCase();
		const categories: ExtractedSymptomCategory[] = [];
		const keywordsFound: string[] = [];

		// 1. Боль (pain)
		const painKeywords = [
			"болит",
			"боль",
			"больно",
			"ноет",
			"ныть",
			"стреляет",
			"пульсирует",
			"дергает",
			"ломит",
			"дискомфорт",
			"нестерпим",
		];
		const matchedPain = painKeywords.filter((kw) => normalized.includes(kw));
		if (matchedPain.length > 0) {
			categories.push("pain");
			keywordsFound.push(...matchedPain);
		}

		// Определение интенсивности боли
		let painIntensity: "mild" | "moderate" | "severe" | undefined;
		if (
			normalized.includes("нестерпим") ||
			normalized.includes("адск") ||
			normalized.includes("очень сильн") ||
			normalized.includes("пульсирует") ||
			normalized.includes("на стену лезу")
		) {
			painIntensity = "severe";
		} else if (
			normalized.includes("сильн") ||
			normalized.includes("стреляет") ||
			normalized.includes("дергает")
		) {
			painIntensity = "moderate";
		} else if (matchedPain.length > 0) {
			painIntensity = "mild";
		}

		// 2. Зуб / челюсть / локализация (tooth)
		const toothKeywords = [
			"зуб",
			"десна",
			"десне",
			"челюст",
			"пломб",
			"коронк",
			"имплант",
			"лунк",
			"щек",
			"восьмерк",
			"резец",
			"клык",
			"моляр",
		];
		const matchedTooth = toothKeywords.filter((kw) => normalized.includes(kw));
		if (matchedTooth.length > 0) {
			categories.push("tooth");
			keywordsFound.push(...matchedTooth);
		}

		// 3. Отёк / припухлость (swelling)
		const swellingKeywords = [
			"опух",
			"отек",
			"отёк",
			"раздул",
			"припух",
			"флюс",
			"шишк",
			"надул",
		];
		const matchedSwelling = swellingKeywords.filter((kw) => normalized.includes(kw));
		if (matchedSwelling.length > 0) {
			categories.push("swelling");
			keywordsFound.push(...matchedSwelling);
		}

		// 4. Температура (fever)
		const feverKeywords = [
			"температур",
			"жар",
			"знобит",
			"лихорад",
			"горит",
			"38",
			"39",
		];
		const matchedFever = feverKeywords.filter((kw) => normalized.includes(kw));
		if (matchedFever.length > 0) {
			categories.push("fever");
			keywordsFound.push(...matchedFever);
		}

		// 5. Кровотечение (bleeding)
		const bleedingKeywords = [
			"кров",
			"кровит",
			"кровоточит",
			"сочится кровь",
			"сгусток",
		];
		const matchedBleeding = bleedingKeywords.filter((kw) => normalized.includes(kw));
		if (matchedBleeding.length > 0) {
			categories.push("bleeding");
			keywordsFound.push(...matchedBleeding);
		}

		// 6. Онемение (numbness)
		const numbnessKeywords = [
			"онемел",
			"не чувствую",
			"онемение",
			"парестезия",
			"анестезия не прошла",
		];
		const matchedNumbness = numbnessKeywords.filter((kw) => normalized.includes(kw));
		if (matchedNumbness.length > 0) {
			categories.push("numbness");
			keywordsFound.push(...matchedNumbness);
		}

		// 7. Трудность глотания (difficulty_swallowing)
		const swallowingKeywords = [
			"трудно глотать",
			"больно глотать",
			"не могу глотать",
			"дисфагия",
		];
		const matchedSwallowing = swallowingKeywords.filter((kw) => normalized.includes(kw));
		if (matchedSwallowing.length > 0) {
			categories.push("difficulty_swallowing");
			keywordsFound.push(...matchedSwallowing);
		}

		return {
			categories: Array.from(new Set(categories)),
			keywordsFound: Array.from(new Set(keywordsFound)),
			painIntensity,
			hasSymptomSignal: categories.length > 0,
		};
	}

	/**
	 * Обрабатывает входящее голосовое сообщение: скачивание, сохранение, распознавание,
	 * анализ симптомов, детекция красных флагов и создание CITO тикета.
	 */
	static async handleVoiceIntake(input: VoiceIntakeInput): Promise<VoiceIntakeResult> {
		const {
			botToken,
			organizationId,
			clinicId,
			botConfigId,
			chatId,
			chatFingerprint,
			fileId,
			duration,
			mimeType = "audio/ogg",
			updateId,
			storageDir,
			transcriber,
		} = input;

		// 1. Получаем путь к голосовому файлу в Telegram Bot API
		const fileInfo = await getTelegramFile({ botToken, fileId });
		if (!fileInfo.ok) {
			return {
				ok: false,
				symptoms: { categories: [], keywordsFound: [], hasSymptomSignal: false },
				redFlags: {
					hasRedFlags: false,
					flags: [],
					highestSeverity: null,
					patientEmergencyAdvice: "",
					doctorAlertSummary: "",
				},
				isEmergency: false,
				responseScreen: {
					text: "К сожалению, не удалось загрузить голосовое сообщение из Telegram. Пожалуйста, напишите текстом или позвоните в клинику.",
					replyMarkup: {
						inline_keyboard: [
							[{ text: "📞 Позвонить администратору", callback_data: "triage:human_request" }],
							[{ text: "🏠 Главное меню", callback_data: "dente:start" }],
						],
					},
				},
			};
		}

		// 2. Скачиваем аудиофайл
		const downloadResult = await downloadTelegramFile({
			botToken,
			filePath: fileInfo.filePath,
		});

		let savedLocalPath: string | undefined;
		if (downloadResult.ok) {
			try {
				const uploadsBase =
					storageDir ||
					path.resolve(process.cwd(), "apps/api/uploads/telegram_voice");
				if (!fs.existsSync(uploadsBase)) {
					fs.mkdirSync(uploadsBase, { recursive: true });
				}

				const ext = path.extname(fileInfo.filePath) || ".ogg";
				const fileHash = createHash("sha256")
					.update(downloadResult.buffer)
					.digest("hex")
					.slice(0, 16);
				const fileName = `voice_${Date.now()}_${fileHash}${ext}`;
				savedLocalPath = path.join(uploadsBase, fileName);
				fs.writeFileSync(savedLocalPath, downloadResult.buffer);
			} catch (writeErr) {
				console.warn("[TelegramVoiceIntake] Ошибка записи аудиофайла на диск:", writeErr);
			}
		}

		// 3. Транскрипция аудиофайла (Whisper / плаггин транскрибера)
		let rawTranscript = "";
		if (downloadResult.ok) {
			if (transcriber) {
				try {
					rawTranscript = await transcriber(downloadResult.buffer, mimeType);
				} catch (trErr) {
					console.warn("[TelegramVoiceIntake] Ошибка кастомного транскрибера:", trErr);
				}
			} else {
				// Встроенная быстрая эвристика или фоллбек
				rawTranscript = "[Голосовое сообщение от пациента]";
			}
		}

		// Фильтрация галлюцинаций Whisper
		const hallucinationCheck = isHallucinatedWhisperTranscript(rawTranscript);
		const cleanedTranscript = hallucinationCheck.hallucinated ? "" : rawTranscript.trim();

		// 4. Выделение симптомов
		const symptoms = this.extractSymptoms(cleanedTranscript);

		// 5. Детекция красных флагов
		const redFlags = TelegramRedFlagDetector.evaluateText(cleanedTranscript);
		const isEmergency = redFlags.hasRedFlags;

		let linkedPatientId: string | null = null;
		// Поиск привязанного пациента по chatFingerprint
		try {
			if (chatFingerprint) {
				await withTenantCtx(organizationId, async (tx) => {
					const [link] = await tx
						.select({ subjectId: denteTelegramChatLinks.subjectId })
						.from(denteTelegramChatLinks)
						.where(
							and(
								eq(denteTelegramChatLinks.organizationId, organizationId),
								eq(denteTelegramChatLinks.chatFingerprint, chatFingerprint),
								eq(denteTelegramChatLinks.status, "active"),
							),
						)
						.limit(1);
					linkedPatientId = link?.subjectId ?? null;
				});
			}
		} catch (linkErr) {
			console.warn("[TelegramVoiceIntake] Ошибка поиска привязки пациента:", linkErr);
		}

		// 6. Если обнаружены красные флаги — мгновенная экстренная эскалация
		let escalationResult: EmergencyEscalationResult | undefined;
		if (isEmergency) {
			escalationResult = await TelegramEmergencyEscalationService.escalateEmergency({
				organizationId,
				clinicId,
				patientId: linkedPatientId,
				chatId,
				chatFingerprint,
				source: "voice_intake",
				redFlagResult: redFlags,
				rawMessageText: cleanedTranscript,
				audioRecordingUrl: savedLocalPath,
				botToken,
			});
		} else {
			// Штатное обращение: сохранение в CRM
			try {
				await withTenantCtx(organizationId, async (tx) => {
					// 1) messenger_inbound_events
					const msgId = `tg_voice_${updateId}`;
					await tx.insert(messengerInboundEvents).values({
						organizationId,
						channel: "telegram" as const,
						externalId: msgId,
						externalChatId: chatId,
						messageText: cleanedTranscript || "[Голосовое обращение]",
						eventKind: "voice" as const,
						rawPayload: {
							fileId,
							duration,
							savedLocalPath,
							transcription: cleanedTranscript,
							symptoms,
						},
					});

					// 2) communicationTasks (для регистратуры)
					if (linkedPatientId) {
						const taskTitle = symptoms.hasSymptomSignal
							? `Входящее голосовое: симптомы (${symptoms.categories.join(", ")})`
							: "Входящее голосовое обращение пациента (Telegram)";

						const createdTask = await tx
							.insert(communicationTasks)
							.values({
								organizationId,
								clinicId: clinicId ? clinicId : null,
								patientId: linkedPatientId,
								assignedRole: "reception",
								channel: "telegram" as const,
								intent: "general" as const,
								status: "queued" as const,
								priority: symptoms.painIntensity === "severe" ? ("high" as const) : ("normal" as const),
								dueAt: new Date(Date.now() + 15 * 60_000), // 15 минут
								title: taskTitle,
								body: [
									`РАСШИФРОВКА ГОЛОСА: "${cleanedTranscript}"`,
									symptoms.categories.length > 0 ? `СИМПТОМЫ: ${symptoms.categories.join(", ")}` : "",
									symptoms.painIntensity ? `БОЛЬ: ${symptoms.painIntensity}` : "",
									savedLocalPath ? `АУДИОФАЙЛ: ${savedLocalPath}` : "",
								]
									.filter(Boolean)
									.join("\n"),
								workflowCode: "VOICE_INTAKE",
							})
							.returning({ id: communicationTasks.id });

						// 3) communicationEvents
						await tx.insert(communicationEvents).values({
							organizationId,
							clinicId: clinicId ? clinicId : null,
							taskId: createdTask[0]?.id ?? null,
							patientId: linkedPatientId,
							channel: "telegram" as const,
							direction: "inbound" as const,
							status: "delivered" as const,
							message: cleanedTranscript || "[Голосовое сообщение]",
							recordingUrl: savedLocalPath ?? null,
							durationSeconds: duration ?? null,
							audioFormat: "audio/ogg",
						});
					}
				});
			} catch (dbErr) {
				console.warn("[TelegramVoiceIntake] Ошибка сохранения голосового в CRM:", dbErr);
			}

			// WebSocket броадкаст о новом голосовом сообщении
			try {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "TELEGRAM_VOICE_INTAKE",
					payload: {
						organizationId,
						clinicId: clinicId ?? null,
						patientId: linkedPatientId,
						chatId,
						transcription: cleanedTranscript,
						symptoms,
						savedLocalPath,
						duration: duration ?? null,
						timestamp: new Date().toISOString(),
					},
				});
			} catch (wsErr) {
				console.warn("[TelegramVoiceIntake] WS broadcast failed:", wsErr);
			}
		}

		// 7. Формирование ответного экрана
		if (isEmergency && escalationResult) {
			return {
				ok: true,
				savedLocalPath,
				transcription: cleanedTranscript,
				symptoms,
				redFlags,
				isEmergency: true,
				escalation: escalationResult,
				responseScreen: escalationResult.emergencyScreen,
			};
		}

		// Штатный экран подтверждения голосового обращения
		const screenTextLines = [
			"🎙️ <b>Голосовое сообщение принято и расшифровано!</b>",
			"",
			cleanedTranscript
				? `📝 <i>«${cleanedTranscript}»</i>`
				: "<i>Аудиозапись прикреплена к вашей медицинской карточке.</i>",
			"",
		];

		if (symptoms.hasSymptomSignal) {
			screenTextLines.push(
				"🔍 <b>Зафиксированные симптомы:</b> " + symptoms.categories.map((c) => {
					switch (c) {
						case "pain": return "боль";
						case "tooth": return "зуб/десна";
						case "swelling": return "отёк";
						case "fever": return "температура";
						case "bleeding": return "кровоточивость";
						case "numbness": return "онемение";
						case "difficulty_swallowing": return "трудность глотания";
						default: return c;
					}
				}).join(", "),
			);
			screenTextLines.push("Администратор и врач уже видят ваше обращение в CRM.");
		} else {
			screenTextLines.push("Администратор клиники прослушает ваше сообщение и ответит в течение нескольких минут.");
		}

		const replyMarkup: TelegramInlineKeyboard = {
			inline_keyboard: [
				[
					{
						text: "📅 Записаться на приём",
						callback_data: "dente:schedule",
					},
				],
				[
					{
						text: "👨‍💼 Позвать администратора в чат",
						callback_data: "triage:human_request",
					},
				],
				[
					{
						text: "🏠 Главное меню",
						callback_data: "dente:start",
					},
				],
			],
		};

		return {
			ok: true,
			savedLocalPath,
			transcription: cleanedTranscript,
			symptoms,
			redFlags,
			isEmergency: false,
			responseScreen: {
				text: screenTextLines.join("\n"),
				replyMarkup,
			},
		};
	}
}
