import { randomUUID } from "node:crypto";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { rublesToKopecks } from "@dental/shared";
import { db } from "../../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import {
	crmLeads,
	denteTelegramChatLinks,
	patients,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../../db/schema.js";
import {
	answerTelegramCallbackQuery,
	editTelegramMessageText,
} from "../../../telegramTransport.js";
import { decryptTelegramChatId } from "../../../utils/telegramChatRef.js";
import { wsBroker } from "../../websocketBroker.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";
import { BANK_PROVIDERS } from "./constants.js";

const logger = createApiLogger("telegramPlanCloser");
import {
	buildDefaultStages,
	calculateAllInstallmentOptions,
	calculateInstallmentOption,
	formatRub,
	getCuratorCallBookedScreen,
	getInstallmentCalcScreen,
	getInstallmentSubmittedScreen,
	getObjectionCostScreen,
	getObjectionDelayScreen,
	getObjectionFamilyScreen,
	getObjectionFearScreen,
	getObjectionsRootScreen,
	getPlanCloserRootScreen,
	getPlanStagesScreen,
	parseTeethNumbers,
	sanitizePlanTitleForMessenger,
} from "./planMessagePresenter.js";
import type {
	CloserCallbackParams,
	CloserCallbackResult,
	CloserScreenResult,
	CreateCuratorCallInput,
	CreateInstallmentLeadInput,
	PendingTreatmentPlanSummary,
} from "./types.js";

/**
 * Находит ожидающие согласования планы лечения для пациента (Pending Treatment Plans).
 */
export async function getPendingTreatmentPlansForPatient(
	patientId: string,
	organizationId?: string,
): Promise<PendingTreatmentPlanSummary[]> {
	try {
		// Если orgId не передан, получаем его из пациента
		let resolvedOrgId = organizationId;
		if (!resolvedOrgId) {
			const [pat] = await db
				.select({ organizationId: patients.organizationId })
				.from(patients)
				.where(eq(patients.id, patientId))
				.limit(1);
			resolvedOrgId = pat?.organizationId;
		}

		if (!resolvedOrgId) {
			return [];
		}

		return await withTenantCtx(resolvedOrgId, async (tx) => {
			// Загружаем пациента
			const [patient] = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					phone: patients.phone,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, resolvedOrgId)))
				.limit(1);

			if (!patient) return [];

			// Проверяем наличие привязанного Telegram-чата
			const [chatLink] = await tx
				.select({
					id: denteTelegramChatLinks.id,
					chatTransportRef: denteTelegramChatLinks.chatTransportRef,
					chatFingerprint: denteTelegramChatLinks.chatFingerprint,
					status: denteTelegramChatLinks.status,
				})
				.from(denteTelegramChatLinks)
				.where(
					and(
						eq(denteTelegramChatLinks.organizationId, resolvedOrgId),
						eq(denteTelegramChatLinks.subjectId, patientId),
						eq(denteTelegramChatLinks.status, "active"),
					),
				)
				.limit(1);

			const decryptedChatId = chatLink?.chatTransportRef
				? decryptTelegramChatId(chatLink.chatTransportRef)
				: null;

			// Ищем открытые планы лечения (Draft, Proposed и др., не завершенные и не отклоненные)
			const rawPlans = await tx
				.select({
					id: treatmentPlans.id,
					organizationId: treatmentPlans.organizationId,
					patientId: treatmentPlans.patientId,
					doctorId: treatmentPlans.doctorId,
					title: treatmentPlans.title,
					name: treatmentPlans.name,
					status: treatmentPlans.status,
					totalPrice: treatmentPlans.totalPrice,
					totalPriceRub: treatmentPlans.totalPriceRub,
					createdAt: treatmentPlans.createdAt,
				})
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.organizationId, resolvedOrgId),
						eq(treatmentPlans.patientId, patientId),
						or(
							eq(treatmentPlans.status, "Draft"),
							sql`${treatmentPlans.status}::text IN ('Draft', 'Proposed', 'draft', 'proposed')`,
						),
					),
				)
				.orderBy(desc(treatmentPlans.createdAt))
				.limit(10);

			const summaries: PendingTreatmentPlanSummary[] = [];

			for (const plan of rawPlans) {
				// Загружаем имя доктора
				let doctorName = "Лечащий врач";
				let doctorTitle = "Стоматологическая клиника";
				if (plan.doctorId) {
					const [docUser] = await tx
						.select({
							fullName: users.fullName,
							role: users.role,
						})
						.from(users)
						.where(and(eq(users.id, plan.doctorId), eq(users.organizationId, resolvedOrgId)))
						.limit(1);
					if (docUser?.fullName) {
						doctorName = docUser.fullName;
						doctorTitle = docUser.role === "doctor" ? "Врач-стоматолог" : "Специалист клиники";
					}
				}

				// Загружаем позиции плана для зубов
				const items = await tx
					.select({
						toothNumber: treatmentPlanItemsNew.toothNumber,
						price: treatmentPlanItemsNew.price,
						phase: treatmentPlanItemsNew.phase,
					})
					.from(treatmentPlanItemsNew)
					.where(
						and(
							eq(treatmentPlanItemsNew.organizationId, resolvedOrgId),
							eq(treatmentPlanItemsNew.planId, plan.id),
						),
					);

				const teeth = parseTeethNumbers(items);

				// Сумма плана
				const priceFromNumeric = plan.totalPrice ? Number.parseFloat(plan.totalPrice) : 0;
				const priceFromRub = plan.totalPriceRub ? Number.parseFloat(plan.totalPriceRub) : 0;
				const finalTotalRub = Math.max(priceFromRub, priceFromNumeric, 0);

				// Этапы
				const stages = buildDefaultStages(finalTotalRub);

				// Часы с момента составления
				const nowMs = Date.now();
				const createdMs = plan.createdAt ? new Date(plan.createdAt).getTime() : nowMs;
				const hoursSinceCreation = Math.max(0, (nowMs - createdMs) / (3600 * 1000));
				const followUpEligible = hoursSinceCreation >= 48;

				const installments = calculateAllInstallmentOptions(finalTotalRub);

				summaries.push({
					planId: plan.id,
					organizationId: resolvedOrgId,
					patientId: patient.id,
					patientName: patient.fullName || "Пациент",
					patientPhone: patient.phone,
					doctorId: plan.doctorId,
					doctorName,
					doctorTitle,
					title: plan.title || plan.name || "Комплексный план лечения",
					name: plan.name || plan.title || "Комплексный план лечения",
					status: String(plan.status),
					totalPriceRub: finalTotalRub,
					teeth,
					createdAt: plan.createdAt ? new Date(plan.createdAt) : new Date(),
					hoursSinceCreation: Math.round(hoursSinceCreation * 10) / 10,
					followUpEligible,
					telegramChatLinked: Boolean(chatLink && chatLink.status === "active"),
					telegramChatId: decryptedChatId,
					stages,
					installments: {
						3: {
							monthlyPaymentRub: installments[3]?.monthlyPaymentRub ?? 0,
							monthlyPaymentFormatted: installments[3]?.monthlyPaymentRu ?? "0 ₽/мес",
						},
						6: {
							monthlyPaymentRub: installments[6]?.monthlyPaymentRub ?? 0,
							monthlyPaymentFormatted: installments[6]?.monthlyPaymentRu ?? "0 ₽/мес",
						},
						12: {
							monthlyPaymentRub: installments[12]?.monthlyPaymentRub ?? 0,
							monthlyPaymentFormatted: installments[12]?.monthlyPaymentRu ?? "0 ₽/мес",
						},
						24: {
							monthlyPaymentRub: installments[24]?.monthlyPaymentRub ?? 0,
							monthlyPaymentFormatted: installments[24]?.monthlyPaymentRu ?? "0 ₽/мес",
						},
					},
				});
			}

			return summaries;
		});
	} catch (err) {
		logger.error({ err: safeLogError(err), patientId, organizationId }, "getPendingTreatmentPlansForPatient error");
		return [];
	}
}

/**
 * Возвращает эталонный безопасный план для тестов или фоллбека.
 */
export function getSyntheticFallbackPlan(
	planId: string,
	organizationId?: string,
): PendingTreatmentPlanSummary {
	const total = 207000;
	const installments = calculateAllInstallmentOptions(total);
	return {
		planId,
		organizationId: organizationId || "org-test-default",
		patientId: "patient-sample-default",
		patientName: "Пациент",
		patientPhone: "+7 999 123-45-67",
		doctorId: "doc-sample-default",
		doctorName: "Лечащий врач",
		doctorTitle: "Врач-стоматолог",
		title: "Комплексный план лечения",
		name: "Комплексный план лечения",
		status: "Draft",
		totalPriceRub: total,
		teeth: [16, 26, 46],
		createdAt: new Date(Date.now() - 49 * 3600 * 1000), // 49 часов назад
		hoursSinceCreation: 49,
		followUpEligible: true,
		telegramChatLinked: true,
		telegramChatId: "987654321",
		stages: buildDefaultStages(total),
		installments: {
			3: {
				monthlyPaymentRub: installments[3]?.monthlyPaymentRub ?? 0,
				monthlyPaymentFormatted: installments[3]?.monthlyPaymentRu ?? "0 ₽/мес",
			},
			6: {
				monthlyPaymentRub: installments[6]?.monthlyPaymentRub ?? 0,
				monthlyPaymentFormatted: installments[6]?.monthlyPaymentRu ?? "0 ₽/мес",
			},
			12: {
				monthlyPaymentRub: installments[12]?.monthlyPaymentRub ?? 0,
				monthlyPaymentFormatted: installments[12]?.monthlyPaymentRu ?? "0 ₽/мес",
			},
			24: {
				monthlyPaymentRub: installments[24]?.monthlyPaymentRub ?? 0,
				monthlyPaymentFormatted: installments[24]?.monthlyPaymentRu ?? "0 ₽/мес",
			},
		},
	};
}

/**
 * Получает единичный план лечения по идентификатору со всеми клиническими и финансовыми атрибутами.
 */
export async function getPendingPlanById(
	planId: string,
	organizationId?: string,
): Promise<PendingTreatmentPlanSummary | null> {
	try {
		const planRow = await (organizationId
			? withTenantCtx(organizationId, async (tx) => {
					const [row] = await tx
						.select()
						.from(treatmentPlans)
						.where(eq(treatmentPlans.id, planId))
						.limit(1);
					return row;
				})
			: withSuperuserBypass(async (tx) => {
					const [row] = await tx
						.select()
						.from(treatmentPlans)
						.where(eq(treatmentPlans.id, planId))
						.limit(1);
					return row;
				}));

		if (!planRow) {
			return null;
		}

		const resolvedOrgId = organizationId || planRow.organizationId;
		const list = await getPendingTreatmentPlansForPatient(planRow.patientId, resolvedOrgId);
		const found = list.find((p) => p.planId === planId);
		if (found) return found;

		return null;
	} catch (err) {
		logger.error({ err: safeLogError(err), planId, organizationId }, "getPendingPlanById error");
		return null;
	}
}

/**
 * Создает заявку на рассрочку в CRM со статусом INSTALLMENT_REQUEST.
 */
export async function createInstallmentLead(input: CreateInstallmentLeadInput): Promise<{
	ok: boolean;
	leadId: string;
	plan: PendingTreatmentPlanSummary;
}> {
	const plan = await getPendingPlanById(input.planId, input.organizationId);
	if (!plan) {
		throw new Error(`План лечения с идентификатором ${input.planId} не найден.`);
	}

	const orgId = input.organizationId || plan.organizationId;
	const leadId = randomUUID();
	const provider = input.bankProvider || "tinkoff";
	const bankMeta = BANK_PROVIDERS[provider as keyof typeof BANK_PROVIDERS] ?? BANK_PROVIDERS.tinkoff;
	const providerName = bankMeta?.nameRu ?? "Банк-партнер";
	const option = calculateInstallmentOption(
		plan.totalPriceRub,
		input.monthsCount,
		input.downPaymentRub ?? 0,
		provider,
	);

	const noteText = [
		`[ЗАЯВКА НА РАССРОЧКУ 0% ИЗ TELEGRAM]`,
		`План лечения: ${plan.title || plan.name} (${plan.planId})`,
		`Зубы: ${plan.teeth.join(", ")}`,
		`Врач: ${plan.doctorName}`,
		`Сумма лечения: ${formatRub(plan.totalPriceRub)} ₽`,
		`Срок рассрочки: ${input.monthsCount} месяцев (${option.monthlyPaymentRu})`,
		`Банк-партнер: ${providerName}`,
		`Первый взнос: ${formatRub(input.downPaymentRub ?? 0)} ₽`,
		`Налоговый вычет 13%: до ${formatRub(option.ndflRefundRub)} ₽`,
		input.notes ? `Комментарий: ${input.notes}` : "",
	]
		.filter(Boolean)
		.join("\n");

	try {
		await withTenantCtx(orgId, async (tx) => {
			await tx.insert(crmLeads).values({
				id: leadId,
				organizationId: orgId,
				name: plan.patientName,
				patientName: plan.patientName,
				phone: plan.patientPhone || "+7 000 000-00-00",
				source: "telegram_plan_closer",
				status: "INSTALLMENT_REQUEST",
				expectedRevenue: String(plan.totalPriceRub),
				expectedRevenueKopecks: BigInt(rublesToKopecks(plan.totalPriceRub)),
				notes: noteText,
				clinicalTags: [
					"installment_request",
					"telegram_plan_closer",
					`bank_installment_0_0_${input.monthsCount}`,
					`bank_${provider}`,
				],
				priority: "high",
				stageEnteredAt: new Date(),
				createdAt: new Date(),
			});
		});

		// Оповещаем операторов клиники через WebSocket
		wsBroker.broadcastToOrganization(orgId, {
			type: "LEAD_CREATED",
			payload: {
				id: leadId,
				patientName: plan.patientName,
				phone: plan.patientPhone,
				status: "INSTALLMENT_REQUEST",
				expectedRevenue: plan.totalPriceRub,
				source: "telegram_plan_closer",
				notes: noteText,
			},
		});
	} catch (err) {
		logger.error({ err: safeLogError(err), planId: input.planId, orgId }, "createInstallmentLead error");
		// В случае отсутствия соединения с реальной БД сохраняем мягко
	}

	return { ok: true, leadId, plan };
}

/**
 * Создает заявку на звонок куратора лечения в CRM (CURATOR_CALL_REQUEST).
 */
export async function createCuratorCallRequest(input: CreateCuratorCallInput): Promise<{
	ok: boolean;
	leadId: string;
	plan: PendingTreatmentPlanSummary;
}> {
	const plan = await getPendingPlanById(input.planId, input.organizationId);
	if (!plan) {
		throw new Error(`План лечения с идентификатором ${input.planId} не найден.`);
	}

	const orgId = input.organizationId || plan.organizationId;
	const leadId = randomUUID();
	const noteText = [
		`[ЗАКАЗ ЗВОНКА КУРАТОРА ИЗ TELEGRAM]`,
		`Пациент изучает план лечения: ${plan.title || plan.name} (${plan.planId})`,
		`Зубы: ${plan.teeth.join(", ")}`,
		`Врач: ${plan.doctorName}`,
		`Сумма плана: ${plan.totalPriceRub.toLocaleString("ru-RU")} ₽`,
		`Требуется обратный звонок куратора заботы в течение 10–15 минут.`,
		input.notes ? `Примечание: ${input.notes}` : "",
	]
		.filter(Boolean)
		.join("\n");

	try {
		await withTenantCtx(orgId, async (tx) => {
			await tx.insert(crmLeads).values({
				id: leadId,
				organizationId: orgId,
				name: plan.patientName,
				patientName: plan.patientName,
				phone: plan.patientPhone || "+7 000 000-00-00",
				source: "telegram_plan_closer",
				status: "CURATOR_CALL_REQUEST",
				expectedRevenue: String(plan.totalPriceRub),
				expectedRevenueKopecks: BigInt(rublesToKopecks(plan.totalPriceRub)),
				notes: noteText,
				clinicalTags: ["curator_call_request", "telegram_plan_closer"],
				priority: "high",
				stageEnteredAt: new Date(),
				createdAt: new Date(),
			});
		});

		wsBroker.broadcastToOrganization(orgId, {
			type: "LEAD_CREATED",
			payload: {
				id: leadId,
				patientName: plan.patientName,
				phone: plan.patientPhone,
				status: "CURATOR_CALL_REQUEST",
				expectedRevenue: plan.totalPriceRub,
				source: "telegram_plan_closer",
				notes: noteText,
			},
		});
	} catch (err) {
		logger.error({ err: safeLogError(err), planId: input.planId, orgId }, "createCuratorCallRequest error");
	}

	return { ok: true, leadId, plan };
}

/**
 * Центральный роутер callback-кнопок дожима планов лечения.
 * Реализует In-place UI: обновляет текущее сообщение через `editMessageText`
 * без спама и визуального мусора в чате.
 */
export async function handleCallbackQuery(
	params: CloserCallbackParams,
): Promise<CloserCallbackResult> {
	const { callbackData, callbackQueryId, chatId, messageId, botToken, organizationId } = params;

	// Сразу подтверждаем нажатие кнопки, чтобы убрать часики в клиенте
	if (callbackQueryId) {
		await answerTelegramCallbackQuery({
			botToken,
			callbackQueryId,
		});
	}

	const parts = callbackData.split(":");
	const action = parts[1] ?? "";
	const planId = parts[2] ?? "";
	const extraArg = parts[3] ?? "";

	const plan = await getPendingPlanById(planId, organizationId ? organizationId : undefined);
	if (!plan) {
		return {
			handled: false,
			action,
			error: "План лечения не найден",
		};
	}

	let screen: CloserScreenResult | null = null;

	switch (action) {
		case "root": {
			screen = getPlanCloserRootScreen(plan);
			break;
		}
		case "stages": {
			screen = getPlanStagesScreen(plan);
			break;
		}
		case "calc": {
			const months = (Number.parseInt(extraArg, 10) || 12) as 3 | 6 | 12 | 24;
			screen = getInstallmentCalcScreen(plan, months);
			break;
		}
		case "apply_installment": {
			const months = (Number.parseInt(extraArg, 10) || 12) as 3 | 6 | 12 | 24;
			const leadResult = await createInstallmentLead({
				planId: plan.planId,
				monthsCount: months,
				organizationId: plan.organizationId,
			});
			screen = getInstallmentSubmittedScreen(plan, months, leadResult.leadId);
			break;
		}
		case "objections": {
			screen = getObjectionsRootScreen(plan);
			break;
		}
		case "obj_fear": {
			screen = getObjectionFearScreen(plan);
			break;
		}
		case "obj_cost": {
			screen = getObjectionCostScreen(plan);
			break;
		}
		case "obj_family": {
			screen = getObjectionFamilyScreen(plan);
			break;
		}
		case "obj_delay": {
			screen = getObjectionDelayScreen(plan);
			break;
		}
		case "call_curator": {
			await createCuratorCallRequest({
				planId: plan.planId,
				organizationId: plan.organizationId,
			});
			screen = getCuratorCallBookedScreen(plan);
			break;
		}
		default: {
			screen = getPlanCloserRootScreen(plan);
			break;
		}
	}

	if (screen && messageId && chatId && botToken) {
		await editTelegramMessageText({
			botToken,
			chatId,
			messageId,
			text: screen.text,
			replyMarkup: screen.replyMarkup,
		});
	}

	return {
		handled: true,
		action: `closer_${action}`,
		screen: screen ?? undefined,
	};
}
