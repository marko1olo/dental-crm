import { and, asc, eq } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";
import type {
	MessageTemplateCatalog,
	CreateMessageTemplateCatalogInput,
	UpdateMessageTemplateCatalogInput,
} from "@dental/shared";

export async function getMessageTemplateCatalogs(
	organizationId: string,
): Promise<MessageTemplateCatalog[]> {
	const rows = await db
		.select()
		.from(schema.messageTemplateCatalogs)
		.where(eq(schema.messageTemplateCatalogs.organizationId, organizationId))
		.orderBy(asc(schema.messageTemplateCatalogs.title));
	return rows as any;
}

export async function createMessageTemplateCatalog(
	organizationId: string,
	input: CreateMessageTemplateCatalogInput,
): Promise<MessageTemplateCatalog> {
	const [row] = await db
		.insert(schema.messageTemplateCatalogs)
		.values({
			organizationId,
			title: input.title,
			channel: input.channel,
			intent: input.intent,
			templateText: input.templateText,
			variables: input.variables as any,
			isActive: input.isActive ?? true,
		})
		.returning();
	if (!row) throw new Error("Failed to create message template catalog");
	return row as any;
}

export async function updateMessageTemplateCatalog(
	organizationId: string,
	templateId: string,
	input: UpdateMessageTemplateCatalogInput,
): Promise<MessageTemplateCatalog> {
	const [row] = await db
		.update(schema.messageTemplateCatalogs)
		.set({
			title: input.title,
			channel: input.channel,
			intent: input.intent,
			templateText: input.templateText,
			variables: input.variables as any,
			isActive: input.isActive,
		})
		.where(
			and(
				eq(schema.messageTemplateCatalogs.id, templateId),
				eq(schema.messageTemplateCatalogs.organizationId, organizationId),
			),
		)
		.returning();
	if (!row)
		throw new Error("Message template catalog not found or update failed");
	return row as any;
}

export async function deleteMessageTemplateCatalog(
	organizationId: string,
	templateId: string,
): Promise<void> {
	const [row] = await db
		.delete(schema.messageTemplateCatalogs)
		.where(
			and(
				eq(schema.messageTemplateCatalogs.id, templateId),
				eq(schema.messageTemplateCatalogs.organizationId, organizationId),
			),
		)
		.returning();
	if (!row)
		throw new Error("Message template catalog not found or delete failed");
}
