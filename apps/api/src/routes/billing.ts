import {
	type CreatePaymentInput,
	createPaymentSchema,
	documentKindMetadata,
	type Payment,
	paymentSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import {
	createPaymentInDb,
	findPaymentByClientMutationIdInDb,
	getDocumentForBilling,
	getPatientForBilling,
	getVisitForBilling,
} from "../db/billingQuery.js";
import { getRequestIdentity } from "../security/identity.js";
import {
	enforcePermissionWhenStaffKnown,
	permissionRefusalMessage,
	roleHasPermission,
} from "../security/permissions.js";
import {
	doctorPayouts,
	resolvePayoutPeriod,
} from "../services/finance/doctorPayouts.js";
import { explainNegativePayouts } from "../services/finance/payoutNegativeExplain.js";
import { clinicTimeZone } from "../services/reports/managerReports.js";
/*
 * Перевод слов разборщика в слова человека — ОДИН на весь сервер. Своей копии
 * здесь нет намеренно: местная заплата этого класса уже написана в
 * routes/telegram.ts со своим списком латинских слов, и она отстала от
 * установленного zod на шесть кодов замечаний из шестнадцати. Второй словарь —
 * та же болезнь, из которой в этом дереве выросли девять расчётов долга.
 */
import {
	type SchemaIssueLike,
	schemaRefusalMessage,
} from "../utils/schemaRefusalWords.js";
/*
 * Разбор границы периода один на весь сервер и живёт в маршрутах отчётов. Своей
 * копии здесь нет намеренно: календарная дата — источник истины о том, какой
 * день считать, и второй её разбор разъехался бы с первым при первой же правке.
 * Ровно из такой экономии в этом дереве выросли четыре расчёта долга пациента и
 * три копии `clinicTimeZone`. Цикла нет: `routes/reports.ts` про выплаты не знает.
 */
import { resolvePeriodBoundary } from "./reports.js";

function documentCanReceivePayment(
	documentKind: keyof typeof documentKindMetadata,
): boolean {
	const metadata = documentKindMetadata[documentKind];
	return (
		metadata.group === "payment" &&
		documentKind !== "payment_refund_correction_request"
	);
}

const paymentValidationMessage =
	"Ни одно поле оплаты не прошло проверку. Проверьте сумму, дату, способ оплаты, фискальный чек и данные плательщика и повторите запись оплаты.";
const billingPaymentScopeError = "BillingPaymentScopeError" as const;

/**
 * Названия полей оплаты по-русски, чтобы отказ указывал на конкретное поле.
 *
 * Подписи стоят в кавычках после слова «поле», поэтому нужны в ИМЕНИТЕЛЬНОМ
 * падеже и должны читаться самостоятельно: кассир видит их без окружающей формы.
 *
 * ЗДЕСЬ БОЛЬШЕ НЕТ ПОДПИСИ `paidAt: "дата оплаты"`, и это не уборка, а снятие
 * ложного обещания. Поля `paidAt` во входной схеме оплаты НЕТ
 * (`packages/shared/src/index.ts`, `createPaymentSchema`), и записывающий слой
 * его не пишет (`db/billingQuery.ts`, `createPaymentInDb`): колонка
 * `payments.paid_at` заполняется `defaultNow()` — моментом НАЖАТИЯ КНОПКИ, а не
 * моментом расчёта с пациентом. Подпись обещала читателю поле, которого нет, и
 * замечание разборщика по нему не могло возникнуть ни разу.
 *
 * ЧТО ЭТО ЗНАЧИТ ДЛЯ КЛИНИКИ, И ПОЧЕМУ ЭТО НЕ ЧИНИТСЯ ЗДЕСЬ. Вчерашняя касса,
 * забитая сегодня утром, получает сегодняшнюю дату. Зарплатный период врача
 * отбирается по `payments.paid_at` (`services/finance/doctorPayouts.ts`), и
 * налоговый год справки о вычете — тоже (`documents/guards.ts`,
 * `paymentPaidInTaxYear`). То есть смена уезжает в чужой расчёт зарплаты, а на
 * границе года — в чужой налоговый период.
 *
 * Починка этого — НЕ арифметика, а решение о полномочиях, и оно за ведущим:
 * добавить `paidAt` во входную схему значит разрешить клиенту НАЗНАЧАТЬ дату
 * выручки, то есть задним числом переносить деньги между налоговыми периодами.
 * Развилка и три варианта (запрет; разрешение с серверной проверкой диапазона и
 * отдельным правом; вывод даты из уже существующего и уже проверяемого
 * `fiscalReceiptIssuedAt`) вынесены в отчёт, а не выбраны молча здесь.
 */
const paymentFieldLabels: Record<string, string> = {
	amountRub: "сумма оплаты",
	patientId: "пациент",
	visitId: "прием",
	documentId: "документ",
	method: "способ оплаты",
	fiscalReceiptNumber: "номер фискального чека",
	fiscalReceiptIssuedAt: "дата фискального чека",
	fiscalReceiptUrl: "ссылка на чек",
	fiscalReceipt: "фискальный чек",
	clientMutationId: "ключ операции",
	payerFullName: "плательщик",
	payerInn: "ИНН плательщика",
	payerBirthDate: "дата рождения плательщика",
	payerIdentityDocument: "документ плательщика",
	payerRelationship: "родство плательщика",
	taxDeductionCode: "код налогового вычета",
	note: "примечание",
};

/**
 * Отказ должен называть поле, причину И следующий шаг.
 *
 * БЫЛО, первый проход: на любую ошибку возвращался один и тот же перечень из
 * пяти пунктов — «проверьте сумму, дату, способ оплаты, фискальный чек и явные
 * данные плательщика». Кассир, набравший 1500,50, получал предложение проверить
 * пять вещей и не узнавал, что дело в копейках. Разбирать такое в очереди у
 * кассы невозможно. Называние поля — правильное решение того прохода, и оно
 * остаётся: словарь `paymentFieldLabels` выше и есть его результат.
 *
 * БЫЛО, второй дефект, который чинится здесь. Рядом с русской подписью поля
 * ставилось `issue.message` — слово РАЗБОРЩИКА. Замерено `app.inject`:
 *
 *   POST /api/billing/payments, пустое тело
 *     → «Оплата не записана. пациент: Required; сумма: Required.»
 *   POST /api/billing/payments, сумма с запятой, способ оплаты по-русски
 *     → «… способ оплаты: Invalid enum value. Expected 'cash' | 'card' |
 *        'bank_transfer' | 'online' | 'insurance' | 'family_wallet' | 'other',
 *        received 'нал' …»
 *
 * То есть кассиру выводился внутренний перечень значений колонки базы. И хуже:
 * он не видел даже смеси языков. Клиент гасит фразу ЦЕЛИКОМ, если в ней есть
 * латинское слово из шести и более знаков (`apps/web/src/AppHelpers.tsx`,
 * `technicalWorkflowFailurePattern` под флагом `/i`) — `Required`, `Expected`,
 * `received`, `string`, `number`, `Invalid` попадают все. На экране оставалась
 * общая подпись по коду ответа.
 *
 * СТАЛО: перевод машинных слов в человеческие берётся из ОДНОГО дома —
 * `utils/schemaRefusalWords.ts`. Своего списка латинских слов здесь нет и не
 * будет: такой список уже написали по месту в `routes/telegram.ts`, и он отстал
 * от установленного `zod` на шесть кодов замечаний из шестнадцати.
 *
 * Заголовок «Оплата не записана» из текста УБРАН: экран приписывает его сам
 * (`responseErrorMessage(response, "Оплата не записана")` в
 * `apps/web/src/useAppLogic.tsx`), и кассир читал его дважды.
 *
 * Машинный код ответа `BillingValidationError` не менялся: интерфейс по нему
 * ветвится, и подменять машинное поле человеческой фразой значило бы поставить
 * фасад вместо починки.
 */
function paymentValidationDetail(
	issues: ReadonlyArray<SchemaIssueLike>,
): string {
	return schemaRefusalMessage({
		issues,
		fieldLabels: paymentFieldLabels,
		retryAction: "запись оплаты",
		fallbackMessage: paymentValidationMessage,
	});
}

function sendBillingPaymentScopeError(
	reply: FastifyReply,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: billingPaymentScopeError,
		message,
	});
}

/**
 * Нарушение уникальности по ключу идемпотентности оплаты.
 *
 * PostgreSQL отдаёт код 23505 и имя ограничения. Проверяем именно имя, а не
 * любой 23505: конфликт по другому ограничению — это другая ошибка, и её
 * гасить нельзя.
 */
const paymentClientMutationConstraint = "payments_org_client_mutation_unique";

function isDuplicateClientMutationError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const candidate = error as {
		code?: unknown;
		constraint?: unknown;
		message?: unknown;
		cause?: unknown;
	};
	const code = typeof candidate.code === "string" ? candidate.code : null;
	const constraint =
		typeof candidate.constraint === "string" ? candidate.constraint : null;
	const message =
		typeof candidate.message === "string" ? candidate.message : "";
	if (
		code === "23505" &&
		(constraint === paymentClientMutationConstraint ||
			message.includes(paymentClientMutationConstraint))
	) {
		return true;
	}
	// Драйвер может обернуть исходную ошибку базы.
	if (candidate.cause) return isDuplicateClientMutationError(candidate.cause);
	return false;
}

function cleanPaymentText(value: string | null | undefined): string | null {
	const clean = value?.trim();
	return clean ? clean : null;
}

function normalizedFiscalReceipt(
	input: CreatePaymentInput["fiscalReceipt"],
): Payment["fiscalReceipt"] {
	if (!input) return null;
	const fn = cleanPaymentText(input.fn);
	const fd = cleanPaymentText(input.fd);
	const fpd = cleanPaymentText(input.fpd);
	const cashierName = cleanPaymentText(input.cashierName);
	const receiptUrl = cleanPaymentText(input.receiptUrl);
	if (!fn && !fd && !fpd && !cashierName && !receiptUrl) return null;
	return {
		fn,
		fd,
		fpd,
		cashierName,
		receiptUrl,
		operationType: input.operationType ?? "income",
	};
}

function fiscalReceiptLabel(
	fiscalReceipt: Payment["fiscalReceipt"],
): string | null {
	if (!fiscalReceipt) return null;
	const parts = [
		fiscalReceipt.fn ? `ФН ${fiscalReceipt.fn}` : null,
		fiscalReceipt.fd ? `ФД ${fiscalReceipt.fd}` : null,
		fiscalReceipt.fpd ? `ФПД ${fiscalReceipt.fpd}` : null,
	].filter(Boolean);
	return parts.length ? parts.join("; ") : null;
}

function paymentRetrySignatureFromInput(input: CreatePaymentInput) {
	const fiscalReceipt = normalizedFiscalReceipt(input.fiscalReceipt);
	return {
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		documentId: input.documentId ?? null,
		amountRub: input.amountRub,
		method: input.method,
		fiscalReceiptNumber:
			cleanPaymentText(input.fiscalReceiptNumber) ??
			fiscalReceiptLabel(fiscalReceipt),
		fiscalReceiptIssuedAt: cleanPaymentText(input.fiscalReceiptIssuedAt),
		fiscalReceiptUrl:
			cleanPaymentText(input.fiscalReceiptUrl) ??
			cleanPaymentText(fiscalReceipt?.receiptUrl),
		fiscalReceipt,
		payerFullName: cleanPaymentText(input.payerFullName),
		payerInn: cleanPaymentText(input.payerInn),
		payerBirthDate: cleanPaymentText(input.payerBirthDate),
		payerIdentityDocument: cleanPaymentText(input.payerIdentityDocument),
		payerRelationship: cleanPaymentText(input.payerRelationship),
		taxDeductionCode: input.taxDeductionCode ?? null,
		note: input.note ?? null,
	};
}

function paymentRetrySignatureFromPayment(payment: Payment) {
	return {
		patientId: payment.patientId,
		visitId: payment.visitId ?? null,
		documentId: payment.documentId ?? null,
		amountRub: payment.amountRub,
		method: payment.method,
		fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
		fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
		fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
		fiscalReceipt: payment.fiscalReceipt ?? null,
		payerFullName: payment.payerFullName ?? null,
		payerInn: payment.payerInn ?? null,
		payerBirthDate: payment.payerBirthDate ?? null,
		payerIdentityDocument: payment.payerIdentityDocument ?? null,
		payerRelationship: payment.payerRelationship ?? null,
		taxDeductionCode: payment.taxDeductionCode ?? null,
		note: payment.note ?? null,
	};
}

function paymentRetryMatchesExisting(
	existingPayment: Payment,
	input: CreatePaymentInput,
): boolean {
	return (
		JSON.stringify(paymentRetrySignatureFromPayment(existingPayment)) ===
		JSON.stringify(paymentRetrySignatureFromInput(input))
	);
}

/** Параметры расчёта выплат. Обе даты необязательны — умолчание месяц. */
const payoutQuerySchema = z.object({
	from: z.string().min(1).optional(),
	to: z.string().min(1).optional(),
});

type PayoutAccess = {
	organizationId: string;
	userId: string;
	role: string;
	/** "all" — все врачи клиники, "own" — только свои строки. */
	scope: "all" | "own";
};

/**
 * Доступ к зарплатным данным.
 *
 * ПОЧЕМУ ЗДЕСЬ requirePermission-ЛОГИКА, А НЕ enforcePermissionWhenStaffKnown.
 * Мягкая проверка пропускает запрос, если сотрудник не опознан
 * (security/permissions.ts: `if (!identity.userId || !identity.role) return true`).
 * Для расписания это осознанный компромисс переходного периода. Для зарплаты он
 * означает дыру: запрос с одним лишь секретом клиники, без токена сотрудника,
 * прошёл бы мимо роли — и фильтр «врач видит только свои выплаты» обходился бы
 * ОТСУТСТВИЕМ токена. Поэтому здесь личность сотрудника обязательна.
 *
 * ЭТО МЕНЯЕТ КОНТРАКТ ДОСТУПА по сравнению с остальными маршрутами чтения, и
 * сделано сознательно в сторону отказа: цена ошибки — зарплата всей клиники,
 * видимая любому, кто раздобыл общий секрет периметра.
 */
async function requirePayoutAccess(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<PayoutAccess | null> {
	// Секрет периметра остаётся первым барьером, как на всех защищённых чтениях.
	if (
		!(await requireClinicalReadAccess(request, reply, "billing payouts read"))
	)
		return null;

	const identity = getRequestIdentity(request);
	if (!identity.organizationId) {
		reply.code(401).send({
			error: "AuthRequired",
			message:
				"Требуется авторизация рабочего кабинета клиники: расчёт выплат считается по одной клинике.",
		});
		return null;
	}
	/*
	 * Непроверенная организация (dev-заголовок x-organization-id) к зарплате не
	 * допускается вовсе, даже на чтение: клинику в этом случае называет сам
	 * отправитель запроса.
	 */
	if (!identity.verified) {
		reply.code(401).send({
			error: "VerifiedOrganizationRequired",
			message:
				"Клиника определена не подписанным токеном, а заголовком разработки. " +
				"Зарплатные данные по такому запросу не отдаются: войдите в рабочий кабинет клиники.",
		});
		return null;
	}
	if (!identity.userId || !identity.role) {
		reply.code(401).send({
			error: "StaffAuthRequired",
			message:
				"Нужен вход сотрудника: расчёт выплат показывает зарплату конкретных врачей, " +
				"и сервер обязан знать, кто именно смотрит.",
		});
		return null;
	}

	if (roleHasPermission(identity.role, "payroll.read")) {
		return {
			organizationId: identity.organizationId,
			userId: identity.userId,
			role: identity.role,
			scope: "all",
		};
	}
	if (roleHasPermission(identity.role, "payroll.read.own")) {
		return {
			organizationId: identity.organizationId,
			userId: identity.userId,
			role: identity.role,
			scope: "own",
		};
	}

	/*
	 * ТЕКСТ ОТКАЗА БЕРЁТСЯ ИЗ ОДНОГО МЕСТА. Здесь стояла своя формулировка
	 * `Роль «${identity.role}» не видит выплаты врачам…` — третья копия одного и
	 * того же дефекта: латинский ключ `users.role` в тексте для человека. Фильтр
	 * клиента (`apps/web/src/AppHelpers.tsx`, `technicalWorkflowFailurePattern`
	 * под флагом `/i`) гасит любую фразу с латинским словом из шести и более букв
	 * ЦЕЛИКОМ, поэтому эта строка до экрана не доходила вообще.
	 *
	 * Своя формулировка не нужна и по второй причине: «сам врач видит свои
	 * выплаты» читателю этой ветки не пригодится — врач сюда не попадает, у него
	 * есть право `payroll.read.own` и он ушёл строкой выше.
	 */
	reply.code(403).send({
		error: "PermissionDenied",
		permission: "payroll.read",
		role: identity.role,
		message: permissionRefusalMessage(identity.role, "payroll.read"),
	});
	return null;
}

export async function registerBillingRoutes(app: FastifyInstance) {
	/**
	 * Выплаты врачам за период: касса врача, удержание за материалы, к выплате.
	 *
	 * ЧТО БЫЛО. Маршрута не существовало, а экран `DoctorPayoutDashboard` его
	 * звал: клиника получала «Ошибка загрузки выплат: HTTP 404» — если бы вообще
	 * могла до этого экрана дойти, потому что он недостижим из интерфейса.
	 * Владелец считал зарплату врачей в тетради, хотя касса, себестоимость
	 * материалов и ставка врача в базе уже есть.
	 *
	 * Врач без заданной ставки НЕ считается по умолчанию из кода: такая строка
	 * приходит с признаком «ставка не задана», пустой суммой и текстом причины.
	 * Тихая цифра по чужому предположению — это выдуманная зарплата.
	 */
	app.get("/api/billing/payouts", async (request, reply) => {
		const access = await requirePayoutAccess(request, reply);
		if (!access) return;

		const parsedQuery = payoutQuerySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "PayoutValidationError",
				message:
					"Проверьте период расчёта: начало и конец передаются датой со временем.",
			});
		}

		// Границы месяца по умолчанию считает тот, кто знает пояс клиники, а не
		// пояс серверного процесса: иначе приёмы последнего вечера месяца уезжают
		// в следующий расчёт зарплаты либо попадают в оба.
		const timeZone = await clinicTimeZone(access.organizationId);
		/*
		 * КАЛЕНДАРНАЯ ДАТА РАЗРЕШАЕТСЯ ЗДЕСЬ, В ПОЯСЕ КЛИНИКИ, ДО РАСЧЁТА.
		 *
		 * ЧТО БЫЛО СЛОМАНО. Схема принимает любую непустую строку, поэтому маршрут и
		 * раньше «принимал» `2026-07-01` — но разбирал её `new Date("2026-07-01")`
		 * внутри `resolvePayoutPeriod`, а это по спецификации UTC-полночь. То есть
		 * календарная дата молча разрешалась в ЧУЖОМ поясе: для клиники в UTC+4
		 * зарплатный месяц начинался 1-го числа в 04:00 по её часам, и касса первой
		 * смены уезжала в предыдущий расчёт. Отказа не было — была неверная сумма.
		 *
		 * Клиент при этом посылал мгновение, посчитанное в поясе БРАУЗЕРА
		 * (`apps/web/src/pages/DoctorPayoutDashboard.tsx`), то есть у владельца сети
		 * каждый филиал получал свой сдвиг границы. Теперь клиент посылает
		 * календарную дату, а разрешает её тот, кто знает `clinics.timezone`.
		 *
		 * ЗАРПЛАТА — это то место, где граница месяца стоит денег: ошибка не в
		 * копейках, а в целой смене, и её замечают не в отчёте, а в разговоре с
		 * врачом. Полный ISO со смещением проходит насквозь, как и прежде.
		 */
		const bounds: { from?: string; to?: string } = {};
		for (const edge of ["from", "to"] as const) {
			const raw = parsedQuery.data[edge];
			if (raw === undefined) continue;
			const resolved = resolvePeriodBoundary(raw, edge, timeZone);
			if (resolved === null) {
				return reply.code(400).send({
					error: "PayoutValidationError",
					message:
						"Границы периода не разобраны. Передайте календарную дату вида ГГГГ-ММ-ДД либо дату со временем и смещением.",
				});
			}
			bounds[edge] = resolved.toISOString();
		}
		const period = resolvePayoutPeriod(bounds, new Date(), timeZone);
		if (!period.ok) {
			return reply
				.code(400)
				.send({ error: "PayoutValidationError", message: period.message });
		}

		try {
			const report = await doctorPayouts({
				organizationId: access.organizationId,
				from: period.from,
				to: period.to,
				// Фильтр «только свои» ставится в SQL: строки чужой зарплаты не должны
				// покидать базу вовсе, даже чтобы быть отброшенными в коде.
				onlyDoctorUserId: access.scope === "own" ? access.userId : null,
			});
			/*
			 * Отрицательная выплата объясняется словами и числами до того, как уйдёт
			 * на экран.
			 *
			 * БЫЛО: врач с долгом получал строку «Выплата отрицательная: материалы
			 * дороже начисленного процента» — ни одного числа, ни одного действия, а
			 * итог по клинике был крупным красным числом вообще без пояснения. При
			 * этом сам итог — сальдо встречных величин: выплату одному врачу и долг
			 * другого. Владелец не мог ни объяснить минус врачу, ни увидеть, сколько
			 * клиника на самом деле платит и сколько ей должны.
			 *
			 * Шаг ничего не считает заново: суммы остаются те, что вернул расчёт, —
			 * добавляются только текст и разложенный по знаку итог. Клиника без
			 * отрицательных выплат не получает ни одного нового слова.
			 *
			 * ДОЛГ: правильное место для этого текста — `payoutRowNote` внутри
			 * `doctorPayouts.ts`; на момент правки тот файл держал другой инженер, и
			 * по правилу границ он не трогался. Подробности и план переноса — в шапке
			 * `services/finance/payoutNegativeExplain.ts`.
			 */
			const explained = explainNegativePayouts(report, { scope: access.scope });
			return { scope: access.scope, ...explained };
		} catch (error) {
			request.log.error({ err: error }, "billing payouts calculation failed");
			/*
			 * Отказ сервера нельзя выдавать за пустоту: пустой список на месте
			 * зарплаты прочитают как «никто ничего не заработал». Поэтому 500 с
			 * текстом, а не 200 с нулями.
			 */
			return reply.code(500).send({
				error: "PayoutCalculationFailed",
				message:
					"Расчёт выплат не выполнен: сервер не смог посчитать суммы по базе. " +
					"Это отказ расчёта, а не отсутствие заработка — покажите сообщение администратору системы.",
			});
		}
	});

	app.post("/api/billing/payments", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"billing payment create",
			))
		)
			return;
		// Секрет клиники — это барьер периметра, он одинаков для чтения и записи.
		// Здесь дополнительно проверяется роль сотрудника: врач и ассистент к кассе
		// не допущены. Мягкий режим — если сотрудник не опознан, поведение прежнее
		// (см. security/permissions.ts).
		if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write"))
			return;
		const parsedInput = createPaymentSchema.safeParse(request.body);
		if (!parsedInput.success) {
			return reply.code(400).send({
				error: "BillingValidationError",
				message: paymentValidationDetail(parsedInput.error.issues),
			});
		}
		// БЫЛО: getDefaultOrganizationId() — это `SELECT id FROM organizations LIMIT 1`.
		// Оплата любой клиники записывалась в ПЕРВУЮ организацию таблицы: деньги
		// попадали в чужую кассу, а у своей клиники не появлялись вовсе. Организация
		// должна приходить из подписанного токена, как во всех остальных маршрутах.
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"billing payment create",
		);
		if (!orgId) return;
		const input: CreatePaymentInput = parsedInput.data;
		if (!input.clientMutationId) {
			return reply.code(400).send({
				error: "BillingValidationError",
				message:
					"Ключ операции (clientMutationId) обязателен для предотвращения двойных списаний.",
			});
		}
		const existingPayment = await findPaymentByClientMutationIdInDb(
			orgId,
			input.clientMutationId,
		);
		if (existingPayment?.patientId) {
			if (existingPayment.patientId !== input.patientId) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Клиентская операция уже относится к другой оплате.",
				);
			}
			return reply.code(200).send(paymentSchema.parse(existingPayment));
		}
		let paymentInput = input;
		const patient = await getPatientForBilling(orgId, input.patientId);
		if (!patient) {
			return sendBillingPaymentScopeError(
				reply,
				404,
				"Пациент для оплаты не найден.",
			);
		}
		if (input.visitId) {
			const visit = await getVisitForBilling(orgId, input.visitId);
			if (!visit) {
				return sendBillingPaymentScopeError(
					reply,
					404,
					"Прием для оплаты не найден.",
				);
			}
			if (visit.patientId !== input.patientId) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Прием оплаты относится к другому пациенту.",
				);
			}
		}
		if (input.documentId) {
			const document = await getDocumentForBilling(orgId, input.documentId);
			if (!document) {
				return sendBillingPaymentScopeError(
					reply,
					404,
					"Документ для оплаты не найден.",
				);
			}
			if (document.patientId !== input.patientId) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Документ оплаты относится к другому пациенту.",
				);
			}
			if (
				document.visitId &&
				input.visitId &&
				document.visitId !== input.visitId
			) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Документ оплаты относится к другому приему.",
				);
			}
			if (document.visitId && !input.visitId) {
				const visit = await getVisitForBilling(orgId, document.visitId);
				if (!visit) {
					return sendBillingPaymentScopeError(
						reply,
						404,
						"Прием документа для оплаты не найден.",
					);
				}
				if (visit.patientId !== input.patientId) {
					return sendBillingPaymentScopeError(
						reply,
						409,
						"Прием документа относится к другому пациенту.",
					);
				}
				paymentInput = { ...input, visitId: document.visitId };
			}
			if (document.status === "voided") {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"К аннулированному документу нельзя привязать оплату.",
				);
			}
			if (document.kind === "payment_refund_correction_request") {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Заявление на возврат или коррекцию не принимает новую оплату. Оформите документ коррекции без повторной записи оплаты.",
				);
			}
			if (!documentCanReceivePayment(document.kind as any)) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Выберите финансовый документ для оплаты: договор, счет, акт, квитанцию, смету или рассрочку.",
				);
			}
		}
		if (existingPayment) {
			if (
				existingPayment.patientId !== paymentInput.patientId ||
				!paymentRetryMatchesExisting(existingPayment, paymentInput)
			) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета.",
				);
			}
			return reply.code(200).send(paymentSchema.parse(existingPayment));
		}
		try {
			const payment = await createPaymentInDb(orgId, paymentInput);
			return reply.code(201).send(paymentSchema.parse(payment));
		} catch (error) {
			/* Проверка «нет ли уже такой оплаты» выше и вставка здесь — два
         отдельных запроса вне транзакции. При двойном нажатии на «Принять
         оплату» оба запроса видят, что платежа нет, и оба вставляют.
         Деньги при этом в безопасности: в базе есть уникальный индекс
         payments_org_client_mutation_unique, второй INSERT падает.
         Но кассир видел HTTP 500 «Сервер не выполнил действие. Повторите
         позже» при том, что оплата уже прошла. Замерено на живом API,
         scratch/verify-payment-idempotency.mjs: два одновременных запроса
         давали 201/500 при одном платеже в базе.
         Нарушение уникальности по ключу идемпотентности означает ровно то
         же, что и удачная проверка выше: оплата уже записана. Возвращаем
         записанную. */
			if (isDuplicateClientMutationError(error)) {
				const alreadyStored = await findPaymentByClientMutationIdInDb(
					orgId,
					paymentInput.clientMutationId,
				);
				if (alreadyStored) {
					if (
						alreadyStored.patientId !== paymentInput.patientId ||
						!paymentRetryMatchesExisting(alreadyStored, paymentInput)
					) {
						return sendBillingPaymentScopeError(
							reply,
							409,
							"Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета.",
						);
					}
					return reply.code(200).send(paymentSchema.parse(alreadyStored));
				}
			}
			throw error;
		}
	});
}
