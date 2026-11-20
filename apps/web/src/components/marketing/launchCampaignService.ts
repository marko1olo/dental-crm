/**
 * launchCampaignService.ts — Canonical Communications Campaign Launch Service.
 * Connects marketing promotions directly to real PostgreSQL 18 campaign routes.
 * Enforces 152-FZ / 38-FZ consent verification and audience deduplication.
 */

import type { MarketingPromo, MessageChannel } from "./marketingTypes";

export interface LaunchCampaignResult {
	readonly ok: boolean;
	readonly queued: number;
	readonly alreadyQueued: number;
	readonly matched: number;
	readonly message: string;
}

export async function launchMarketingCampaign(params: {
	readonly promo: MarketingPromo;
	readonly channel: MessageChannel;
	readonly segmentId: string;
	readonly consentOnly: boolean;
	readonly mutationHeaders: Record<string, string>;
}): Promise<LaunchCampaignResult> {
	const { promo, channel, segmentId, consentOnly, mutationHeaders } = params;
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
		const tplData = (await tplRes.json()) as { templates?: Array<{ id: string; title: string; channel: string }> };
		const existing = (tplData.templates ?? []).find(
			(t) => t.title === promo.title && t.channel === channel,
		);
		if (existing) {
			templateId = existing.id;
		}
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
			headers,
			body: JSON.stringify({
				title: promo.title,
				channel,
				intent: "general",
				body,
				isActive: true,
			}),
		});

		if (createTplRes.ok) {
			const createdData = (await createTplRes.json()) as { template?: { id: string } };
			templateId = createdData.template?.id;
		}
	}

	if (!templateId) {
		throw new Error("Не удалось подготовить шаблон сообщения для выбранного канала");
	}

	// 2. Create communication campaign record
	const createCampaignRes = await fetch("/api/communications/campaigns", {
		method: "POST",
		headers,
		body: JSON.stringify({
			title: `${promo.title} · ${channel.toUpperCase()}`,
			templateId,
			scope: consentOnly ? "marketing" : "service",
			criteria,
		}),
	});

	if (!createCampaignRes.ok) {
		const errData = (await createCampaignRes.json().catch(() => null)) as { message?: string } | null;
		throw new Error(errData?.message || "Не удалось создать кампанию рассылки");
	}

	const campaignData = (await createCampaignRes.json()) as { campaign?: { id: string } };
	const campaignId = campaignData.campaign?.id;
	if (!campaignId) {
		throw new Error("Сервер не вернул идентификатор созданной кампании");
	}

	// 3. Launch campaign via canonical route
	const launchRes = await fetch(`/api/communications/campaigns/${campaignId}/launch`, {
		method: "POST",
		headers,
	});

	if (!launchRes.ok) {
		const errData = (await launchRes.json().catch(() => null)) as { message?: string } | null;
		throw new Error(errData?.message || "Не удалось запустить кампанию рассылки");
	}

	const launchResult = (await launchRes.json()) as {
		queued?: number;
		alreadyQueued?: number;
		matched?: number;
		message?: string;
	};

	return {
		ok: true,
		queued: launchResult.queued ?? 0,
		alreadyQueued: launchResult.alreadyQueued ?? 0,
		matched: launchResult.matched ?? 0,
		message: launchResult.message ?? "",
	};
}
