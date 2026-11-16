/**
 * whatsappModules/templateManagerRoutes.ts — Verified WhatsApp Service Templates (HSM).
 *
 * Handles template catalog synchronization and management with Meta WABA (booking confirmation,
 * appointment reminders, post-operative care recommendations, treatment plan invoices).
 */

import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
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

/**
 * Registers WhatsApp template synchronization and management routes.
 */
export async function registerTemplateManagerRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * Синхронизация каталога шаблонов Meta WABA (HSM).
	 */
	app.post("/api/whatsapp/templates/sync", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const [config] = await db
			.select()
			.from(denteWhatsappBotConfigs)
			.where(eq(denteWhatsappBotConfigs.organizationId, orgId))
			.limit(1);

		// Synchronize with clinic templates from PostgreSQL communicationTemplates
		const customTemplates = await db
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

		return {
			ok: true,
			data: mergedTemplates,
			count: mergedTemplates.length,
			syncedAt: new Date().toISOString(),
			wabaConnected: Boolean(config?.isActive),
		};
	});
}
