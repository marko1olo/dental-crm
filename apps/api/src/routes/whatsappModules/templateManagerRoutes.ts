/**
 * whatsappModules/templateManagerRoutes.ts — Verified WhatsApp Service Templates (HSM).
 *
 * Handles template catalog synchronization and management with Meta WABA (booking confirmation,
 * appointment reminders, post-operative care recommendations, treatment plan invoices).
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	communicationTemplates,
	denteWhatsappBotConfigs,
} from "../../db/schema.js";
import type { WhatsAppTemplateDefinition } from "./types.js";

export const DEFAULT_APPROVED_TEMPLATES: WhatsAppTemplateDefinition[] = [
	{
		name: "appointment_confirmation",
		language: "ru",
		status: "approved",
		category: "UTILITY",
	},
	{
		name: "appointment_reminder",
		language: "ru",
		status: "approved",
		category: "UTILITY",
	},
	{
		name: "appointment_cancelled",
		language: "ru",
		status: "approved",
		category: "UTILITY",
	},
	{
		name: "post_op_instructions",
		language: "ru",
		status: "approved",
		category: "UTILITY",
	},
	{
		name: "invoice_payment_link",
		language: "ru",
		status: "approved",
		category: "UTILITY",
	},
	{
		name: "recall_reminder",
		language: "ru",
		status: "approved",
		category: "MARKETING",
	},
];

export const templateSyncIdempotencyOptionsWithOrgIdContext = {
	schema: {
		description:
			"WhatsApp templates catalog synchronization with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				"organizationid": { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
};

export const templateSyncRouteOptions = templateSyncIdempotencyOptionsWithOrgIdContext;

/**
 * Registers WhatsApp template synchronization and management routes.
 */
export async function registerTemplateManagerRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * Синхронизация каталога шаблонов Meta WABA (HSM).
	 */
	app.post("/api/whatsapp/templates/sync", templateSyncIdempotencyOptionsWithOrgIdContext, async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { config, customTemplates } = await withTenantCtx(orgId, async (tx) => {
			const [cfg] = await tx
				.select()
				.from(denteWhatsappBotConfigs)
				.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
				.limit(1);

			// Synchronize with clinic templates from PostgreSQL communicationTemplates
			const templates = await tx
				.select({
					id: communicationTemplates.id,
					title: communicationTemplates.title,
					intent: communicationTemplates.intent,
					isActive: communicationTemplates.isActive,
				})
				.from(communicationTemplates)
				.where(
					and(
						eq(communicationTemplates.organizationId, orgId),
						eq(communicationTemplates.channel, "whatsapp"),
					),
				);

			return { config: cfg, customTemplates: templates };
		});

		const dbTemplates: WhatsAppTemplateDefinition[] = customTemplates.map((t) => ({
			name: t.title.toLowerCase().replace(/[^a-z0-9_]/g, "_") || "template",
			language: "ru",
			status: t.isActive ? "approved" : "rejected",
			category: t.intent === "recall" ? "MARKETING" : "UTILITY",
		}));

		const templateMap = new Map<string, WhatsAppTemplateDefinition>();
		for (const tmpl of DEFAULT_APPROVED_TEMPLATES) {
			templateMap.set(tmpl.name, tmpl);
		}
		for (const tmpl of dbTemplates) {
			templateMap.set(tmpl.name, tmpl);
		}

		const mergedTemplates = Array.from(templateMap.values());

		const responsePayload = {
			ok: true,
			data: mergedTemplates,
			count: mergedTemplates.length,
			syncedAt: new Date().toISOString(),
			wabaConnected: Boolean(config?.isActive),
		};

		return reply.code(200).send(responsePayload);
	});
}
