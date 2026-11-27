import {
	chairSchema,
	createChairSchema,
	updateChairWorkingHoursSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { recordAuditEventInDb } from "../../db/auditQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	createChairInDb,
	deactivateChairInDb,
	getClinicSettingsFromDb,
	updateChairProfileInDb,
	updateChairWorkingHoursInDb,
} from "../../db/settingsQuery.js";
import {
	chairMutationRejection,
	chairWorkingHoursRejection,
	parseSettingsPayload,
	requireSettingsAccess,
	requireSettingsMutationAccess,
} from "./helpers.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	chairCreateValidationMessage,
	chairDeactivateNotFoundMessage,
	chairDeactivateRejectedMessage,
	chairDeactivateRouteValidationMessage,
	chairProfileEmptyUpdateMessage,
	chairProfileNotFoundMessage,
	chairProfileRejectedMessage,
	chairProfileRouteValidationMessage,
	chairProfileValidationMessage,
	chairWorkingHoursRouteValidationMessage,
	chairWorkingHoursValidationMessage,
	updateChairProfileSchema,
} from "./types.js";

export function registerChairsRoutes(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/chairs",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const settings = await withTenantReadCtx(orgId, async () => getClinicSettingsFromDb(orgId));
			return settings.chairs.map((c) => chairSchema.parse(c));
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/settings/chairs",
		permission: "public",
		handler: async ({ request, reply }) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			};
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const input = parseSettingsPayload(createChairSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: chairCreateValidationMessage,
			};
		}
		const created = await withTenantWriteCtx(orgId, async (tx) => {
			await createChairInDb(orgId, input);
			const settings = await getClinicSettingsFromDb(orgId);
			const chair = settings.chairs.find((c) => c.name === input.name);
			if (chair) {
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "chair",
							entityId: chair.id,
							action: "CHAIR_CREATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит создания кресла",
					);
				}
			}
			return chair;
		});
		reply.code(201);
		return chairSchema.parse(created);
		},
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/chairs/:chairId/working-hours",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireSettingsMutationAccess(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
				};
			}
			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
			}

			const params = request.params as { chairId?: string };
			if (!params.chairId || !isValidUuid(params.chairId)) {
				reply.code(400);
				return {
					error: "SettingsRouteValidationError",
					message: chairWorkingHoursRouteValidationMessage,
				};
			}
			const chairId = params.chairId;
			const input = parseSettingsPayload(
				updateChairWorkingHoursSchema,
				request.body,
			);
			if (!input) {
				reply.code(400);
				return {
					error: "SettingsValidationError",
					message: chairWorkingHoursValidationMessage,
				};
			}
			try {
				const updated = await withTenantWriteCtx(orgId, async (tx) => {
					await updateChairWorkingHoursInDb(orgId, chairId, input);
					const settings = await getClinicSettingsFromDb(orgId);
					const found = settings.chairs.find((c) => c.id === chairId);
					if (!found) throw new Error("Кресло не найдено.");
					try {
						await recordAuditEventInDb(
							orgId,
							{
								entityType: "chair",
								entityId: chairId,
								action: "CHAIR_WORKING_HOURS_UPDATED",
								actorUserId: getRequestIdentity(request).userId,
							},
							tx,
						);
					} catch (auditErr) {
						request.log.warn(
							{ error: auditErr },
							"Не удалось записать аудит графика кресла",
						);
					}
					return found;
				});
				return chairSchema.parse(updated);
			} catch (error) {
				return chairWorkingHoursRejection(reply, error);
			}
		},
	});

	/**
	 * Правка кресла. Принимаются только название и признак активности: больше
	 * ничего из карточки кресла таблица chairs не хранит, а кабинет,
	 * специализация и оснащение читаются из базы как пустые значения. Принять их
	 * значило бы ответить 200 и молча потерять ввод оператора.
	 */
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/chairs/:chairId",
		permission: "public",
		handler: async ({ request, reply }) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			};
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const params = request.params as { chairId?: string };
		if (!params.chairId || !isValidUuid(params.chairId)) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: chairProfileRouteValidationMessage,
			};
		}
		const chairId = params.chairId;
		const input = parseSettingsPayload(updateChairProfileSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: chairProfileValidationMessage,
			};
		}
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: chairProfileEmptyUpdateMessage,
			};
		}
		try {
			const updated = await withTenantWriteCtx(orgId, async (tx) => {
				await updateChairProfileInDb(orgId, chairId, input);
				const settings = await getClinicSettingsFromDb(orgId);
				const found = settings.chairs.find((c) => c.id === chairId);
				if (!found) throw new Error("Кресло не найдено.");
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "chair",
							entityId: chairId,
							action: "CHAIR_PROFILE_UPDATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит профиля кресла",
					);
				}
				return found;
			});
			return chairSchema.parse(updated);
		} catch (error) {
			return chairMutationRejection(
				reply,
				error,
				chairProfileNotFoundMessage,
				chairProfileRejectedMessage,
				"ChairProfile",
			);
		}
		},
	});

	/**
	 * Отключение кресла. Интерфейс зовет этот адрес из deleteChair
	 * (apps/web/src/useAppLogic.tsx): метод DELETE, тела нет. Физического
	 * удаления не происходит — на chairs.id ссылаются приемы
	 * (appointments.chair_id), поэтому строка сохраняется, а chairs.is_active
	 * становится false. Уже назначенные приемы не теряют привязку к кабинету.
	 */
	defineStreamRoute(app, {
		method: "DELETE",
		path: "/api/settings/chairs/:chairId",
		permission: "public",
		handler: async ({ request, reply }) => {
		const orgId = await requireSettingsMutationAccess(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			};
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const params = request.params as { chairId?: string };
		if (!params.chairId || !isValidUuid(params.chairId)) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: chairDeactivateRouteValidationMessage,
			};
		}
		const chairId = params.chairId;
		try {
			const updated = await withTenantWriteCtx(orgId, async (tx) => {
				await deactivateChairInDb(orgId, chairId);
				const settings = await getClinicSettingsFromDb(orgId);
				const found = settings.chairs.find((c) => c.id === chairId);
				if (!found) throw new Error("Кресло не найдено.");
				try {
					await recordAuditEventInDb(
						orgId,
						{
							entityType: "chair",
							entityId: chairId,
							action: "CHAIR_DEACTIVATED",
							actorUserId: getRequestIdentity(request).userId,
						},
						tx,
					);
				} catch (auditErr) {
					request.log.warn(
						{ error: auditErr },
						"Не удалось записать аудит деактивации кресла",
					);
				}
				return found;
			});
			return chairSchema.parse(updated);
		} catch (error) {
			return chairMutationRejection(
				reply,
				error,
				chairDeactivateNotFoundMessage,
				chairDeactivateRejectedMessage,
				"ChairDeactivate",
			);
		}
		},
	});
}
