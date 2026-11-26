/**
 * referralLoyaltyServiceClass.ts
 *
 * Layer 3: TelegramReferralLoyaltyService coordinator class providing
 * unified access to WebApp validation, referrals, family cards, NPS, and online booking.
 */

import { and, eq, sql } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	appointments,
	communicationTasks,
	denteTelegramBotConfigs,
	patients,
	users,
} from "../../../db/schema.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { wsBroker } from "../../websocketBroker.js";
import { executeBookingTransaction } from "../../../routes/publicBooking/bookingMutationService.js";
import {
	DEFAULT_REFERRAL_CONFIG,
	type ChurnCandidateItem,
	type FamilyProfileResult,
	type NpsFeedbackInput,
	type NpsFeedbackResult,
	type ReferralRewardConfig,
	type ReferralStartResult,
	type TelegramWebAppValidationResult,
	type ToothComplaintInput,
	type WebAppBookingInput,
} from "./types.js";
import {
	generateReferralLink,
	validateTelegramWebAppData,
} from "./webAppValidator.js";

const logger = createApiLogger("TelegramReferralLoyaltyService");
import {
	confirmFamilyAppointment,
	findChurnCandidates,
	getFamilyProfile,
} from "./familyAndChurnManager.js";
import {
	awardBonusPoints,
	processReferralStart,
} from "./referralRewardsEngine.js";

export class TelegramReferralLoyaltyService {
	/**
	 * Криптографическая валидация Telegram.WebApp.initData (HMAC-SHA-256).
	 */
	static validateTelegramWebAppData(
		initDataString: string,
		botToken: string,
		options: { maxAgeSeconds?: number; allowDevBypass?: boolean } = {},
	): TelegramWebAppValidationResult {
		return validateTelegramWebAppData(initDataString, botToken, options);
	}

	/**
	 * Генерация персональной реферальной ссылки для пациента:
	 * https://t.me/ClinicBot?start=ref_PATIENT_ID
	 */
	static generateReferralLink(
		botUsername: string,
		patientId: string,
		referralCode?: string,
	): {
		deepLink: string;
		referralCode: string;
		shareText: string;
	} {
		return generateReferralLink(botUsername, patientId, referralCode);
	}

	/**
	 * Обработка входа нового пациента / друга по реферальной ссылке `/start ref_...`.
	 */
	static async processReferralStart(
		organizationId: string,
		refereeTelegramChatId: string | number,
		startPayload: string,
		refereeProfile?: {
			fullName?: string | undefined;
			phone?: string | undefined;
			username?: string | undefined;
		} | undefined,
		config: ReferralRewardConfig = DEFAULT_REFERRAL_CONFIG,
	): Promise<ReferralStartResult> {
		return processReferralStart(
			organizationId,
			refereeTelegramChatId,
			startPayload,
			refereeProfile,
			config,
		);
	}

	/**
	 * Начисление бонусных баллов пациенту с фиксацией транзакции в журнале.
	 */
	static async awardBonusPoints(
		organizationId: string,
		patientId: string,
		amountPoints: number,
		description: string,
		transactionType = "accrual",
	): Promise<number> {
		return awardBonusPoints(
			organizationId,
			patientId,
			amountPoints,
			description,
			transactionType,
		);
	}

	/**
	 * Получение семейного профиля и переключение между членами семьи.
	 */
	static async getFamilyProfile(
		organizationId: string,
		patientId: string,
	): Promise<FamilyProfileResult> {
		return getFamilyProfile(organizationId, patientId);
	}

	/**
	 * Подтверждение или перенос записи ребенка/члена семьи в 1 клик родителем.
	 */
	static async confirmFamilyAppointment(
		organizationId: string,
		parentPatientId: string,
		appointmentId: string,
	): Promise<{ success: boolean; appointmentId: string; message: string; newStatus?: string }> {
		return confirmFamilyAppointment(organizationId, parentPatientId, appointmentId);
	}

	/**
	 * СМАРТ-РЕАНИМАЦИЯ ОТТОКА (RETENTION RADAR):
	 * Поиск пациентов, которые не были на приеме 6+ месяцев (стандарт гигиены СтАР).
	 */
	static async findChurnCandidates(
		organizationId: string,
		options: { minMonths?: number; limit?: number } = {},
	): Promise<ChurnCandidateItem[]> {
		return findChurnCandidates(organizationId, options);
	}

	/**
	 * Опрос NPS / индекс лояльности после завершенного визита.
	 * При оценке 5/5: направляет на Яндекс.Карты / 2GIS для внешнего отзыва.
	 * При оценке 1-4: регистрирует тревогу в CRM и задачу начмеду/управляющему.
	 */
	static async handleNpsFeedback(
		organizationId: string,
		input: NpsFeedbackInput,
		clinicSettings?: { yandexMapsUrl?: string | undefined; twoGisUrl?: string | undefined; clinicName?: string | undefined },
	): Promise<NpsFeedbackResult> {
		return await withTenantCtx(organizationId, async (tx) => {
			const rawScore = Number(input.score);
			// Нормализуем к 1-5 (если прислали 1-10: 9-10 -> 5, 7-8 -> 4, 5-6 -> 3, и т.д.)
			const normalizedScore = rawScore > 5 ? Math.min(5, Math.max(1, Math.round(rawScore / 2))) : Math.min(5, Math.max(1, Math.round(rawScore)));

			const [appt] = await tx
				.select({
					id: appointments.id,
					organizationId: appointments.organizationId,
					patientId: appointments.patientId,
					doctorId: appointments.doctorUserId,
					patientName: patients.fullName,
					doctorName: users.fullName,
				})
				.from(appointments)
				.leftJoin(patients, eq(appointments.patientId, patients.id))
				.leftJoin(users, eq(appointments.doctorUserId, users.id))
				.where(and(eq(appointments.organizationId, organizationId), eq(appointments.id, input.appointmentId)))
				.limit(1);

			let clinicName = clinicSettings?.clinicName;
			let yandexUrl = clinicSettings?.yandexMapsUrl;
			let twoGisUrl = clinicSettings?.twoGisUrl;

			if (!yandexUrl || !twoGisUrl || !clinicName) {
				try {
					const [botConfig] = await tx
						.select({
							clinicMapsUrl: denteTelegramBotConfigs.clinicMapsUrl,
							clinicReviewUrl: denteTelegramBotConfigs.clinicReviewUrl,
							botUsername: denteTelegramBotConfigs.botUsername,
							ownBotUsername: denteTelegramBotConfigs.ownBotUsername,
						})
						.from(denteTelegramBotConfigs)
						.where(eq(denteTelegramBotConfigs.organizationId, organizationId))
						.limit(1);

					if (botConfig) {
						if (!yandexUrl && botConfig.clinicMapsUrl) {
							yandexUrl = botConfig.clinicMapsUrl;
						}
						if (!twoGisUrl && botConfig.clinicReviewUrl) {
							twoGisUrl = botConfig.clinicReviewUrl;
						}
						if (!clinicName) {
							clinicName = botConfig.ownBotUsername || botConfig.botUsername || undefined;
						}
					}
				} catch (cfgErr) {
					logger.warn(
						{ err: safeLogError(cfgErr), organizationId },
						"Failed to load botConfig clinic review URLs for NPS feedback",
					);
				}
			}

			clinicName = clinicName || "DENTE";
			yandexUrl = yandexUrl || "https://yandex.ru/maps/";
			twoGisUrl = twoGisUrl || "https://2gis.ru/";

			let createdTaskId: string | null = null;

			if (normalizedScore === 5) {
				// 5/5 — Высшая лояльность: направляем на внешние картографические сервисы
				const replyMessage = [
					`⭐️⭐️⭐️⭐️⭐️ <b>Огромное спасибо за высшую оценку!</b>`,
					``,
					`Мы невероятно рады, что ваш визит в ${clinicName} прошел комфортно и безболезненно. ` +
					`Для нашей команды и доктора ${appt?.doctorName || ""} это лучшая награда!`,
					``,
					`Пожалуйста, уделите 30 секунд и поделитесь вашим отзывом на Яндекс.Картах или 2ГИС — ` +
					`это очень помогает новым пациентам найти хорошего стоматолога:`,
				].join("\n");

				return {
					appointmentId: input.appointmentId,
					normalizedScore: 5,
					routeDestination: "external_review",
					replyMessage,
					yandexMapsUrl: yandexUrl,
					twoGisUrl: twoGisUrl,
					taskCreatedId: null,
				};
			}

			// 1–4 — Сигнал для сервисной службы / главного врача (Service Recovery)
			if (appt?.patientId) {
				const [createdTask] = await tx
					.insert(communicationTasks)
					.values({
						organizationId,
						patientId: appt.patientId,
						appointmentId: appt.id,
						assignedRole: "head_doctor",
						channel: "telegram",
						intent: "general",
						status: "queued",
						priority: "high",
						dueAt: new Date(),
						title: `🚨 Служба заботы: Низкая оценка визита (${normalizedScore}/5)`,
						body: `Пациент ${appt.patientName || "Без имени"} поставил оценку ${normalizedScore}/5 после визита к доктору ${appt.doctorName || "Врач"}. ` +
							(input.comment ? `Комментарий пациента: "${input.comment}".` : "Комментарий не оставлен.") +
							` Срочно связаться для разбора клинической или сервисной ситуации!`,
						workflowCode: "nps_service_recovery",
					})
					.returning();

				createdTaskId = createdTask?.id || null;

				// WebSocket оповещение
				wsBroker.broadcastToOrganization(organizationId, {
					type: "nps_recovery_alert",
					organizationId,
					payload: {
						appointmentId: appt.id,
						patientId: appt.patientId,
						patientName: appt.patientName,
						score: normalizedScore,
						comment: input.comment,
						taskId: createdTaskId,
					},
				});
			}

			const replyMessage = [
				`🙏 <b>Спасибо за вашу честную обратную связь!</b>`,
				``,
				`Нам очень жаль, если визит оставил какие-либо неприятные впечатления. В клинике ${clinicName} качество лечения и комфорт каждого пациента стоят на первом месте.`,
				``,
				`Мы уже передали ваш сигнал главному врачу и службе заботы о пациентах. ` +
				`Управляющий свяжется с вами в течение 15 минут, чтобы во всем детально разобраться и помочь.`,
			].join("\n");

			return {
				appointmentId: input.appointmentId,
				normalizedScore,
				routeDestination: "service_recovery_alert",
				replyMessage,
				yandexMapsUrl: null,
				twoGisUrl: null,
				taskCreatedId: createdTaskId,
			};
		});
	}

	/**
	 * Приём жалобы на конкретный зуб из интерактивной 3D/2D формулы WebApp:
	 * («Беспокоит зуб 16», острая боль / скол / ноет) -> передача в CRM.
	 */
	static async submitToothComplaint(
		organizationId: string,
		patientId: string,
		complaint: ToothComplaintInput,
	): Promise<{ success: boolean; leadId?: string | undefined; taskId?: string | undefined; message: string; urgency?: string; autoReplyText?: string }> {
		return await withTenantCtx(organizationId, async (tx) => {
			const [patient] = await tx
				.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, patientId)))
				.limit(1);

			if (!patient) {
				return { success: false, message: "Пациент не найден." };
			}

			const isEmergency = complaint.urgency === "cito" || (complaint.painIntensity && complaint.painIntensity >= 4);

			// Создаем задачу для регистратуры
			const [task] = await tx
				.insert(communicationTasks)
				.values({
					organizationId,
					patientId,
					assignedRole: "administrator",
					channel: "telegram",
					intent: "general",
					status: "queued",
					priority: isEmergency ? "urgent" : "high",
					dueAt: new Date(),
					title: `🦷 Жалоба из Telegram WebApp: Зуб ${complaint.toothNumber}`,
					body: `Пациент ${patient.fullName} (${patient.phone || "тел. не указан"}) отметил жалобу в Pocket Clinic:\n` +
						`• Зуб: ${complaint.toothNumber}\n` +
						`• Симптом: ${complaint.symptom}\n` +
						`• Интенсивность боли: ${complaint.painIntensity || 3}/5\n` +
						(complaint.notes ? `• Заметка пациента: "${complaint.notes}"` : ""),
					workflowCode: "telegram_webapp_tooth_complaint",
				})
				.returning();

			// Оповещаем CRM
			wsBroker.broadcastToOrganization(organizationId, {
				type: "telegram_tooth_complaint_received",
				organizationId,
				payload: {
					patientId,
					patientName: patient.fullName,
					toothNumber: complaint.toothNumber,
					symptom: complaint.symptom,
					isEmergency,
					taskId: task?.id,
				},
			});

			const autoReplyText = isEmergency
				? `🚨 СРОЧНО ПРИНЯТО: Жалоба на зуб #${complaint.toothNumber} («${complaint.symptom}»). Сигнал CITO передан дежурному врачу!`
				: `✅ Ваша жалоба на зуб #${complaint.toothNumber} («${complaint.symptom}») зафиксирована в медицинской карте.`;

			return {
				success: true,
				leadId: task?.id,
				taskId: task?.id,
				urgency: isEmergency ? "cito" : "routine",
				autoReplyText,
				message: `Жалоба по зубу ${complaint.toothNumber} передана врачу и регистратуре клиники.`,
			};
		});
	}

	/**
	 * Запись на прием в 1 тап из Telegram WebApp календаря.
	 */
	static async bookAppointmentFromWebApp(
		organizationId: string,
		patientId: string,
		booking: WebAppBookingInput,
	): Promise<{
		success: boolean;
		appointmentId: string;
		message: string;
		confirmationMessage?: string;
		errorCode?: string;
	}> {
		return await withTenantCtx(organizationId, async (tx) => {
			const targetPatientId = booking.familyMemberPatientId || patientId;

			const [targetPatient] = await tx
				.select({ id: patients.id, fullName: patients.fullName, phone: patients.phone })
				.from(patients)
				.where(and(eq(patients.organizationId, organizationId), eq(patients.id, targetPatientId)))
				.limit(1);

			if (!targetPatient) {
				return { success: false, appointmentId: "", message: "Пациент для записи не найден." };
			}

			// Вычисляем время начала и окончания
			const startDateTime = new Date(`${booking.date}T${booking.time}:00`);
			const endDateTime = new Date(startDateTime.getTime() + 45 * 60_000); // 45 минут дефолт

			// Разрешаем лечащего врача (валидация UUID и поиск реального врача в организации)
			let resolvedDoctorUserId: string | null = null;
			const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(booking.doctorId);
			if (isUuid) {
				const [foundDoc] = await tx
					.select({ id: users.id })
					.from(users)
					.where(and(eq(users.organizationId, organizationId), eq(users.id, booking.doctorId), eq(users.isActive, true)))
					.limit(1);
				if (foundDoc) {
					resolvedDoctorUserId = foundDoc.id;
				}
			}

			if (!resolvedDoctorUserId) {
				return {
					success: false,
					appointmentId: "",
					message: "Врач для записи не указан или не найден в клинике.",
					errorCode: "APPOINTMENT_DOCTOR_REQUIRED",
				};
			}

			const bookingResult = await executeBookingTransaction(tx, {
				organizationId,
				doctorId: resolvedDoctorUserId,
				startDate: startDateTime,
				endDate: endDateTime,
				patientId: targetPatientId,
				patientName: targetPatient.fullName,
				patientPhone: targetPatient.phone || "",
				comment: booking.complaintNotes
					? `Запись через Telegram WebApp: ${booking.complaintNotes}`
					: `Запись через Telegram WebApp на ${booking.serviceName || "Консультация стоматолога"}`,
				source: "telegram_webapp",
			});

			if (bookingResult.conflict) {
				return {
					success: false,
					appointmentId: "",
					message: "Выбранное время уже занято. Пожалуйста, выберите другое время для записи.",
				};
			}

			if (bookingResult.blocked) {
				return {
					success: false,
					appointmentId: "",
					message: bookingResult.message,
				};
			}

			const createdAppt = bookingResult.appointment;

			wsBroker.broadcastToOrganization(organizationId, {
				type: "appointment_created_via_telegram_webapp",
				organizationId,
				payload: {
					appointmentId: createdAppt.id,
					patientId: targetPatientId,
					patientName: targetPatient.fullName,
					doctorId: resolvedDoctorUserId || booking.doctorId,
					startTime: startDateTime.toISOString(),
				},
			});

			const dateParts = booking.date.split("-");
			const formattedDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : booking.date;
			const confirmationMessage = `✅ Вы успешно записаны на прием в DENTE!\n\n📅 Дата: ${formattedDate}\n⏰ Время: ${booking.time}`;

			return {
				success: true,
				appointmentId: createdAppt.id,
				confirmationMessage,
				message: `Запись на ${booking.date} в ${booking.time} успешно создана! Ждем вас в клинике.`,
			};
		});
	}
}
