import type { CreatePaymentInput, Payment } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	permissionRefusalMessage,
	roleHasPermission,
} from "../../security/permissions.js";
import { cleanPaymentText } from "./fiscalReceiptService.js";
import {
	billingPaymentScopeError,
	paymentClientMutationConstraint,
	type PayoutAccess,
} from "./types.js";

export function isDuplicateClientMutationError(error: unknown): boolean {
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

export function sendBillingPaymentScopeError(
	reply: FastifyReply,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: billingPaymentScopeError,
		message,
	});
}

export function paymentRetryMatchesExisting(
	existingPayment: Payment,
	input: CreatePaymentInput,
): boolean {
	if (existingPayment.patientId !== input.patientId) return false;
	if ((existingPayment.visitId ?? null) !== (input.visitId ?? null)) return false;
	if ((existingPayment.documentId ?? null) !== (input.documentId ?? null)) return false;
	if (Number(existingPayment.amountRub) !== Number(input.amountRub)) return false;

	const methodsMatch =
		existingPayment.method === input.method ||
		input.method === "split" ||
		input.method === "mixed";
	if (!methodsMatch) return false;

	if ((existingPayment.payerInn ?? null) !== (cleanPaymentText(input.payerInn) ?? null)) return false;
	if ((existingPayment.payerFullName ?? null) !== (cleanPaymentText(input.payerFullName) ?? null)) return false;
	if ((existingPayment.taxDeductionCode ?? null) !== (input.taxDeductionCode ?? null)) return false;

	const inputReceiptNum = cleanPaymentText(input.fiscalReceiptNumber);
	if (inputReceiptNum && existingPayment.fiscalReceiptNumber !== inputReceiptNum) return false;

	const inputNote = cleanPaymentText(input.note);
	const existingNote = cleanPaymentText(existingPayment.note);
	if (inputNote && existingNote && existingNote !== inputNote && !existingNote.startsWith(inputNote)) {
		return false;
	}

	return true;
}

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
export async function requirePayoutAccess(
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

	reply.code(403).send({
		error: "PermissionDenied",
		permission: "payroll.read",
		role: identity.role,
		message: permissionRefusalMessage(identity.role, "payroll.read"),
	});
	return null;
}
