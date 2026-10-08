import type { FastifyInstance } from "fastify";
import {
	createProtocolTemplateInDb,
	deleteProtocolTemplateInDb,
	updateProtocolTemplateInDb,
} from "../../db/protocolTemplateQuery.js";
import {
	parseSettingsPayload,
	protocolTemplateMutationRejection,
	requireSettingsAccess,
} from "./helpers.js";
import {
	createProtocolTemplateSchema,
	type CreateProtocolTemplateInput,
	protocolTemplateCreateNotFoundMessage,
	protocolTemplateCreateValidationMessage,
	protocolTemplateDeleteNotFoundMessage,
	protocolTemplateDeleteRejectedMessage,
	protocolTemplateEmptyUpdateMessage,
	protocolTemplateRouteValidationMessage,
	protocolTemplateUpdateNotFoundMessage,
	protocolTemplateUpdateValidationMessage,
	updateProtocolTemplateSchema,
	type UpdateProtocolTemplateInput,
} from "./types.js";

export function registerProtocolTemplatesRoutes(app: FastifyInstance): void {
	/* ─── ШАБЛОНЫ ПРОТОКОЛОВ ПРИЁМА ───────────────────────────────────────────
	 *
	 * Интерфейс зовёт эти адреса из вкладки «Настройки → Протоколы»
	 * (components/settings/SettingsProtocolsTab.tsx:104, 105, 141). Маршрутов не
	 * было ни одного: Fastify отвечал
	 * «Route POST:/api/settings/protocols not found» — и это написано прямо в
	 * комментарии той вкладки, то есть дефект знали и обходили текстом отказа.
	 * Администратор клиники заполнял форму на десять полей, жал «Сохранить» и
	 * читал «Шаблон не сохранён».
	 *
	 * Шаблон протокола подставляет врачу на приёме причину визита, длительность,
	 * заготовку жалоб, объективного статуса и плана лечения, список обязательных
	 * документов и нужных снимков. Без записи клиника не могла ни завести свой
	 * протокол, ни исправить пришедший с посевом.
	 */
	app.post("/api/settings/protocols", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const input = parseSettingsPayload<CreateProtocolTemplateInput>(
			createProtocolTemplateSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: protocolTemplateCreateValidationMessage,
			};
		}
		try {
			const created = await createProtocolTemplateInDb(orgId, input);
			reply.code(201);
			return created;
		} catch (error) {
			return protocolTemplateMutationRejection(
				reply,
				error,
				protocolTemplateCreateNotFoundMessage,
				protocolTemplateCreateValidationMessage,
				"ProtocolTemplateCreate",
			);
		}
	});

	app.put("/api/settings/protocols/:templateId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { templateId?: string };
		if (!params.templateId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: protocolTemplateRouteValidationMessage,
			};
		}
		const input = parseSettingsPayload<UpdateProtocolTemplateInput>(
			updateProtocolTemplateSchema,
			request.body,
		);
		if (!input) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: protocolTemplateUpdateValidationMessage,
			};
		}
		// Тело из одних неизвестных полей после разбора неотличимо от пустого. Ответ
		// 200 на запрос, который ничего не меняет, означал бы, что администратор
		// считает шаблон исправленным, а на приёме подставится прежний.
		if (Object.keys(input).length === 0) {
			reply.code(400);
			return {
				error: "SettingsValidationError",
				message: protocolTemplateEmptyUpdateMessage,
			};
		}
		try {
			const updated = await updateProtocolTemplateInDb(
				orgId,
				params.templateId,
				input,
			);
			return updated;
		} catch (error) {
			return protocolTemplateMutationRejection(
				reply,
				error,
				protocolTemplateUpdateNotFoundMessage,
				protocolTemplateUpdateValidationMessage,
				"ProtocolTemplateUpdate",
			);
		}
	});

	/**
	 * Удаление шаблона. Настоящее, а не отключение: на protocol_templates.id не
	 * ссылается ни одна таблица и признака активности у шаблона нет, поэтому рвать
	 * нечего — в отличие от услуги прайса, за которой стоят позиции лечения и
	 * счёта. Экран обещает оператору именно удаление.
	 */
	app.delete("/api/settings/protocols/:templateId", async (request, reply) => {
		const orgId = await requireSettingsAccess(request, reply);
		if (!orgId) return;
		const params = request.params as { templateId?: string };
		if (!params.templateId) {
			reply.code(400);
			return {
				error: "SettingsRouteValidationError",
				message: protocolTemplateRouteValidationMessage,
			};
		}
		try {
			const deleted = await deleteProtocolTemplateInDb(
				orgId,
				params.templateId,
			);
			return deleted;
		} catch (error) {
			return protocolTemplateMutationRejection(
				reply,
				error,
				protocolTemplateDeleteNotFoundMessage,
				protocolTemplateDeleteRejectedMessage,
				"ProtocolTemplateDelete",
			);
		}
	});
}
