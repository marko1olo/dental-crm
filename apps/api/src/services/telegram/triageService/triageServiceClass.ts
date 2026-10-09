/**
 * triageServiceClass.ts
 *
 * Layer 3: TelegramInteractiveTriageService coordinator class.
 * Integrates screen presenters, database ledger events, websocket broker,
 * file storage and Telegram Bot API callbacks.
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	communicationTasks,
	denteTelegramChatLinks,
	messengerInboundEvents,
} from "../../../db/schema.js";
import {
	answerTelegramCallbackQuery,
	downloadTelegramFile,
	editTelegramMessageText,
	getTelegramFile,
	sendTelegramTextMessage,
} from "../../../telegramTransport.js";
import {
	getTelegramDialogSession,
	updateTelegramDialogSession,
} from "../telegramLegacyMemoryStore.js";
import { wsBroker } from "../../websocketBroker.js";
import {
	presentAestheticScreen,
	presentBrokenToothPhotoHintScreen,
	presentBrokenToothScreen,
	presentCalculatorRootScreen,
	presentCariesCalculatorScreen,
	presentCitoBookScreen,
	presentCrownCalculatorScreen,
	presentEmergencyScreen,
	presentGeneralLockSuccessScreen,
	presentGumsScreen,
	presentHumanTakeoverScreen,
	presentImplantCrownSelectionScreen,
	presentImplantLockSuccessScreen,
	presentImplantResultScreen,
	presentImplantSystemSelectionScreen,
	presentKidsScreen,
	presentPhotoIntakeErrorScreen,
	presentPhotoIntakeSuccessScreen,
	presentRootTriageScreen,
	presentWhiteningCalculatorScreen,
} from "./triageScreenPresenter.js";
import type {
	EnableHumanModeParams,
	HandleCallbackQueryParams,
	HandleCallbackQueryResult,
	HandlePhotoIntakeParams,
	HandlePhotoIntakeResult,
	TriageScreenResult,
} from "./types.js";

/**
 * Сервис интерактивного триажа симптомов, калькулятора стоимости,
 * приема фото/медиа и режима перехвата диалога человеком.
 * Построен по философии In-Place UI (Zero Chat Landfill):
 * все шаги обновляют существующее сообщение без мусора в чате.
 */
export class TelegramInteractiveTriageService {
	/**
	 * Главное меню интерактивного триажа симптомов.
	 */
	static getRootTriageScreen(): TriageScreenResult {
		return presentRootTriageScreen();
	}

	/**
	 * Ветка: Экстренная острая боль / отёк (CITO).
	 */
	static getEmergencyScreen(): TriageScreenResult {
		return presentEmergencyScreen();
	}

	/**
	 * Ветка: Откололся зуб / выпала пломба.
	 */
	static getBrokenToothScreen(subStep?: string): TriageScreenResult {
		return presentBrokenToothScreen(subStep);
	}

	/**
	 * Ветка: Кровоточат десны / запах.
	 */
	static getGumsScreen(): TriageScreenResult {
		return presentGumsScreen();
	}

	/**
	 * Ветка: Эстетика улыбки (виниры, элайнеры, отбеливание).
	 */
	static getAestheticScreen(subStep?: string): TriageScreenResult {
		return presentAestheticScreen(subStep);
	}

	/**
	 * Ветка: Подготовка ребенка к приёму.
	 */
	static getKidsScreen(): TriageScreenResult {
		return presentKidsScreen();
	}

	// ========================================================================
	// КАЛЬКУЛЯТОР СТОИМОСТИ ЛЕЧЕНИЯ В 3 КЛИКА (TREATMENT COST ESTIMATOR)
	// ========================================================================

	/**
	 * Главный экран калькулятора.
	 */
	static getCalculatorRootScreen(): TriageScreenResult {
		return presentCalculatorRootScreen();
	}

	/**
	 * Шаг 1 Имплантации: Выбор системы импланта.
	 */
	static getImplantSystemSelectionScreen(): TriageScreenResult {
		return presentImplantSystemSelectionScreen();
	}

	/**
	 * Шаг 2 Имплантации: Выбор коронки.
	 */
	static getImplantCrownSelectionScreen(implantCode: string): TriageScreenResult {
		return presentImplantCrownSelectionScreen(implantCode);
	}

	/**
	 * Итоговый расчет имплантации «под ключ».
	 */
	static getImplantResultScreen(implantCode: string, crownCode: string): TriageScreenResult {
		return presentImplantResultScreen(implantCode, crownCode);
	}

	/**
	 * Калькулятор коронок на зубы.
	 */
	static getCrownCalculatorScreen(): TriageScreenResult {
		return presentCrownCalculatorScreen();
	}

	/**
	 * Калькулятор лечения кариеса.
	 */
	static getCariesCalculatorScreen(): TriageScreenResult {
		return presentCariesCalculatorScreen();
	}

	/**
	 * Калькулятор отбеливания.
	 */
	static getWhiteningCalculatorScreen(): TriageScreenResult {
		return presentWhiteningCalculatorScreen();
	}

	// ========================================================================
	// РЕЖИМ ПЕРЕХВАТА ЧЕЛОВЕКОМ (HUMAN LIVE CHAT TAKEOVER)
	// ========================================================================

	/**
	 * Проверка, находится ли чат в режиме общения с живым человеком.
	 */
	static isChatInHumanMode(
		chatFingerprint: string,
		organizationId: string,
		botConfigId?: string | null,
	): boolean {
		const session = getTelegramDialogSession(
			chatFingerprint,
			organizationId,
			botConfigId,
		);
		return session?.metadata?.dialog_mode === "human_mode";
	}

	/**
	 * Переключение чата в режим живого администратора (Human Takeover).
	 */
	static async enableHumanMode(params: EnableHumanModeParams): Promise<TriageScreenResult> {
		const { chatFingerprint, organizationId, clinicId, botConfigId, chatId, reason } = params;

		updateTelegramDialogSession(
			chatFingerprint,
			organizationId,
			{
				clinicId: clinicId ?? null,
				chatId: chatId ?? null,
				currentStep: "human_mode",
				metadata: {
					dialog_mode: "human_mode",
					human_takeover_at: Date.now(),
					takeover_reason: reason || "Запрос связи от пациента",
				},
			},
			botConfigId,
		);

		// Создаем задачу для администратора клиники
		try {
			await withTenantCtx(organizationId, async (tx) => {
				// Проверяем, есть ли привязанный пациент
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

				if (link?.subjectId) {
					await tx.insert(communicationTasks).values({
						organizationId,
						clinicId: clinicId ? clinicId : null,
						patientId: link.subjectId,
						assignedRole: "reception",
						channel: "telegram" as const,
						intent: "general" as const,
						status: "queued" as const,
						priority: "high" as const,
						dueAt: new Date(Date.now() + 5 * 60_000), // 5 минут на ответ
						title: "Входящий диалог Telegram (пациент ожидает администратора)",
						body: `Пациент запросил ответ человека в Telegram-боте. Причина: ${reason || "Позвать администратора"}`,
					});
				}
			});
		} catch (taskErr) {
			console.warn("[TelegramInteractiveTriage] Не удалось создать communicationTask:", taskErr);
		}

		// Трансляция события через WebSocket брокер клиники
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "TELEGRAM_HUMAN_TAKEOVER",
				payload: {
					organizationId,
					clinicId: clinicId ?? null,
					chatFingerprint,
					chatId: chatId ?? null,
					reason: reason || "Запрос связи от пациента",
					timestamp: new Date().toISOString(),
				},
			});
		} catch (wsErr) {
			console.warn("[TelegramInteractiveTriage] Ошибка WebSocket оповещения:", wsErr);
		}

		return presentHumanTakeoverScreen();
	}

	/**
	 * Возврат чата из режима человека обратно в автоматический бот-режим.
	 */
	static returnToBotMode(
		chatFingerprint: string,
		organizationId: string,
		botConfigId?: string | null,
	): TriageScreenResult {
		updateTelegramDialogSession(
			chatFingerprint,
			organizationId,
			{
				currentStep: "idle",
				metadata: {
					dialog_mode: "bot",
					human_takeover_ended_at: Date.now(),
				},
			},
			botConfigId,
		);

		return this.getRootTriageScreen();
	}

	// ========================================================================
	// ОБРАБОТКА МЕДИА И ФОТО ОТ ПАЦИЕНТА (MEDIA INTAKE & STORAGE)
	// ========================================================================

	/**
	 * Безопасный приём фотографии от пациента через Telegram Bot API.
	 * Скачивает файл, сохраняет в защищенное хранилище клиники и создает заявку в CRM.
	 */
	static async handlePhotoIntake(
		params: HandlePhotoIntakeParams,
	): Promise<HandlePhotoIntakeResult> {
		const {
			botToken,
			organizationId,
			clinicId,
			botConfigId: _botConfigId,
			chatId,
			fileId,
			caption,
			updateId,
		} = params;

		// 1. Получаем путь к файлу в Telegram Bot API
		const fileInfo = await getTelegramFile({ botToken, fileId });
		if (!fileInfo.ok) {
			return {
				ok: false,
				responseScreen: presentPhotoIntakeErrorScreen(),
			};
		}

		// 2. Скачиваем бинарные данные файла
		const downloadResult = await downloadTelegramFile({
			botToken,
			filePath: fileInfo.filePath,
		});

		let savedLocalPath: string | undefined;

		if (downloadResult.ok) {
			try {
				const uploadsBase =
					params.storageDir ||
					path.resolve(process.cwd(), "apps/api/uploads/telegram_media");
				if (!fs.existsSync(uploadsBase)) {
					fs.mkdirSync(uploadsBase, { recursive: true });
				}

				const ext = path.extname(fileInfo.filePath) || ".jpg";
				const fileHash = createHash("sha256")
					.update(downloadResult.buffer)
					.digest("hex")
					.slice(0, 16);
				const fileName = `intake_${Date.now()}_${fileHash}${ext}`;
				savedLocalPath = path.join(uploadsBase, fileName);
				fs.writeFileSync(savedLocalPath, downloadResult.buffer);
			} catch (writeErr) {
				console.warn("[TelegramInteractiveTriage] Ошибка записи фото на диск:", writeErr);
			}
		}

		// 3. Фиксация в базе данных CRM (messenger_inbound_events)
		try {
			await withTenantCtx(organizationId, async (tx) => {
				const msgId = `tg_photo_${updateId}`;
				await tx.insert(messengerInboundEvents).values({
					organizationId,
					channel: "telegram" as const,
					externalId: msgId,
					externalChatId: chatId,
					messageText: caption?.trim() || "[Фотография от пациента]",
					eventKind: "photo",
					rawPayload: {
						fileId,
						fileSize: fileInfo.fileSize,
						filePath: fileInfo.filePath,
						savedLocalPath,
						caption,
					},
				});
			});
		} catch (dbErr) {
			console.warn("[TelegramInteractiveTriage] Ошибка сохранения фото в БД:", dbErr);
		}

		// 4. Оповещение персонала через WebSocket
		try {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "TELEGRAM_MEDIA_INTAKE",
				payload: {
					organizationId,
					clinicId: clinicId ?? null,
					chatId,
					caption: caption || null,
					savedLocalPath,
					timestamp: new Date().toISOString(),
				},
			});
		} catch (wsErr) {
			console.warn("[TelegramInteractiveTriage] WS notification failed:", wsErr);
		}

		return {
			ok: true,
			savedPath: savedLocalPath,
			responseScreen: presentPhotoIntakeSuccessScreen(),
		};
	}

	// ========================================================================
	// ДИСПЕТЧЕР IN-PLACE ОБРАБОТКИ CALLBACK QUERY (ZERO CHAT LANDFILL)
	// ========================================================================

	/**
	 * Главный обработчик интерактивных кнопок триажа, калькулятора и перехвата.
	 * Обновляет существующее сообщение через editMessageText (In-Place UI).
	 */
	static async handleCallbackQuery(
		params: HandleCallbackQueryParams,
	): Promise<HandleCallbackQueryResult> {
		const {
			callbackData,
			callbackQueryId,
			chatFingerprint,
			chatId,
			messageId,
			botToken,
			organizationId,
			clinicId,
			botConfigId,
		} = params;

		let targetScreen: TriageScreenResult | null = null;

		// 1. Корневое меню триажа
		if (callbackData === "triage:root") {
			targetScreen = this.getRootTriageScreen();
		}
		// 2. Ветка острой боли
		else if (callbackData === "triage:emergency") {
			targetScreen = this.getEmergencyScreen();
		} else if (callbackData === "triage:cito_book") {
			targetScreen = presentCitoBookScreen();
		}
		// 3. Ветка отколотого зуба
		else if (callbackData === "triage:broken_tooth") {
			targetScreen = this.getBrokenToothScreen();
		} else if (callbackData === "triage:tooth_pain") {
			targetScreen = this.getBrokenToothScreen("pain");
		} else if (callbackData === "triage:tooth_sharp") {
			targetScreen = this.getBrokenToothScreen("sharp");
		} else if (callbackData === "triage:photo_hint") {
			targetScreen = presentBrokenToothPhotoHintScreen();
		}
		// 4. Ветка десен
		else if (callbackData === "triage:gums") {
			targetScreen = this.getGumsScreen();
		}
		// 5. Ветка эстетики
		else if (callbackData === "triage:aesthetic") {
			targetScreen = this.getAestheticScreen();
		} else if (callbackData === "triage:aest_color") {
			targetScreen = this.getAestheticScreen("color");
		} else if (callbackData === "triage:aest_veneers") {
			targetScreen = this.getAestheticScreen("veneers");
		} else if (callbackData === "triage:aest_ortho") {
			targetScreen = this.getAestheticScreen("ortho");
		}
		// 6. Ветка детского приёма
		else if (callbackData === "triage:kids") {
			targetScreen = this.getKidsScreen();
		}
		// 7. Калькулятор: главное меню
		else if (callbackData === "triage:calc:root") {
			targetScreen = this.getCalculatorRootScreen();
		}
		// 8. Калькулятор имплантации
		else if (callbackData === "triage:calc:cat:implant") {
			targetScreen = this.getImplantSystemSelectionScreen();
		} else if (callbackData.startsWith("triage:calc:imp:")) {
			const impCode = callbackData.replace("triage:calc:imp:", "");
			targetScreen = this.getImplantCrownSelectionScreen(impCode);
		} else if (callbackData.startsWith("triage:calc:res:imp:")) {
			const parts = callbackData.replace("triage:calc:res:imp:", "").split(":");
			const impCode = parts[0] || "osstem";
			const crwCode = parts[1] || "zirconia";
			targetScreen = this.getImplantResultScreen(impCode, crwCode);
		} else if (callbackData.startsWith("triage:calc:lock:imp:")) {
			targetScreen = presentImplantLockSuccessScreen();
		}
		// 9. Калькулятор коронок
		else if (callbackData === "triage:calc:cat:crown") {
			targetScreen = this.getCrownCalculatorScreen();
		}
		// 10. Калькулятор кариеса
		else if (callbackData === "triage:calc:cat:caries") {
			targetScreen = this.getCariesCalculatorScreen();
		}
		// 11. Калькулятор отбеливания
		else if (callbackData === "triage:calc:cat:whitening") {
			targetScreen = this.getWhiteningCalculatorScreen();
		}
		// 12. Фиксация общих расчетов калькулятора
		else if (callbackData.startsWith("triage:calc:lock:")) {
			targetScreen = presentGeneralLockSuccessScreen();
		}
		// 13. Режим перехвата человеком (Human Live Chat Takeover)
		else if (callbackData === "triage:human_request") {
			targetScreen = await this.enableHumanMode({
				chatFingerprint,
				organizationId,
				clinicId: clinicId ?? null,
				botConfigId: botConfigId ?? null,
				chatId,
				reason: "Нажата кнопка «Позвать администратора» в интерактивном опроснике",
			});
		} else if (callbackData === "triage:return_to_bot") {
			targetScreen = this.returnToBotMode(chatFingerprint, organizationId, botConfigId);
		}

		if (!targetScreen) {
			return { handled: false };
		}

		// Отвечаем на callback_query, чтобы убрать часики ожидания на кнопке Telegram
		if (callbackQueryId && botToken) {
			void answerTelegramCallbackQuery({
				botToken,
				callbackQueryId,
				text: "Загрузка...",
			}).catch(() => {});
		}

		// In-Place UI: обновляем текущее сообщение без мусора в чате
		if (messageId && botToken && chatId) {
			const editResult = await editTelegramMessageText({
				botToken,
				chatId,
				messageId,
				text: targetScreen.text,
				replyMarkup: targetScreen.replyMarkup,
			});

			// Если редактирование не прошло (сообщение слишком старое или было фото), шлем новое
			if (!editResult.ok && editResult.errorClass !== null) {
				await sendTelegramTextMessage({
					botToken,
					chatId,
					text: targetScreen.text,
					replyMarkup: targetScreen.replyMarkup,
				});
			}
		}

		return { handled: true, screen: targetScreen };
	}
}
