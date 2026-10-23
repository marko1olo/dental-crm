/**
 * stockFefoBatchSelector.ts — Layer 1/2: Multi-tier service metadata & Bill-of-Materials (BOM) resolution facade.
 * Decomposed in accordance with Mandate 8b (<= 120 lines).
 */

import type { DbExecutor } from "../types.js";
import { isPureUuid, type RawRequiredMaterial, type ServiceDescriptor } from "./stockDeductionTypes.js";
import { resolveServicesMetadata } from "./serviceMetadataResolver.js";
import { resolveDbBomRulesForService } from "./procedureBomDbResolver.js";
import { resolveStatutoryBomForService } from "./statutoryBomResolver.js";

export { resolveServicesMetadata };

export async function resolveRequiredMaterialsForServices(
	tx: DbExecutor,
	organizationId: string,
	services: Array<{ serviceToken: string; quantity: number }>,
	serviceMetadataMap: Map<string, ServiceDescriptor>,
): Promise<RawRequiredMaterial[]> {
	const materials: RawRequiredMaterial[] = [];

	for (const srv of services) {
		const srvQty = srv.quantity > 0 ? srv.quantity : 1;
		const meta = serviceMetadataMap.get(srv.serviceToken) ?? {
			rawToken: srv.serviceToken,
			serviceId: isPureUuid(srv.serviceToken) ? srv.serviceToken : null,
			serviceCode: isPureUuid(srv.serviceToken) ? null : srv.serviceToken,
			order804nCode: isPureUuid(srv.serviceToken) ? null : srv.serviceToken,
			title: null,
		};

		const dbMaterials = await resolveDbBomRulesForService(tx, organizationId, meta, srvQty);
		if (dbMaterials && dbMaterials.length > 0) {
			materials.push(...dbMaterials);
			continue;
		}

		const statutoryMaterials = resolveStatutoryBomForService(meta, srvQty);
		if (statutoryMaterials.length > 0) {
			materials.push(...statutoryMaterials);
		}
	}

	return materials;
}
