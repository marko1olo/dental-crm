/**
 * marketingRomiChannelsService.ts — Сервис управления каналами ROMI и персистентности в PostgreSQL 18.
 */

import { eq } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { organizations } from "../../../db/schema.js";
import {
	type AdvertisingChannelInput,
	buildDenteDefaultAdvertisingChannels,
} from "@dental/shared";

export async function readOrSeedOrganizationRomiChannels(orgId: string): Promise<{
	flags: Record<string, unknown>;
	channels: AdvertisingChannelInput[];
}> {
	const [org] = await db
		.select({ flags: organizations.workspaceFeatureFlags })
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1);

	const existingFlags = (org?.flags as Record<string, unknown>) || {};
	const rawChannels = existingFlags.marketingRomiChannels;

	if (Array.isArray(rawChannels) && rawChannels.length > 0) {
		return {
			flags: existingFlags,
			channels: rawChannels as AdvertisingChannelInput[],
		};
	}

	// Первичное авто-сидирование канонических каналов DENTE в PostgreSQL 18
	const seeded = buildDenteDefaultAdvertisingChannels();
	const updatedFlags = {
		...existingFlags,
		marketingRomiChannels: seeded,
	};

	await db
		.update(organizations)
		.set({ workspaceFeatureFlags: updatedFlags })
		.where(eq(organizations.id, orgId));

	return {
		flags: updatedFlags,
		channels: seeded,
	};
}
