/**
 * serviceMetadataResolver.ts — Resolves raw service identifiers into canonical catalog metadata.
 */

import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import { serviceCatalogItems } from "../../../db/schema.js";
import type { DbExecutor } from "../types.js";
import { isPureUuid, type ServiceDescriptor } from "./stockDeductionTypes.js";

export async function resolveServicesMetadata(
	tx: DbExecutor,
	organizationId: string,
	rawTokens: string[],
): Promise<Map<string, ServiceDescriptor>> {
	const result = new Map<string, ServiceDescriptor>();
	const uniqueTokens = Array.from(new Set(rawTokens.filter(Boolean)));
	if (uniqueTokens.length === 0) return result;

	const uuidTokens = uniqueTokens.filter(isPureUuid);
	const textTokens = uniqueTokens.filter((t) => !isPureUuid(t));

	const orConditions: Array<SQL<unknown>> = [];
	if (uuidTokens.length > 0) {
		orConditions.push(inArray(serviceCatalogItems.id, uuidTokens));
	}
	if (textTokens.length > 0) {
		orConditions.push(
			inArray(serviceCatalogItems.code, textTokens),
			inArray(serviceCatalogItems.order804nCode, textTokens),
			inArray(serviceCatalogItems.title, textTokens),
		);
	}

	const catalogRows = orConditions.length > 0
		? await tx
				.select({
					id: serviceCatalogItems.id,
					code: serviceCatalogItems.code,
					order804nCode: serviceCatalogItems.order804nCode,
					title: serviceCatalogItems.title,
				})
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, organizationId),
						or(...orConditions),
					),
				)
		: [];

	for (const token of uniqueTokens) {
		const isUuid = isPureUuid(token);
		const match = catalogRows.find(
			(c) =>
				(isUuid && c.id === token) ||
				c.code === token ||
				c.order804nCode === token ||
				c.title === token,
		);

		if (match) {
			result.set(token, {
				rawToken: token,
				serviceId: match.id,
				serviceCode: match.code,
				order804nCode: match.order804nCode,
				title: match.title,
			});
		} else {
			result.set(token, {
				rawToken: token,
				serviceId: isUuid ? token : null,
				serviceCode: isUuid ? null : token,
				order804nCode: isUuid ? null : token,
				title: null,
			});
		}
	}

	return result;
}
