/**
 * launchCampaignService.ts — Canonical Communications Campaign Launch Service.
 * Connects marketing promotions directly to real PostgreSQL 18 campaign routes.
 * Enforces 152-FZ / 38-FZ consent verification and audience deduplication.
 */

import { generateUuidV7 } from "@dental/shared";
import {
	isPlainRecord,
	parseJsonEnvelope,
	readApiErrorMessage,
} from "../../lib/apiResponseHandler";
import { clientLogger } from "../../services/logging/clientLogger";
import type { MarketingPromo, MessageChannel } from "./marketingTypes";

export interface LaunchCampaignResult {
	readonly ok: boolean;
	readonly queued: number;
	readonly alreadyQueued: number;
	readonly matched: number;
	readonly message: string;
}

export interface LaunchCampaignIdempotencyKeys {
	readonly createTemplateKey?: string | undefined;
	readonly createCampaignKey?: string | undefined;
	readonly launchKey?: string | undefined;
}

interface TemplateListPayload {
	readonly templates?: Array<{ id: string; title: string; channel: string }> | undefined;
}

function isTemplateListPayload(value: unknown): value is TemplateListPayload {
	if (!isPlainRecord(value)) return false;
	if (value.templates === undefined) return true;
	return (
		Array.isArray(value.templates) &&
		value.templates.every(
			(t) =>
				isPlainRecord(t) &&
				typeof t.id === "string" &&
				typeof t.title === "string" &&
				typeof t.channel === "string",
		)
	);
}

interface CreatedTemplatePayload {
	readonly template?: { id: string } | undefined;
}

function isCreatedTemplatePayload(value: unknown): value is CreatedTemplatePayload {
	if (!isPlainRecord(value)) return false;
	if (value.template === undefined) return true;
	return isPlainRecord(value.template) && typeof value.template.id === "string";
}

interface CreatedCampaignPayload {
	readonly campaign?: { id: string } | undefined;
}

function isCreatedCampaignPayload(value: unknown): value is CreatedCampaignPayload {
	if (!isPlainRecord(value)) return false;
	if (value.campaign === undefined) return true;
	return isPlainRecord(value.campaign) && typeof value.campaign.id === "string";
}

interface LaunchResponsePayload {
	readonly queued?: number | undefined;
	readonly alreadyQueued?: number | undefined;
	readonly matched?: number | undefined;
	readonly message?: string | undefined;
}

function isLaunchResponsePayload(value: unknown): value is LaunchResponsePayload {
	if (!isPlainRecord(value)) return false;
	const numOrUndef = (v: unknown) => v === undefined || typeof v === "number";
	return (
		numOrUndef(value.queued) &&
		numOrUndef(value.alreadyQueued) &&
		numOrUndef(value.matched) &&
		(value.message === undefined || typeof value.message === "string")
	);
}

export async function launchMarketingCampaign(params: {
	readonly promo: MarketingPromo;
	readonly channel: MessageChannel;
	readonly segmentId: string;
	readonly consentOnly: boolean;
	readonly mutationHeaders: Record<string, string>;
	readonly idempotencyKeys?: LaunchCampaignIdempotencyKeys | undefined;
}): Promise<LaunchCampaignResult> {
	const { promo, channel, segmentId, consentOnly, mutationHeaders, idempotencyKeys } = params;
	const headers: Record<string, string> = { "Content-Type": "application/json", ...mutationHeaders };

	let criteria: Record<string, unknown> = { status: "active" };
	if (segmentId === "no_visit_6m" || segmentId === "missed_hygiene") {
		const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
		criteria = { status: "active", lastVisitBefore: sixMonthsAgo };
	}

	// 1. Resolve or create communication template for this channel
	const tplRes = await fetch("/api/communications/templates", { headers });
	let templateId: string | undefined;
	if (tplRes.ok) {
		const tplData = await parseJsonEnvelope(
			tplRes,
			isTemplateListPayload,
			"Не удалось разобрать шаблоны рассылки",
		);
		const existing = (tplData.templates ?? []).find(
			(t) => t.title === promo.title && t.channel === channel,
		);
		if (existing) {
			templateId = existing.id;
		}
	} else {
		clientLogger.warn(
			"[launchMarketingCampaign] Не удалось получить список шаблонов, создаём новый",
			{ status: tplRes.status },
			{ module: "Marketing" },
		);
	}

	if (!templateId) {
		const body =
			channel === "whatsapp"
				? promo.templates.whatsapp
				: channel === "telegram"
					? promo.templates.telegram
					: promo.templates.sms;

		const createTplRes = await fetch("/api/communications/templates", {
			method: "POST",
			headers: {
				...headers,
				"Idempotency-Key": idempotencyKeys?.createTemplateKey ?? generateUuidV7(),
			},
			body: JSON.stringify({
				title: promo.title,
				channel,
				intent: "general",
				body,
				isActive: true,
			}),
		});

		if (!createTplRes.ok) {
			throw new Error(
				await readApiErrorMessage(
					createTplRes,
					"Не удалось подготовить шаблон сообщения для выбранного канала",
				),
			);
		}
		const createdData = await parseJsonEnvelope(
			createTplRes,
			isCreatedTemplatePayload,
			"Не удалось подготовить шаблон сообщения",
		);
		templateId = createdData.template?.id;
	}

	if (!templateId) {
		throw new Error("Не удалось подготовить шаблон сообщения для выбранного канала");
	}

	// 2. Create communication campaign record
	const createCampaignRes = await fetch("/api/communications/campaigns", {
		method: "POST",
		headers: {
			...headers,
			"Idempotency-Key": idempotencyKeys?.createCampaignKey ?? generateUuidV7(),
		},
		body: JSON.stringify({
			title: `${promo.title} · ${channel.toUpperCase()}`,
			templateId,
			scope: "marketing",
			criteria: {
				...criteria,
				consentOnly,
			},
		}),
	});

	if (!createCampaignRes.ok) {
		throw new Error(
			await readApiErrorMessage(
				createCampaignRes,
				"Не удалось создать кампанию рассылки",
			),
		);
	}

	const campaignData = await parseJsonEnvelope(
		createCampaignRes,
		isCreatedCampaignPayload,
		"Не удалось создать кампанию рассылки",
	);
	const campaignId = campaignData.campaign?.id;
	if (!campaignId) {
		throw new Error("Сервер не вернул идентификатор созданной кампании");
	}

	// 3. Launch campaign via canonical route
	const launchRes = await fetch(`/api/communications/campaigns/${campaignId}/launch`, {
		method: "POST",
		headers: {
			...headers,
			"Idempotency-Key": idempotencyKeys?.launchKey ?? generateUuidV7(),
		},
	});

	if (!launchRes.ok) {
		throw new Error(
			await readApiErrorMessage(launchRes, "Не удалось запустить кампанию рассылки"),
		);
	}

	const launchResult = await parseJsonEnvelope(
		launchRes,
		isLaunchResponsePayload,
		"Не удалось разобрать результат запуска кампании",
	);

	return {
		ok: true,
		queued: launchResult.queued ?? 0,
		alreadyQueued: launchResult.alreadyQueued ?? 0,
		matched: launchResult.matched ?? 0,
		message: launchResult.message ?? "",
	};
}
