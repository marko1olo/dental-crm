/**
 * conversionValidator.ts — Schema validation & structured attribution for lead conversion.
 * Mandate 8b (Strict <= 120 lines). Mandate 8ap (Relational truth over regex-mining).
 */

import { z } from "zod";

export const convertLeadSchema = z.object({
	appointmentStart: z.string().datetime().or(z.literal("")).optional().nullable(),
	appointmentEnd: z.string().datetime().or(z.literal("")).optional().nullable(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	organizationId: z.string().uuid().optional(),
	reason: z.string().optional().nullable(),
	comment: z.string().optional().nullable(),
});

export type ConvertLeadPayload = z.infer<typeof convertLeadSchema>;

export interface StructuredLeadAttribution {
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmContent?: string;
	utmTerm?: string;
	formattedUtm?: string;
	leadSource?: string;
}

/**
 * Normalizes structured attribution from lead metadata or structured source.
 * Strict Mandate 8ap: Relational structured metadata is authoritative over text regexes.
 */
export function resolveStructuredLeadAttribution(input?: {
	source?: string | null;
	metadata?: Record<string, unknown> | null;
	utmSource?: string | null;
	utmMedium?: string | null;
	utmCampaign?: string | null;
	utmContent?: string | null;
	utmTerm?: string | null;
}): StructuredLeadAttribution {
	const utmSource = input?.utmSource || (input?.metadata?.utm_source as string | undefined);
	const utmMedium = input?.utmMedium || (input?.metadata?.utm_medium as string | undefined);
	const utmCampaign = input?.utmCampaign || (input?.metadata?.utm_campaign as string | undefined);
	const utmContent = input?.utmContent || (input?.metadata?.utm_content as string | undefined);
	const utmTerm = input?.utmTerm || (input?.metadata?.utm_term as string | undefined);

	const parts: string[] = [];
	if (utmSource) parts.push(`source=${utmSource}`);
	if (utmMedium) parts.push(`medium=${utmMedium}`);
	if (utmCampaign) parts.push(`campaign=${utmCampaign}`);
	if (utmContent) parts.push(`content=${utmContent}`);
	if (utmTerm) parts.push(`term=${utmTerm}`);

	const res: StructuredLeadAttribution = {};
	if (utmSource) res.utmSource = utmSource;
	if (utmMedium) res.utmMedium = utmMedium;
	if (utmCampaign) res.utmCampaign = utmCampaign;
	if (utmContent) res.utmContent = utmContent;
	if (utmTerm) res.utmTerm = utmTerm;
	if (parts.length > 0) res.formattedUtm = `UTM: ${parts.join(" | ")}`;
	if (input?.source) res.leadSource = input.source;
	return res;
}

/**
 * Structured lead UTM attribution extractor.
 * Supports structured key-value maps and fallback text parser for legacy records.
 */
export function extractUtmAttribution(
	source?: string | null,
	notes?: string | null,
	structured?: Partial<StructuredLeadAttribution> | null,
): StructuredLeadAttribution {
	if (structured && Object.keys(structured).length > 0) {
		return resolveStructuredLeadAttribution({ source, ...structured });
	}
	const text = `${source ?? ""} ${notes ?? ""}`.trim();
	if (!text) return {};

	const getParam = (param: string): string | undefined => {
		const match = text.match(new RegExp(`(?:\\b|\\?|&)${param}\\s*[:=]\\s*([^&\\s,;\\n\\]\\)]+)`, "i"));
		if (!match?.[1]) return undefined;
		return decodeURIComponent(match[1].trim()).replace(/[\]),;]+$/, "").trim() || undefined;
	};

	const utmSource = getParam("utm_source");
	const utmMedium = getParam("utm_medium");
	const utmCampaign = getParam("utm_campaign");
	const utmContent = getParam("utm_content");
	const utmTerm = getParam("utm_term");

	const parts: string[] = [];
	if (utmSource) parts.push(`source=${utmSource}`);
	if (utmMedium) parts.push(`medium=${utmMedium}`);
	if (utmCampaign) parts.push(`campaign=${utmCampaign}`);
	if (utmContent) parts.push(`content=${utmContent}`);
	if (utmTerm) parts.push(`term=${utmTerm}`);

	const res: StructuredLeadAttribution = {};
	if (utmSource !== undefined) res.utmSource = utmSource;
	if (utmMedium !== undefined) res.utmMedium = utmMedium;
	if (utmCampaign !== undefined) res.utmCampaign = utmCampaign;
	if (utmContent !== undefined) res.utmContent = utmContent;
	if (utmTerm !== undefined) res.utmTerm = utmTerm;
	if (parts.length > 0) res.formattedUtm = `UTM: ${parts.join(" | ")}`;
	return res;
}
