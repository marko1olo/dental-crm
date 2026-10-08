import {
	chairSchema,
	createChairSchema,
	updateChairWorkingHoursSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
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
} from "./helpers.js";
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
	app.post("/api/settings/chairs", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload(createChairSchema, request.body);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: chairCreateValidationMessage,
			};
		}
		await createChairInDb(orgId, input);
		const settings = await getClinicSettingsFromDb(orgId);
		const created = settings.chairs.find((c) => c.name === input.name);
		reply.code(201);
		return chairSchema.parse(created);
	});

	app.put(
		"/api/settings/chairs/:chairId/working-hours",
		async (request, reply) => {
			const orgId = await requireSettingsAccess(request, reply);
			if (!orgId) return;
			const params = request.params as { chairId?: string };
			if (!params.chairId) {
				reply.code(400);
				return {
					error: "SettingsRouteValidationError",
					message: chairWorkingHoursRouteValidationMessage,
				};
			}
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
				await updateChairWorkingHoursInDb(orgId, params.chairId, input);
				const settings = await getClinicSettingsFromDb(orgId);
				const updated = settings.chairs.find((c) => c.id === params.chairId);
				if (!updated) throw new Error("Кресло не найдено.");
				return chairSchema.parse(updated);
			} catch (error) {
				return chairWorkingHoursRejection(reply, error);
			}
		},
	);

	/**
	 * Правка кресла. Принимаются только название и признак активности: больше
	 * ничего из карточки кресла таблица chairs не хранит, а кабинет,
	 * специализация и оснащение читаются из базы как пустые значения. Принять их
	 * значило бы ответить 200 и молча потерять ввод оператора.
	 */
	app.put("/api/settings/chairs/:chairId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { chairId?: string };
		if (!params.chairId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: chairProfileRouteValidationMessage,
			};
		}
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
			await updateChairProfileInDb(orgId, params.chairId, input);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.chairs.find((c) => c.id === params.chairId);
			if (!updated) throw new Error("Кресло не найдено.");
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
	});

	/**
	 * Отключение кресла. Интерфейс зовет этот адрес из deleteChair
	 * (apps/web/src/useAppLogic.tsx): метод DELETE, тела нет. Физического
	 * удаления не происходит — на chairs.id ссылаются приемы
	 * (appointments.chair_id), поэтому строка сохраняется, а chairs.is_active
	 * становится false. Уже назначенные приемы не теряют привязку к кабинету.
	 */
	app.delete("/api/settings/chairs/:chairId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { chairId?: string };
		if (!params.chairId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: chairDeactivateRouteValidationMessage,
			};
		}
		try {
			await deactivateChairInDb(orgId, params.chairId);
			const settings = await getClinicSettingsFromDb(orgId);
			const updated = settings.chairs.find((c) => c.id === params.chairId);
			if (!updated) throw new Error("Кресло не найдено.");
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
	});
}
