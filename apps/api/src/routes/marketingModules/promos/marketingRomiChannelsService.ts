/**
 * marketingRomiChannelsService.ts — Сервис управления каналами ROMI и персистентности в PostgreSQL 18.
 */

import { eq } from "drizzle-orm";
import { withTenantCtx, type TenantDb } from "../../../db/rls.js";
import { organizations } from "../../../db/schema.js";
import {
	type AdvertisingChannelInput,
	advertisingChannelInputSchema,
	buildDenteDefaultAdvertisingChannels,
} from "@dental/shared";

export async function readOrSeedOrganizationRomiChannels(
	orgId: string,
	executor?: TenantDb,
): Promise<{
	flags: Record<string, unknown>;
	channels: AdvertisingChannelInput[];
}> {
	const run = async (tx: TenantDb) => {
		const [org] = await tx
			.select({ flags: organizations.workspaceFeatureFlags })
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const existingFlags = (org?.flags as Record<string, unknown>) || {};
		const rawChannels = existingFlags.marketingRomiChannels;

		if (Array.isArray(rawChannels) && rawChannels.length > 0) {
			const validatedChannels: AdvertisingChannelInput[] = [];
			for (const item of rawChannels) {
				const parsed = advertisingChannelInputSchema.safeParse(item);
				if (parsed.success) {
					validatedChannels.push(parsed.data);
				}
			}
			if (validatedChannels.length > 0) {
				return {
					flags: existingFlags,
					channels: validatedChannels,
				};
			}
		}

		// Read-only GET fallback без мутации organizations при чтении
		return {
			flags: existingFlags,
			channels: buildDenteDefaultAdvertisingChannels(),
		};
	};

	if (executor) {
		return run(executor);
	}
	return withTenantCtx(orgId, run);
}
