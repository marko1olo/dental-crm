import { withTenantCtx } from "../../db/rls.js";
import { labItems } from "../../db/schema.js";
import type { z } from "zod";
import type { createLabItemSchema } from "./types.js";

type CreateLabItemInput = z.infer<typeof createLabItemSchema>;

export async function insertLabItem(
	orgId: string,
	labOrderId: string,
	body: CreateLabItemInput,
) {
	return withTenantCtx(orgId, async (tx) => {
		const [createdItem] = await tx
			.insert(labItems)
			.values({
				organizationId: orgId,
				labOrderId,
				toothFdi: body.toothFdi,
				restorationType: body.restorationType,
				material: body.material,
				shadeSystem: body.shadeSystem,
				shadeFinal: body.shadeFinal,
				shadeStump: body.shadeStump ?? null,
				shadeGingiva: body.shadeGingiva ?? null,
				translucencyLevel: body.translucencyLevel,
				cementGapMicrons: body.cementGapMicrons,
				extraMarginGapMicrons: body.extraMarginGapMicrons,
				minimalThicknessMm: body.minimalThicknessMm,
				implantSystem: body.implantSystem ?? null,
				implantPlatformDiameterMm: body.implantPlatformDiameterMm ?? null,
				tiBaseHeightMm: body.tiBaseHeightMm ?? null,
				priceRub: body.priceRub ? String(body.priceRub) : null,
			})
			.returning();

		return createdItem;
	});
}
