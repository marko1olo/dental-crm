import type { StaffMemberPresenceItem } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	getOrCreateDirectStaffChannel,
	listClinicIntercomLocations,
	listStaffChannels,
	listStaffMembersForChat,
} from "../../db/staffChatQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { directChannelSchema, sendMappedStaffChatError } from "./schemasAndErrors.js";

export function registerStaffChatChannelRoutes(app: FastifyInstance): void {
	/**
	 * GET /api/staff-chat/channels
	 * Список доступных каналов и личных переписок сотрудника.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/staff-chat/channels",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const organizationId = await requireResolvedOrganizationId(
					request,
					reply,
					"staff-chat channels",
				);
				if (!organizationId) return;

				const identity = getRequestIdentity(request);
				const channels = await listStaffChannels(
					organizationId,
					identity.userId || undefined,
				);
				return { channels };
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при получении списка каналов клиники.",
				});
			}
		},
	});

	/**
	 * POST /api/staff-chat/channels/direct
	 * Создать или открыть существующий личный чат (Direct Message) с сотрудником.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/staff-chat/channels/direct",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const organizationId = await requireResolvedOrganizationId(
					request,
					reply,
					"staff-chat direct channel",
				);
				if (!organizationId) return;

				const identity = getRequestIdentity(request);
				if (!identity.userId) {
					return reply.code(400).send({
						error: "UserRequired",
						message: "Для открытия личного диалога требуется сессия сотрудника.",
					});
				}

				const parsed = directChannelSchema.safeParse(request.body);
				if (!parsed.success) {
					return reply.code(400).send({
						error: "ValidationError",
						message: "Неверный ID сотрудника.",
					});
				}

				const channel = await getOrCreateDirectStaffChannel(
					organizationId,
					identity.userId,
					parsed.data.targetUserId,
				);
				return { channel };
			} catch (error: unknown) {
				return sendMappedStaffChatError(
					request,
					reply,
					error,
					"Ошибка при создании личного чата.",
				);
			}
		},
	});

	/**
	 * GET /api/staff-chat/locations
	 * Список реальных стоматологических кресел и кабинетов клиники для интеркома.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/staff-chat/locations",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const organizationId = await requireResolvedOrganizationId(
					request,
					reply,
					"staff-chat locations",
				);
				if (!organizationId) return;

				const locations = await listClinicIntercomLocations(organizationId);
				return { locations };
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при получении списка кресел/кабинетов.",
				});
			}
		},
	});

	/**
	 * GET /api/staff-chat/members
	 * Список сотрудников клиники с их текущим статусом присутствия (online / in_visit / offline).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/staff-chat/members",
		permission: "public",
		handler: async ({ request, reply }) => {
			try {
				const organizationId = await requireResolvedOrganizationId(
					request,
					reply,
					"staff-chat members",
				);
				if (!organizationId) return;

				const dbUsers = await listStaffMembersForChat(organizationId);
				const livePresence = wsBroker.getPresence(organizationId);
				const presenceByStaffId = new Map(livePresence.map((p) => [p.staffId, p]));

				const members: StaffMemberPresenceItem[] = dbUsers.map((u) => {
					const active = presenceByStaffId.get(u.id);
					let status: StaffMemberPresenceItem["status"] = "offline";
					let currentVisitId: string | null = null;
					const currentPatientName: string | null = null;
					let cabinetNumber: string | null = null;

					if (active) {
						if (active.visitId) {
							status = "in_visit";
							currentVisitId = active.visitId;
						} else {
							status = "online";
						}
						cabinetNumber = active.role || null;
					}

					return {
						staffId: u.id,
						fullName: u.fullName,
						role: u.role,
						specialty: null,
						cabinetNumber,
						status,
						currentVisitId,
						currentPatientName,
						lastSeenAt: active ? new Date(active.lastSeen).toISOString() : "",
					};
				});

				return { members };
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при получении списка сотрудников.",
				});
			}
		},
	});
}
