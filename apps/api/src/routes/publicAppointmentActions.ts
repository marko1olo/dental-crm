/**
 * Подтверждение и отмена приёма пациентом в одно касание.
 *
 * ЗАЧЕМ
 * Напоминание уменьшает неявки, но не говорит, придёт ли человек. Тот, кто не
 * может прийти, обычно просто молчит: звонить неудобно, промолчать легко — и
 * клиника узнаёт об этом по пустому креслу. Одно касание меняет исход:
 * подтвердил — администратор не тратит утро на обзвон; отменил — слот
 * освобождается заранее, и его можно продать.
 *
 * ЭТО ЕДИНСТВЕННЫЙ ЗДЕСЬ АДРЕС БЕЗ АВТОРИЗАЦИИ, поэтому:
 *   • право на действие несёт короткий случайный код из таблицы, а не
 *     идентификатор приёма в адресе: /confirm/<uuid> позволял бы перебором
 *     трогать чужие записи. Само действие тоже задано кодом, а не путём, —
 *     ссылку подтверждения нельзя превратить в отмену, дописав /cancel;
 *   • адрес намеренно короткий (/api/p/<код>): он уходит в SMS, где кириллица
 *     даёт 70 знаков на сегмент, и каждый лишний символ клиника оплачивает;
 *   • ответ — страница на русском, а не JSON: пациент открывает ссылку в
 *     телефоне и должен увидеть понятный текст, а не структуру данных;
 *   • есть ограничение частоты запросов: адрес публичный;
 *   • отмена создаёт задачу администратору, а не молча освобождает слот, —
 *     клиника должна узнать об отказе и попробовать переставить пациента.
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	appointments,
	clinics,
	communicationTasks,
	organizations,
	patients,
} from "../db/schema.js";
import {
	markActionCodeUsed,
	resolveActionCode,
} from "../services/communications/appointmentActionLinks.js";
import { invalidateAppointmentReminders } from "../services/communications/appointmentReminders.js";
import { wsBroker } from "../services/websocketBroker.js";

// Публичная поверхность: без ограничения частоты по ней можно перебирать токены
// и создавать задачи администратору пачками.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string, now = Date.now()): boolean {
	const entry = requestCounts.get(ip);
	if (!entry || entry.resetAt <= now) {
		requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		// Карта не должна расти бесконечно на длинных запусках.
		if (requestCounts.size > 5000) {
			for (const [key, value] of requestCounts) {
				if (value.resetAt <= now) requestCounts.delete(key);
			}
		}
		return false;
	}
	entry.count += 1;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

/**
 * Страница ответа. Разметка намеренно простая и самодостаточная: пациент
 * открывает её из SMS в любом браузере, включая старый, и внешние ресурсы могут
 * не загрузиться.
 */
function renderPage(
	title: string,
	message: string,
	tone: "ok" | "warn" | "error",
): string {
	const accent =
		tone === "ok" ? "#0f766e" : tone === "warn" ? "#b45309" : "#b91c1c";
	const escapeHtml = (value: string) =>
		value
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");

	return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; padding: 32px 20px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
         background: #f8fafc; color: #0f172a; line-height: 1.5; }
  main { max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px 24px;
         box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08); }
  h1 { margin: 0 0 12px; font-size: 20px; color: ${accent}; }
  p { margin: 0; font-size: 16px; }
</style>
</head>
<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></main></body>
</html>`;
}

function sendPage(
	reply: FastifyReply,
	statusCode: number,
	title: string,
	message: string,
	tone: "ok" | "warn" | "error",
) {
	return reply
		.code(statusCode)
		.type("text/html; charset=utf-8")
		.send(renderPage(title, message, tone));
}

/** Название клиники для страницы. Пациент должен понимать, куда он попал. */
async function clinicTitle(organizationId: string): Promise<string> {
	const [clinic] = await db
		.select({ name: clinics.name })
		.from(clinics)
		.where(eq(clinics.organizationId, organizationId))
		.limit(1);
	if (clinic?.name) return clinic.name;

	const [organization] = await db
		.select({ name: organizations.name })
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);
	return organization?.name ?? "Клиника";
}

function formatAppointmentMoment(startsAt: Date, timezone: string): string {
	try {
		return new Intl.DateTimeFormat("ru-RU", {
			timeZone: timezone,
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit",
		}).format(startsAt);
	} catch (err) {
		console.error("[Dente] formatAppointmentMoment failed:", err);
		return new Intl.DateTimeFormat("ru-RU", {
			day: "numeric",
			month: "long",
			hour: "2-digit",
			minute: "2-digit",
		}).format(startsAt);
	}
}

export async function registerPublicAppointmentActionRoutes(
	app: FastifyInstance,
) {
	const handle = async (request: FastifyRequest, reply: FastifyReply) => {
		if (isRateLimited(request.ip)) {
			return sendPage(
				reply,
				429,
				"Слишком много запросов",
				"Попробуйте открыть ссылку через минуту.",
				"warn",
			);
		}

		const rawCode = (request.params as { code?: string }).code ?? "";
		const resolved = await resolveActionCode(rawCode);
		// Один и тот же ответ на неизвестный и на просроченный код: по разнице
		// ответов можно было бы перебором находить существующие ссылки.
		if (!resolved || resolved.expired) {
			return sendPage(
				reply,
				400,
				"Ссылка недействительна",
				"Срок действия ссылки истёк или она неполная. Позвоните в клинику, чтобы подтвердить или отменить приём.",
				"error",
			);
		}

		// Действие берётся из кода, а не из адреса: одну ссылку нельзя подменить
		// другой, дописав к ней /cancel.
		const payload = {
			organizationId: resolved.organizationId,
			appointmentId: resolved.appointmentId,
		};
		const expectedAction = resolved.action;

		/*
		 * КОНТЕКСТ АРЕНДАТОРА НА ЕДИНСТВЕННОМ ЗДЕСЬ АДРЕСЕ БЕЗ АВТОРИЗАЦИИ.
		 *
		 * Токена у пациента нет, поэтому `request.tenantId` не выставлен и
		 * глобальная обёртка server.ts этот обработчик не оборачивает. Под FORCE
		 * RLS ломалось всё, что ниже: поиск приёма отдавал ноль строк, и пациент
		 * получал «Запись не найдена» на живую запись; название клиники не
		 * читалось и заменялось словом «Клиника»; `UPDATE` статуса затрагивал
		 * ноль строк; вставка задачи администратору отвергалась кодом 42501.
		 *
		 * Обхода здесь не нужно и он был бы дырой: арендатор УЖЕ известен — его
		 * назвала строка кода, найденная выше единственным запросом под обходом.
		 * Под контекстом чужой приём недоступен ни на чтение, ни на запись, и
		 * подобранный чужой код ничего не откроет.
		 */
		return withTenantCtx(payload.organizationId, async () => {
			const [appointment] = await db
				.select({
					id: appointments.id,
					status: appointments.status,
					startsAt: appointments.startsAt,
					patientId: appointments.patientId,
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.id, payload.appointmentId),
						eq(appointments.organizationId, payload.organizationId),
					),
				)
				.limit(1);

			const title = await clinicTitle(payload.organizationId);
			if (!appointment) {
				return sendPage(
					reply,
					404,
					title,
					"Запись не найдена. Возможно, её уже отменили. Позвоните в клинику.",
					"error",
				);
			}

			const [clinic] = await db
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, payload.organizationId))
				.limit(1);
			const moment = formatAppointmentMoment(
				appointment.startsAt,
				clinic?.timezone ?? "Europe/Moscow",
			);

			// Прошедший приём подтверждать и отменять нечего, а сообщение об этом
			// понятнее, чем «ссылка недействительна».
			if (appointment.startsAt.getTime() < Date.now()) {
				return sendPage(
					reply,
					409,
					title,
					`Приём ${moment} уже прошёл. Чтобы записаться снова, позвоните в клинику.`,
					"warn",
				);
			}

			if (expectedAction === "confirm") {
				if (appointment.status === "confirmed") {
					// Повторное нажатие — обычное дело: пациент открыл ссылку дважды.
					return sendPage(
						reply,
						200,
						title,
						`Приём ${moment} уже подтверждён. Ждём вас.`,
						"ok",
					);
				}
				if (appointment.status !== "planned") {
					return sendPage(
						reply,
						409,
						title,
						`Приём ${moment} уже нельзя подтвердить: его статус изменила клиника. Позвоните нам.`,
						"warn",
					);
				}

				/*
				 * БЫЛО: UPDATE appointments SET status='confirmed' WHERE id=...
				 * без organizationId. SELECT выше уже фильтровал по org, но
				 * подтверждение по публичной ссылке — мутация статуса записи;
				 * id-only UPDATE ломает multi-tenant defense-in-depth (тот же
				 * класс, что visits/appointments staff path).
				 * СТАЛО: organizationId + id; 0 строк → не помечаем код использованным.
				 */
				const [confirmed] = await db
					.update(appointments)
					.set({ status: "confirmed" })
					.where(
						and(
							eq(appointments.id, appointment.id),
							eq(appointments.organizationId, payload.organizationId),
						),
					)
					.returning({ id: appointments.id });
				if (!confirmed) {
					return sendPage(
						reply,
						404,
						title,
						"Запись не найдена. Возможно, её уже отменили. Позвоните в клинику.",
						"error",
					);
				}
				await markActionCodeUsed(resolved.code);
				wsBroker.broadcastToOrganization(payload.organizationId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: appointment.id,
						source: "patient_confirmation",
					},
				});
				return sendPage(
					reply,
					200,
					title,
					`Спасибо! Приём ${moment} подтверждён. Ждём вас.`,
					"ok",
				);
			}

			if (appointment.status === "cancelled") {
				return sendPage(
					reply,
					200,
					title,
					`Приём ${moment} уже отменён. Чтобы записаться снова, позвоните в клинику.`,
					"ok",
				);
			}
			if (
				appointment.status !== "planned" &&
				appointment.status !== "confirmed"
			) {
				return sendPage(
					reply,
					409,
					title,
					`Приём ${moment} уже нельзя отменить по ссылке. Позвоните в клинику.`,
					"warn",
				);
			}

			/*
			 * БЫЛО: UPDATE status='cancelled' WHERE id only (см. confirm выше).
			 * СТАЛО: organizationId + id + RETURNING; иначе код ссылки сжигался бы
			 * без реальной отмены.
			 */
			const [cancelled] = await db
				.update(appointments)
				.set({ status: "cancelled" })
				.where(
					and(
						eq(appointments.id, appointment.id),
						eq(appointments.organizationId, payload.organizationId),
					),
				)
				.returning({ id: appointments.id });
			if (!cancelled) {
				return sendPage(
					reply,
					404,
					title,
					"Запись не найдена. Возможно, её уже отменили. Позвоните в клинику.",
					"error",
				);
			}
			await markActionCodeUsed(resolved.code);

			// Напоминания об отменённом приёме снимаются сразу: иначе пациент,
			// только что отказавшийся, получит «ждём вас завтра».
			await invalidateAppointmentReminders(
				payload.organizationId,
				appointment.id,
				"Приём отменён пациентом по ссылке",
			);

			// Отмена не должна проходить молча: администратор обязан узнать об
			// освободившемся слоте и попробовать переставить пациента.
			if (appointment.patientId) {
				const [patient] = await db
					.select({ fullName: patients.fullName })
					.from(patients)
					.where(eq(patients.id, appointment.patientId))
					.limit(1);

				await db.insert(communicationTasks).values({
					organizationId: payload.organizationId,
					patientId: appointment.patientId,
					appointmentId: appointment.id,
					assignedRole: "administrator",
					channel: "phone",
					intent: "appointment_confirmation",
					status: "queued",
					priority: "high",
					dueAt: new Date(),
					title: "Пациент отменил приём по ссылке",
					body:
						`${patient?.fullName ?? "Пациент"} отменил приём ${moment} через ссылку в сообщении. ` +
						"Слот освободился: предложите время другому пациенту из листа ожидания и уточните, нужен ли перенос.",
					workflowCode: "appointment_reschedule_followup",
				});
			}

			wsBroker.broadcastToOrganization(payload.organizationId, {
				type: "APPOINTMENT_UPDATED",
				payload: {
					appointmentId: appointment.id,
					source: "patient_cancellation",
				},
			});

			return sendPage(
				reply,
				200,
				title,
				`Приём ${moment} отменён. Мы получили ваш отказ; при необходимости администратор свяжется с вами для переноса.`,
				"ok",
			);
		});
	};

	/**
	 * Адрес намеренно короткий. Он уходит пациенту в SMS, где кириллица даёт
	 * 70 знаков на сегмент: каждый лишний символ ссылки клиника оплачивает.
	 * Действие определяется кодом, поэтому в пути его нет.
	 */
	app.get("/api/p/:code", async (request, reply) => handle(request, reply));
}
