/**
 * MarketingCampaignDetail.tsx — Dominant Campaign Workspace (Right Column).
 * Governed by Mandate 8b (<= 120 lines), Mandate 8e, 8am, 8ap (Anti-Simulation, No Dead-Ends).
 */

import React, { useRef, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import type { MarketingPromo, MessageChannel } from "./marketingTypes";
import { showToast } from "../GlobalToast";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext.js";
import { denteClinicalMutationHeaders } from "../../lib/denteRequestHeaders.js";
import { useCampaignSegments } from "./useCampaignSegments";
import { launchMarketingCampaign } from "./launchCampaignService";
import { MarketingCampaignHeader } from "./MarketingCampaignHeader";
import { MarketingCampaignConditions } from "./MarketingCampaignConditions";
import { MarketingCampaignAnalytics } from "./MarketingCampaignAnalytics";
import { MarketingCampaignMessageCard } from "./MarketingCampaignMessageCard";
import { MarketingCampaignLaunchSection } from "./MarketingCampaignLaunchSection";

export interface MarketingCampaignDetailProps {
	readonly promo: MarketingPromo;
	readonly clinicName: string;
	readonly onTogglePromoStatus: (promoId: string) => void;
}

const DEFAULT_CHANNEL_RATES: Record<MessageChannel, { rateRub: number; label: string }> = {
	sms: { rateRub: 2.8, label: "SMS · 2.80 ₽ / сообщение" },
	whatsapp: { rateRub: 3.9, label: "WhatsApp Business · 3.90 ₽ / диалог" },
	telegram: { rateRub: 0.0, label: "Telegram Bot · 0.00 ₽" },
};

export const MarketingCampaignDetail: React.FC<MarketingCampaignDetailProps> = ({
	promo,
	clinicName,
	onTogglePromoStatus,
}) => {
	const appLogic = useOptionalAppLogicContext();
	const segments = useCampaignSegments();
	const [channel, setChannel] = useState<MessageChannel>("sms");
	const [segmentId, setSegmentId] = useState<string>(promo.recommendedSegment || "no_visit_6m");
	const [consentOnly, setConsentOnly] = useState(true);
	const [isSending, setIsSending] = useState(false);
	const [testSent, setTestSent] = useState(false);
	const testSendKeyRef = useRef<string | null>(null);
	const launchKeysRef = useRef<{
		createTemplateKey: string;
		createCampaignKey: string;
		launchKey: string;
	} | null>(null);

	const activeSegment = segments.find((s) => s.id === segmentId) ?? segments[0] ?? {
		id: "default",
		name: "Все пациенты",
		count: 0,
		description: "База пациентов клиники",
	};

	const estimatedCostRub = (activeSegment.count * DEFAULT_CHANNEL_RATES[channel].rateRub).toFixed(2);
	const clinicSettingsTyped = appLogic?.dashboard?.clinicSettings as
		| { name?: string | null; website?: string | null; profile?: { legalName?: string | null } }
		| undefined;
	const resolvedClinicName =
		clinicName.trim() ||
		clinicSettingsTyped?.name?.trim() ||
		clinicSettingsTyped?.profile?.legalName?.trim() ||
		"Клиника";
	const clinicBookingUrl =
		clinicSettingsTyped?.website?.trim() ||
		(typeof window !== "undefined" && window.location?.origin ? `${window.location.origin}/#booking` : "");

	const compiledPreview = (
		channel === "whatsapp" ? promo.templates.whatsapp : channel === "telegram" ? promo.templates.telegram : promo.templates.sms
	)
		.replace(/\{Имя\}/g, "Пациент")
		.replace(/\{Клиника\}/g, resolvedClinicName)
		.replace(/\{Скидка\}/g, promo.discountText)
		.replace(/\{Промокод\}/g, promo.promoCode)
		.replace(/\{Срок\}/g, promo.validUntil)
		.replace(/\{Ссылка\}/g, clinicBookingUrl);

	const handleTestSend = async () => {
		setTestSent(true);
		try {
			if (!testSendKeyRef.current) {
				testSendKeyRef.current = generateUuidV7();
			}
			const headers = {
				"Content-Type": "application/json",
				...denteClinicalMutationHeaders({ "Idempotency-Key": testSendKeyRef.current }),
			};
			const res = await fetch("/api/communications/outbox", {
				method: "POST",
				headers,
				body: JSON.stringify({ channel, intent: "general", scope: "marketing", body: `[ТЕСТ] ${compiledPreview}`, dedupeKey: `test_${promo.id}_${testSendKeyRef.current}` }),
			});
			if (!res.ok) {
				throw new Error(`HTTP ${res.status}`);
			}
			testSendKeyRef.current = null;
			showToast(`Тестовое сообщение (${channel.toUpperCase()}) отправлено`, "info");
		} catch (err) {
			setTestSent(false);
			showToast(
				err instanceof Error ? `Не удалось отправить тестовое сообщение: ${err.message}` : "Ошибка тестовой отправки",
				"error",
			);
		} finally {
			setTimeout(() => setTestSent(false), 3000);
		}
	};

	const handleLaunchCampaign = async () => {
		setIsSending(true);
		try {
			if (!launchKeysRef.current) {
				launchKeysRef.current = {
					createTemplateKey: generateUuidV7(),
					createCampaignKey: generateUuidV7(),
					launchKey: generateUuidV7(),
				};
			}
			const mutationHeaders = denteClinicalMutationHeaders();
			const result = await launchMarketingCampaign({
				promo,
				channel,
				segmentId,
				consentOnly,
				mutationHeaders,
				idempotencyKeys: launchKeysRef.current,
			});
			launchKeysRef.current = null;
			if (result.queued > 0) {
				showToast(`Рассылка «${promo.title}» запущена! В очереди: ${result.queued} (${channel.toUpperCase()}).`, "info");
			} else if (result.alreadyQueued > 0) {
				showToast(`Рассылка «${promo.title}»: ${result.alreadyQueued} сообщений уже стоят в очереди.`, "info");
			} else {
				showToast(`Рассылка «${promo.title}»: ${result.matched} совпало, 0 поставлено (нет согласия 152-ФЗ / 38-ФЗ).`, "warning");
			}
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Ошибка запуска рассылки", "error");
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="marketing-workspace-col" data-testid="marketing-campaign-detail">
			<MarketingCampaignHeader promo={promo} onTogglePromoStatus={onTogglePromoStatus} />
			<MarketingCampaignConditions conditions={promo.conditions} />
			<MarketingCampaignAnalytics stats={promo.stats} />
			<MarketingCampaignMessageCard selectedChannel={channel} onSelectChannel={setChannel} compiledText={compiledPreview} channelRateLabel={DEFAULT_CHANNEL_RATES[channel].label} />
			<MarketingCampaignLaunchSection segments={segments} selectedSegmentId={segmentId} onSelectSegment={setSegmentId} consentOnly={consentOnly} onChangeConsentOnly={setConsentOnly} estimatedCostRub={estimatedCostRub} activeSegment={activeSegment} channelRateRub={DEFAULT_CHANNEL_RATES[channel].rateRub} isSending={isSending} testSent={testSent} onLaunch={handleLaunchCampaign} onTestSend={handleTestSend} />
		</div>
	);
};
